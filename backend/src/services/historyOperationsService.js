import {
    HttpError,
  } from "../utils/httpError.js";
  
  import {
    resolveHistoryRange,
  } from "../utils/historyRange.js";
  
  import {
    selectAmbulanceLocationHistory,
    selectDispatchHistory,
    selectDispatchHistoryMetadata,
    selectDispatchRouteHistoryPoints,
    selectDispatchStatusHistory,
    selectEmergencyHistory,
  } from "../repositories/historyOperationsRepository.js";
  
  function mapAmbulanceLocation(
    row,
  ) {
    return {
      id:
        row.id,
  
      eventId:
        row.event_id,
  
      ambulanceId:
        row.ambulance_id,
  
      ambulanceCode:
        row.ambulance_code,
  
      sourceDeviceId:
        row.source_device_id,
  
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
        row.heading_degrees ===
          null
          ? null
          : Number(
              row.heading_degrees,
            ),
  
      recordedAt:
        row.recorded_at,
  
      receivedAt:
        row.received_at,
  
      payload:
        row.payload,
    };
  }
  
  function mapEmergency(
    row,
  ) {
    return {
      id:
        row.id,
  
      eventId:
        row.event_id,
  
      caseNumber:
        row.case_number,
  
      summary:
        row.summary,
  
      status:
        row.status,
  
      governorate: {
        id:
          row.governorate_id,
  
        name:
          row.governorate_name,
  
        slug:
          row.governorate_slug,
      },
  
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
  
      createdBy: {
        id:
          row.created_by_id,
  
        name:
          row.created_by_name,
      },
  
      activeAlertCount:
        Number(
          row.active_alert_count,
        ),
  
      dispatchCount:
        Number(
          row.dispatch_count,
        ),
  
      reportedAt:
        row.reported_at,
  
      receivedAt:
        row.received_at,
  
      resolvedAt:
        row.resolved_at,
  
      payload:
        row.payload,
  
      createdAt:
        row.created_at,
  
      updatedAt:
        row.updated_at,
    };
  }
  
  function mapDispatch(
    row,
  ) {
    return {
      id:
        row.id,
  
      eventId:
        row.event_id,
  
      dispatchNumber:
        row.dispatch_number,
  
      recommendationId:
        row.recommendation_id,
  
      status:
        row.status,
  
      assignedDistanceMeters:
        Number(
          row.assigned_distance_meters,
        ),
  
      assignedDistanceKilometers:
        Number(
          (
            Number(
              row.assigned_distance_meters,
            ) /
            1000
          ).toFixed(2),
        ),
  
      emergencyCase: {
        id:
          row.emergency_id,
  
        caseNumber:
          row.case_number,
  
        summary:
          row.emergency_summary,
  
        status:
          row.emergency_status,
  
        governorate: {
          id:
            row.governorate_id,
  
          name:
            row.governorate_name,
  
          slug:
            row.governorate_slug,
        },
  
        location: {
          longitude:
            Number(
              row.emergency_longitude,
            ),
  
          latitude:
            Number(
              row.emergency_latitude,
            ),
        },
      },
  
      ambulance: {
        id:
          row.ambulance_id,
  
        code:
          row.ambulance_code,
  
        currentStatus:
          row.current_ambulance_status,
  
        isOperational:
          row.is_operational,
  
        startLocation: {
          longitude:
            Number(
              row.ambulance_start_longitude,
            ),
  
          latitude:
            Number(
              row.ambulance_start_latitude,
            ),
        },
      },
  
      confirmedBy: {
        id:
          row.confirmed_by_id,
  
        name:
          row.confirmed_by_name,
      },
  
      storedRoutePointCount:
        Number(
          row.stored_route_point_count,
        ),
  
      statusEventCount:
        Number(
          row.status_event_count,
        ),
  
      assignedAt:
        row.assigned_at,
  
      enRouteAt:
        row.en_route_at,
  
      arrivedAt:
        row.arrived_at,
  
      completedAt:
        row.completed_at,
  
      cancelledAt:
        row.cancelled_at,
  
      cancellationReason:
        row.cancellation_reason,
  
      lastRouteSequenceNumber:
        Number(
          row.last_route_sequence_number,
        ),
  
      lastRoutePointAt:
        row.last_route_point_at,
  
      payload:
        row.payload,
  
      createdAt:
        row.created_at,
  
      updatedAt:
        row.updated_at,
    };
  }
  
  function mapRoutePoint(
    row,
  ) {
    return {
      id:
        row.id,
  
      eventId:
        row.event_id,
  
      dispatchId:
        row.dispatch_id,
  
      ambulanceId:
        row.ambulance_id,
  
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
        row.heading_degrees ===
          null
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
  
  function mapStatusEvent(
    row,
  ) {
    return {
      id:
        row.id,
  
      eventId:
        row.event_id,
  
      dispatchId:
        row.dispatch_id,
  
      status:
        row.status,
  
      changedBy:
        row.changed_by_user_id
          ? {
              id:
                row.changed_by_user_id,
  
              name:
                row.changed_by_user_name,
            }
          : null,
  
      occurredAt:
        row.occurred_at,
  
      receivedAt:
        row.received_at,
  
      payload:
        row.payload,
    };
  }
  
  export async function getAmbulanceLocationHistory(
    query,
  ) {
    const range =
      resolveHistoryRange(
        query,
      );
  
    const limit =
      Number(query.limit);
  
    const rows =
      await selectAmbulanceLocationHistory({
        from:
          range.from,
  
        to:
          range.to,
  
        governorateId:
          query.governorateId ??
          null,
  
        ambulanceId:
          query.ambulanceId ??
          null,
  
        limit,
      });
  
    const hasMore =
      rows.length >
      limit;
  
    const visibleRows =
      hasMore
        ? rows.slice(
            0,
            limit,
          )
        : rows;
  
    const ambulancesById =
      new Map();
  
    for (
      const row of
      visibleRows
    ) {
      if (
        ambulancesById.has(
          row.ambulance_id,
        )
      ) {
        continue;
      }
  
      ambulancesById.set(
        row.ambulance_id,
        {
          id:
            row.ambulance_id,
  
          code:
            row.ambulance_code,
  
          deviceId:
            row.device_id,
  
          currentStatus:
            row.current_ambulance_status,
  
          isOperational:
            row.is_operational,
  
          governorate: {
            id:
              row.governorate_id,
  
            name:
              row.governorate_name,
  
            slug:
              row.governorate_slug,
          },
  
          baseFacility:
            row.base_facility_id
              ? {
                  id:
                    row.base_facility_id,
  
                  name:
                    row.base_facility_name,
                }
              : null,
        },
      );
    }
  
    return {
      generatedAt:
        new Date()
          .toISOString(),
  
      range,
  
      filters: {
        governorateId:
          query.governorateId ??
          null,
  
        ambulanceId:
          query.ambulanceId ??
          null,
      },
  
      count:
        visibleRows.length,
  
      limit,
  
      hasMore,
  
      ambulances:
        Array.from(
          ambulancesById
            .values(),
        ),
  
      points:
        visibleRows.map(
          mapAmbulanceLocation,
        ),
    };
  }
  
  export async function getEmergencyHistory(
    query,
  ) {
    const range =
      resolveHistoryRange(
        query,
      );
  
    const limit =
      Number(query.limit);
  
    const rows =
      await selectEmergencyHistory({
        from:
          range.from,
  
        to:
          range.to,
  
        governorateId:
          query.governorateId ??
          null,
  
        status:
          query.status ??
          null,
  
        limit,
      });
  
    const hasMore =
      rows.length >
      limit;
  
    const visibleRows =
      hasMore
        ? rows.slice(
            0,
            limit,
          )
        : rows;
  
    return {
      generatedAt:
        new Date()
          .toISOString(),
  
      range,
  
      filters: {
        governorateId:
          query.governorateId ??
          null,
  
        status:
          query.status ??
          null,
      },
  
      count:
        visibleRows.length,
  
      limit,
  
      hasMore,
  
      emergencies:
        visibleRows.map(
          mapEmergency,
        ),
    };
  }
  
  export async function getDispatchHistory(
    query,
  ) {
    const range =
      resolveHistoryRange(
        query,
      );
  
    const limit =
      Number(query.limit);
  
    const rows =
      await selectDispatchHistory({
        from:
          range.from,
  
        to:
          range.to,
  
        governorateId:
          query.governorateId ??
          null,
  
        ambulanceId:
          query.ambulanceId ??
          null,
  
        status:
          query.status ??
          null,
  
        limit,
      });
  
    const hasMore =
      rows.length >
      limit;
  
    const visibleRows =
      hasMore
        ? rows.slice(
            0,
            limit,
          )
        : rows;
  
    return {
      generatedAt:
        new Date()
          .toISOString(),
  
      range,
  
      filters: {
        governorateId:
          query.governorateId ??
          null,
  
        ambulanceId:
          query.ambulanceId ??
          null,
  
        status:
          query.status ??
          null,
      },
  
      count:
        visibleRows.length,
  
      limit,
  
      hasMore,
  
      dispatches:
        visibleRows.map(
          mapDispatch,
        ),
    };
  }
  
  export async function getDispatchRouteHistory(
    dispatchId,
    query,
  ) {
    const range =
      resolveHistoryRange(
        query,
      );
  
    const metadata =
      await selectDispatchHistoryMetadata(
        dispatchId,
      );
  
    if (!metadata) {
      throw new HttpError(
        404,
        "DISPATCH_NOT_FOUND",
        "The requested dispatch was not found.",
      );
    }
  
    const limit =
      Number(query.limit);
  
    const afterSequence =
      Number(
        query.afterSequence,
      );
  
    const [
      routeRows,
      statusRows,
    ] = await Promise.all([
      selectDispatchRouteHistoryPoints({
        dispatchId,
  
        from:
          range.from,
  
        to:
          range.to,
  
        afterSequence,
  
        limit,
      }),
  
      selectDispatchStatusHistory({
        dispatchId,
  
        from:
          range.from,
  
        to:
          range.to,
      }),
    ]);
  
    const hasMore =
      routeRows.length >
      limit;
  
    const visibleRows =
      hasMore
        ? routeRows.slice(
            0,
            limit,
          )
        : routeRows;
  
    const points =
      visibleRows.map(
        mapRoutePoint,
      );
  
    return {
      generatedAt:
        new Date()
          .toISOString(),
  
      range,
  
      dispatch: {
        id:
          metadata.id,
  
        dispatchNumber:
          metadata.dispatch_number,
  
        status:
          metadata.status,
  
        assignedDistanceMeters:
          Number(
            metadata
              .assigned_distance_meters,
          ),
  
        assignedAt:
          metadata.assigned_at,
  
        enRouteAt:
          metadata.en_route_at,
  
        arrivedAt:
          metadata.arrived_at,
  
        completedAt:
          metadata.completed_at,
  
        cancelledAt:
          metadata.cancelled_at,
  
        lastRouteSequenceNumber:
          Number(
            metadata
              .last_route_sequence_number,
          ),
  
        lastRoutePointAt:
          metadata
            .last_route_point_at,
  
        emergencyCase: {
          id:
            metadata.emergency_id,
  
          caseNumber:
            metadata.case_number,
  
          summary:
            metadata.emergency_summary,
  
          status:
            metadata.emergency_status,
  
          governorate: {
            id:
              metadata.governorate_id,
  
            name:
              metadata.governorate_name,
  
            slug:
              metadata.governorate_slug,
          },
  
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
  
        ambulance: {
          id:
            metadata.ambulance_id,
  
          code:
            metadata.ambulance_code,
        },
      },
  
      afterSequence,
  
      count:
        points.length,
  
      limit,
  
      hasMore,
  
      nextAfterSequence:
        points.length > 0
          ? points[
              points.length - 1
            ].sequenceNumber
          : afterSequence,
  
      points,
  
      statusEvents:
        statusRows.map(
          mapStatusEvent,
        ),
    };
  }