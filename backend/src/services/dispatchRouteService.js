import {
    pool,
  } from "../config/databasePool.js";
  
  import {
    getSocketServer,
  } from "../config/socket.js";
  
  import {
    HttpError,
  } from "../utils/httpError.js";
  
  import {
    findDispatchRouteMetadata,
    findRoutePointByEventId,
    insertDispatchRoutePoint,
    listDispatchRoutePoints,
    lockDispatchRouteContext,
    updateAmbulanceFromRoutePoint,
    updateDispatchRouteProgress,
  } from "../repositories/dispatchRouteRepository.js";
  
  function mapRoutePoint(
    row,
    metadata = null,
  ) {
    if (!row) {
      return null;
    }
  
    return {
      id:
        row.id,
  
      eventId:
        row.event_id,
  
      dispatchId:
        row.dispatch_id,
  
      dispatchNumber:
        metadata?.dispatch_number ??
        null,
  
      ambulanceId:
        row.ambulance_id,
  
      ambulanceCode:
        metadata?.ambulance_code ??
        null,
  
      sequenceNumber:
        Number(
          row.sequence_number,
        ),
  
      location: {
        longitude:
          Number(
            row.longitude,
          ),
  
        latitude:
          Number(
            row.latitude,
          ),
      },
  
      speedKmh:
        row.speed_kmh === null
          ? null
          : Number(
              row.speed_kmh,
            ),
  
      headingDegrees:
        row.heading_degrees === null
          ? null
          : Number(
              row.heading_degrees,
            ),
  
      recordedAt:
        row.recorded_at,
  
      receivedAt:
        row.received_at,
  
      isRecovered:
        row.is_recovered,
  
      source:
        row.source,
  
      payload:
        row.payload,
    };
  }
  
  function publishRoutePoint(
    routePoint,
  ) {
    try {
      const io =
        getSocketServer();
  
      io
        .to(
          "role:health_manager",
        )
        .emit(
          "dispatch:route-point",
          routePoint,
        );
    } catch (error) {
      console.error(
        "Failed to publish dispatch:route-point:",
        error.message,
      );
    }
  }
  
  function ensureDuplicateMatches(
    existingPoint,
    {
      dispatchId,
      ambulanceId,
      sequenceNumber,
    },
  ) {
    const matches =
      String(
        existingPoint.dispatch_id,
      ) ===
        String(dispatchId) &&
      String(
        existingPoint.ambulance_id,
      ) ===
        String(ambulanceId) &&
      Number(
        existingPoint.sequence_number,
      ) ===
        Number(sequenceNumber);
  
    if (!matches) {
      throw new HttpError(
        409,
        "ROUTE_EVENT_ID_CONFLICT",
        "The route point event ID was already used for another route reading.",
      );
    }
  }
  
  export async function recordDispatchRoutePoint(
    routePointData,
  ) {
    const client =
      await pool.connect();
  
    let storedPoint;
    let metadata;
    let ambulance;
  
    try {
      await client.query(
        "BEGIN",
      );
  
      let existingPoint =
        await findRoutePointByEventId(
          client,
          routePointData.eventId,
        );
  
      if (existingPoint) {
        ensureDuplicateMatches(
          existingPoint,
          routePointData,
        );
  
        metadata =
          await findDispatchRouteMetadata(
            client,
            routePointData.dispatchId,
          );
  
        await client.query(
          "COMMIT",
        );
  
        return {
          duplicate: true,
  
          routePoint:
            mapRoutePoint(
              existingPoint,
              metadata,
            ),
        };
      }
  
      const routeContext =
        await lockDispatchRouteContext(
          client,
          routePointData.dispatchId,
        );
  
      if (!routeContext) {
        throw new HttpError(
          404,
          "DISPATCH_NOT_FOUND",
          "The requested ambulance dispatch was not found.",
        );
      }
  
      /*
       * Check again after acquiring the row lock.
       *
       * Another transaction may have inserted the event while
       * this request was waiting for the lock.
       */
      existingPoint =
        await findRoutePointByEventId(
          client,
          routePointData.eventId,
        );
  
      if (existingPoint) {
        ensureDuplicateMatches(
          existingPoint,
          routePointData,
        );
  
        await client.query(
          "COMMIT",
        );
  
        return {
          duplicate: true,
  
          routePoint:
            mapRoutePoint(
              existingPoint,
              routeContext,
            ),
        };
      }
  
      if (
        routeContext
          .dispatch_status !==
        "EN_ROUTE"
      ) {
        throw new HttpError(
          409,
          "DISPATCH_NOT_EN_ROUTE",
          `Route points can only be recorded while the dispatch status is EN_ROUTE. Current status: ${routeContext.dispatch_status}.`,
        );
      }
  
      if (
        String(
          routeContext.ambulance_id,
        ) !==
        String(
          routePointData.ambulanceId,
        )
      ) {
        throw new HttpError(
          409,
          "DISPATCH_AMBULANCE_MISMATCH",
          "The supplied ambulance is not assigned to this dispatch.",
        );
      }
  
      if (
        routeContext
          .ambulance_status !==
        "BUSY"
      ) {
        throw new HttpError(
          409,
          "AMBULANCE_NOT_BUSY",
          "The assigned ambulance must remain BUSY while the dispatch is en route.",
        );
      }
  
      if (
        !routeContext
          .is_operational
      ) {
        throw new HttpError(
          409,
          "AMBULANCE_NOT_OPERATIONAL",
          "The assigned ambulance is no longer operational.",
        );
      }
  
      const currentSequence =
        Number(
          routeContext
            .last_route_sequence_number,
        );
  
      const expectedSequence =
        currentSequence + 1;
  
      if (
        routePointData.sequenceNumber <
        expectedSequence
      ) {
        throw new HttpError(
          409,
          "ROUTE_SEQUENCE_STALE",
          "The route point sequence number is older than the current dispatch route sequence.",
          {
            currentSequence,
  
            expectedSequence,
  
            receivedSequence:
              routePointData
                .sequenceNumber,
          },
        );
      }
  
      if (
        routePointData.sequenceNumber >
        expectedSequence
      ) {
        throw new HttpError(
          409,
          "ROUTE_SEQUENCE_GAP",
          "One or more route readings are missing before this route point.",
          {
            currentSequence,
  
            expectedSequence,
  
            receivedSequence:
              routePointData
                .sequenceNumber,
          },
        );
      }
  
      if (
        routeContext
          .last_route_point_at &&
        new Date(
          routePointData.recordedAt,
        ).getTime() <
          new Date(
            routeContext
              .last_route_point_at,
          ).getTime()
      ) {
        throw new HttpError(
          409,
          "ROUTE_TIMESTAMP_OUT_OF_ORDER",
          "The route point timestamp is older than the latest stored route point.",
        );
      }
  
      storedPoint =
        await insertDispatchRoutePoint(
          client,
          routePointData,
        );
  
      const updatedDispatch =
        await updateDispatchRouteProgress(
          client,
          {
            dispatchId:
              routePointData
                .dispatchId,
  
            sequenceNumber:
              routePointData
                .sequenceNumber,
  
            recordedAt:
              routePointData
                .recordedAt,
          },
        );
  
      if (!updatedDispatch) {
        throw new HttpError(
          409,
          "ROUTE_PROGRESS_UPDATE_FAILED",
          "The dispatch route progress could not be updated.",
        );
      }
  
      ambulance =
        await updateAmbulanceFromRoutePoint(
          client,
          {
            ambulanceId:
              routePointData
                .ambulanceId,
  
            longitude:
              routePointData
                .longitude,
  
            latitude:
              routePointData
                .latitude,
  
            recordedAt:
              routePointData
                .recordedAt,
          },
        );
  
      if (!ambulance) {
        throw new HttpError(
          409,
          "AMBULANCE_LOCATION_UPDATE_FAILED",
          "The ambulance location could not be updated because the reading is older than its current location.",
        );
      }
  
      metadata = {
        ...routeContext,
  
        dispatch_number:
          routeContext
            .dispatch_number,
  
        ambulance_code:
          routeContext
            .ambulance_code,
      };
  
      await client.query(
        "COMMIT",
      );
    } catch (error) {
      await client.query(
        "ROLLBACK",
      );
  
      if (
        error?.code === "23505"
      ) {
        throw new HttpError(
          409,
          "ROUTE_POINT_CONFLICT",
          "The route event or sequence number was already stored.",
        );
      }
  
      throw error;
    } finally {
      client.release();
    }
  
    const mappedPoint =
      mapRoutePoint(
        storedPoint,
        metadata,
      );
  
    publishRoutePoint(
      mappedPoint,
    );
  
    return {
      duplicate: false,
  
      routePoint:
        mappedPoint,
  
      ambulance: {
        id:
          ambulance.id,
  
        code:
          ambulance.code,
  
        status:
          ambulance.status,
  
        isOperational:
          ambulance
            .is_operational,
  
        location: {
          longitude:
            Number(
              ambulance.longitude,
            ),
  
          latitude:
            Number(
              ambulance.latitude,
            ),
        },
  
        lastLocationAt:
          ambulance
            .last_location_at,
  
        lastSequenceNumber:
          Number(
            ambulance
              .last_sequence_number,
          ),
  
        updatedAt:
          ambulance.updated_at,
      },
    };
  }
  
  export async function getDispatchRoute(
    {
      dispatchId,
      afterSequence,
      limit,
    },
  ) {
    const client =
      await pool.connect();
  
    try {
      const metadata =
        await findDispatchRouteMetadata(
          client,
          dispatchId,
        );
  
      if (!metadata) {
        throw new HttpError(
          404,
          "DISPATCH_NOT_FOUND",
          "The requested ambulance dispatch was not found.",
        );
      }
  
      /*
       * Request one extra point so we can determine whether
       * another page exists.
       */
      const rows =
        await listDispatchRoutePoints(
          client,
          {
            dispatchId,
  
            afterSequence,
  
            limit:
              limit + 1,
          },
        );
  
      const hasMore =
        rows.length > limit;
  
      const visibleRows =
        hasMore
          ? rows.slice(
              0,
              limit,
            )
          : rows;
  
      const points =
        visibleRows.map(
          (row) =>
            mapRoutePoint(
              row,
              metadata,
            ),
        );
  
      return {
        dispatch: {
          id:
            metadata.dispatch_id,
  
          dispatchNumber:
            metadata.dispatch_number,
  
          status:
            metadata.status,
  
          lastRouteSequenceNumber:
            Number(
              metadata
                .last_route_sequence_number,
            ),
  
          lastRoutePointAt:
            metadata
              .last_route_point_at,
  
          ambulance: {
            id:
              metadata
                .ambulance_id,
  
            code:
              metadata
                .ambulance_code,
          },
  
          emergencyCase: {
            id:
              metadata
                .emergency_id,
  
            caseNumber:
              metadata
                .case_number,
  
            location: {
              longitude:
                Number(
                  metadata
                    .emergency_longitude,
                ),
  
              latitude:
                Number(
                  metadata
                    .emergency_latitude,
                ),
            },
          },
        },
  
        afterSequence,
  
        count:
          points.length,
  
        hasMore,
  
        nextAfterSequence:
          points.length > 0
            ? points[
                points.length - 1
              ].sequenceNumber
            : afterSequence,
  
        points,
      };
    } finally {
      client.release();
    }
  }