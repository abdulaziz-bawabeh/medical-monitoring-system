import {
    randomUUID,
  } from "node:crypto";
  
  import {
    pool,
  } from "../config/databasePool.js";
  
  import {
    transitionAmbulanceDispatch,
  } from "./dispatchService.js";
  
  import {
    recordDispatchRoutePoint,
  } from "./dispatchRouteService.js";
  
  const EARTH_RADIUS_METERS =
    6_371_000;
  
  /*
   * Accelerated movement is useful for demonstration.
   *
   * The ambulance moves up to 350 meters per simulation tick.
   */
  const MAXIMUM_STEP_METERS =
    350;
  
  const ARRIVAL_DISTANCE_METERS =
    50;
  
  const ARRIVAL_WAIT_MILLISECONDS =
    3_000;
  
  function degreesToRadians(
    value,
  ) {
    return (
      value *
      Math.PI /
      180
    );
  }
  
  function radiansToDegrees(
    value,
  ) {
    return (
      value *
      180 /
      Math.PI
    );
  }
  
  function calculateDistanceMeters(
    start,
    destination,
  ) {
    const latitudeDifference =
      degreesToRadians(
        destination.latitude -
        start.latitude,
      );
  
    const longitudeDifference =
      degreesToRadians(
        destination.longitude -
        start.longitude,
      );
  
    const startLatitude =
      degreesToRadians(
        start.latitude,
      );
  
    const destinationLatitude =
      degreesToRadians(
        destination.latitude,
      );
  
    const haversine =
      Math.sin(
        latitudeDifference / 2,
      ) ** 2 +
      Math.cos(
        startLatitude,
      ) *
        Math.cos(
          destinationLatitude,
        ) *
        Math.sin(
          longitudeDifference / 2,
        ) ** 2;
  
    const angularDistance =
      2 *
      Math.atan2(
        Math.sqrt(
          haversine,
        ),
        Math.sqrt(
          1 - haversine,
        ),
      );
  
    return (
      EARTH_RADIUS_METERS *
      angularDistance
    );
  }
  
  function calculateHeadingDegrees(
    start,
    destination,
  ) {
    const startLatitude =
      degreesToRadians(
        start.latitude,
      );
  
    const destinationLatitude =
      degreesToRadians(
        destination.latitude,
      );
  
    const longitudeDifference =
      degreesToRadians(
        destination.longitude -
        start.longitude,
      );
  
    const y =
      Math.sin(
        longitudeDifference,
      ) *
      Math.cos(
        destinationLatitude,
      );
  
    const x =
      Math.cos(
        startLatitude,
      ) *
        Math.sin(
          destinationLatitude,
        ) -
      Math.sin(
        startLatitude,
      ) *
        Math.cos(
          destinationLatitude,
        ) *
        Math.cos(
          longitudeDifference,
        );
  
    const heading =
      radiansToDegrees(
        Math.atan2(
          y,
          x,
        ),
      );
  
    return Number(
      (
        (
          heading +
          360
        ) %
        360
      ).toFixed(2),
    );
  }
  
  function calculateNextPoint(
    start,
    destination,
  ) {
    const remainingDistanceMeters =
      calculateDistanceMeters(
        start,
        destination,
      );
  
    if (
      remainingDistanceMeters <=
      ARRIVAL_DISTANCE_METERS
    ) {
      return {
        longitude:
          destination.longitude,
  
        latitude:
          destination.latitude,
  
        travelledDistanceMeters:
          remainingDistanceMeters,
  
        remainingDistanceMeters:
          0,
  
        arrived:
          true,
      };
    }
  
    const travelledDistanceMeters =
      Math.min(
        MAXIMUM_STEP_METERS,
        remainingDistanceMeters,
      );
  
    const ratio =
      travelledDistanceMeters /
      remainingDistanceMeters;
  
    const longitude =
      start.longitude +
      (
        destination.longitude -
        start.longitude
      ) *
        ratio;
  
    const latitude =
      start.latitude +
      (
        destination.latitude -
        start.latitude
      ) *
        ratio;
  
    const nextPoint = {
      longitude:
        Number(
          longitude.toFixed(6),
        ),
  
      latitude:
        Number(
          latitude.toFixed(6),
        ),
    };
  
    const newRemainingDistance =
      calculateDistanceMeters(
        nextPoint,
        destination,
      );
  
    const arrived =
      newRemainingDistance <=
      ARRIVAL_DISTANCE_METERS;
  
    return {
      longitude:
        arrived
          ? destination.longitude
          : nextPoint.longitude,
  
      latitude:
        arrived
          ? destination.latitude
          : nextPoint.latitude,
  
      travelledDistanceMeters,
  
      remainingDistanceMeters:
        arrived
          ? 0
          : newRemainingDistance,
  
      arrived,
    };
  }
  
  async function listMovementDispatches() {
    const result =
      await pool.query(
        `
          SELECT
            dispatch.id::TEXT
              AS dispatch_id,
  
            dispatch.dispatch_number,
  
            dispatch.status
              AS dispatch_status,
  
            dispatch.last_route_sequence_number,
  
            dispatch.assigned_at,
  
            dispatch.en_route_at,
  
            dispatch.arrived_at,
  
            ambulance.id::TEXT
              AS ambulance_id,
  
            ambulance.code
              AS ambulance_code,
  
            ambulance.status
              AS ambulance_status,
  
            ambulance.is_operational,
  
            ST_X(
              ambulance.current_location
            )::DOUBLE PRECISION
              AS ambulance_longitude,
  
            ST_Y(
              ambulance.current_location
            )::DOUBLE PRECISION
              AS ambulance_latitude,
  
            emergency.id::TEXT
              AS emergency_id,
  
            emergency.case_number,
  
            ST_X(
              emergency.location
            )::DOUBLE PRECISION
              AS emergency_longitude,
  
            ST_Y(
              emergency.location
            )::DOUBLE PRECISION
              AS emergency_latitude
  
          FROM public.ambulance_dispatches
            AS dispatch
  
          JOIN public.ambulances
            AS ambulance
            ON ambulance.id =
               dispatch.ambulance_id
  
          JOIN public.emergency_cases
            AS emergency
            ON emergency.id =
               dispatch.emergency_case_id
  
          WHERE
            dispatch.status IN (
              'ASSIGNED',
              'EN_ROUTE',
              'ARRIVED'
            )
  
          ORDER BY
            dispatch.assigned_at ASC
  
          LIMIT 100;
        `,
      );
  
    return result.rows;
  }
  
  async function startAssignedDispatch(
    dispatch,
    authenticatedUser,
  ) {
    const result =
      await transitionAmbulanceDispatch(
        {
          dispatchId:
            dispatch.dispatch_id,
  
          eventId:
            randomUUID(),
  
          targetStatus:
            "EN_ROUTE",
        },
  
        authenticatedUser,
      );
  
    return {
      action:
        "STARTED",
  
      dispatchId:
        dispatch.dispatch_id,
  
      dispatch:
        result.dispatch,
    };
  }
  
  async function moveEnRouteDispatch(
    dispatch,
    authenticatedUser,
    simulationContext,
  ) {
    if (
      dispatch.ambulance_longitude ===
        null ||
      dispatch.ambulance_latitude ===
        null
    ) {
      return {
        action:
          "SKIPPED",
  
        dispatchId:
          dispatch.dispatch_id,
  
        reason:
          "AMBULANCE_LOCATION_UNAVAILABLE",
      };
    }
  
    const currentLocation = {
      longitude:
        Number(
          dispatch.ambulance_longitude,
        ),
  
      latitude:
        Number(
          dispatch.ambulance_latitude,
        ),
    };
  
    const emergencyLocation = {
      longitude:
        Number(
          dispatch.emergency_longitude,
        ),
  
      latitude:
        Number(
          dispatch.emergency_latitude,
        ),
    };
  
    const nextPoint =
      calculateNextPoint(
        currentLocation,
        emergencyLocation,
      );
  
    const sequenceNumber =
      Number(
        dispatch
          .last_route_sequence_number ??
        0,
      ) + 1;
  
    const recordedAt =
      new Date(
        Date.now() -
        100,
      ).toISOString();
  
    await recordDispatchRoutePoint({
      eventId:
        randomUUID(),
  
      dispatchId:
        dispatch.dispatch_id,
  
      ambulanceId:
        dispatch.ambulance_id,
  
      sequenceNumber,
  
      longitude:
        nextPoint.longitude,
  
      latitude:
        nextPoint.latitude,
  
      speedKmh:
        nextPoint.arrived
          ? 0
          : 55,
  
      headingDegrees:
        calculateHeadingDegrees(
          currentLocation,
          emergencyLocation,
        ),
  
      recordedAt,
  
      payload: {
        source:
          "simulation",
  
        generator:
          "ambulance-movement",
  
        simulationRunId:
          String(
            simulationContext
              .simulationRunId,
          ),
  
        simulationTick:
          Number(
            simulationContext
              .tickCount,
          ),
  
        acceleratedSimulation:
          true,
  
        travelledDistanceMeters:
          Number(
            nextPoint
              .travelledDistanceMeters
              .toFixed(2),
          ),
  
        remainingDistanceMeters:
          Number(
            nextPoint
              .remainingDistanceMeters
              .toFixed(2),
          ),
      },
    });
  
    if (
      nextPoint.arrived
    ) {
      const transitionResult =
        await transitionAmbulanceDispatch(
          {
            dispatchId:
              dispatch.dispatch_id,
  
            eventId:
              randomUUID(),
  
            targetStatus:
              "ARRIVED",
          },
  
          authenticatedUser,
        );
  
      return {
        action:
          "ARRIVED",
  
        dispatchId:
          dispatch.dispatch_id,
  
        sequenceNumber,
  
        dispatch:
          transitionResult.dispatch,
      };
    }
  
    return {
      action:
        "MOVED",
  
      dispatchId:
        dispatch.dispatch_id,
  
      sequenceNumber,
  
      remainingDistanceMeters:
        nextPoint
          .remainingDistanceMeters,
    };
  }
  
  async function completeArrivedDispatch(
    dispatch,
    authenticatedUser,
  ) {
    const arrivedAt =
      dispatch.arrived_at
        ? new Date(
            dispatch.arrived_at,
          ).getTime()
        : 0;
  
    if (
      !arrivedAt ||
      Date.now() -
        arrivedAt <
        ARRIVAL_WAIT_MILLISECONDS
    ) {
      return {
        action:
          "WAITING_AT_EMERGENCY",
  
        dispatchId:
          dispatch.dispatch_id,
      };
    }
  
    const result =
      await transitionAmbulanceDispatch(
        {
          dispatchId:
            dispatch.dispatch_id,
  
          eventId:
            randomUUID(),
  
          targetStatus:
            "COMPLETED",
        },
  
        authenticatedUser,
      );
  
    return {
      action:
        "COMPLETED",
  
      dispatchId:
        dispatch.dispatch_id,
  
      dispatch:
        result.dispatch,
  
      ambulanceStatus:
        result.ambulanceStatus,
  
      emergencyCase:
        result.emergencyCase,
    };
  }
  
  export async function runSimulationAmbulanceMovementCycle({
    simulationRunId,
    tickCount,
    startedByUserId,
  }) {
    if (!startedByUserId) {
      throw new Error(
        "The ambulance movement generator requires the simulation starter user.",
      );
    }
  
    const authenticatedUser = {
      id:
        String(
          startedByUserId,
        ),
    };
  
    const dispatches =
      await listMovementDispatches();
  
    const results = [];
  
    for (
      const dispatch of
      dispatches
    ) {
      try {
        let result;
  
        if (
          dispatch.dispatch_status ===
          "ASSIGNED"
        ) {
          result =
            await startAssignedDispatch(
              dispatch,
              authenticatedUser,
            );
        } else if (
          dispatch.dispatch_status ===
          "EN_ROUTE"
        ) {
          result =
            await moveEnRouteDispatch(
              dispatch,
              authenticatedUser,
              {
                simulationRunId,
                tickCount,
              },
            );
        } else if (
          dispatch.dispatch_status ===
          "ARRIVED"
        ) {
          result =
            await completeArrivedDispatch(
              dispatch,
              authenticatedUser,
            );
        }
  
        if (result) {
          results.push(
            result,
          );
        }
      } catch (error) {
        console.error(
          [
            "Simulation ambulance movement failed",
            `dispatch=${dispatch.dispatch_id}`,
            `status=${dispatch.dispatch_status}`,
            error instanceof Error
              ? error.message
              : String(error),
          ].join(" | "),
        );
  
        results.push({
          action:
            "FAILED",
  
          dispatchId:
            dispatch.dispatch_id,
  
          reason:
            error?.code ??
            "MOVEMENT_FAILED",
  
          message:
            error instanceof Error
              ? error.message
              : String(error),
        });
      }
    }
  
    return {
      processedCount:
        dispatches.length,
  
      startedCount:
        results.filter(
          (result) =>
            result.action ===
            "STARTED",
        ).length,
  
      movedCount:
        results.filter(
          (result) =>
            result.action ===
            "MOVED",
        ).length,
  
      arrivedCount:
        results.filter(
          (result) =>
            result.action ===
            "ARRIVED",
        ).length,
  
      completedCount:
        results.filter(
          (result) =>
            result.action ===
            "COMPLETED",
        ).length,
  
      failedCount:
        results.filter(
          (result) =>
            result.action ===
            "FAILED",
        ).length,
  
      results,
    };
  }