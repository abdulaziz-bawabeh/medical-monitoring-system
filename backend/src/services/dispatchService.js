import {
    randomUUID,
  } from "node:crypto";
  
  import {
    dispatchConfig,
  } from "../config/dispatchConfig.js";
  
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
    findAlertByDeduplicationKey,
    findAlertById,
    insertAlert,
  } from "../repositories/emergencyAlertRepository.js";
  import {
    expirePendingRecommendations,
    findActiveRecommendationForEmergency,
    findDispatchById,
    findDispatchByRecommendationId,
    findEmergencyById,
    findLatestRecommendationForEmergency,
    findNearestEligibleAmbulance,
    findRecommendationByEventId,
    findRecommendationById,
    generateDispatchNumber,
    hasActiveDispatchForAmbulance,
    hasActiveDispatchForEmergency,
    insertAmbulanceDispatch,
    insertDispatchRecommendation,
    insertDispatchStatusEvent,
    listActiveDispatches,
    lockDispatchResources,
    lockEmergencyForRecommendation,
    lockRecommendationById,
    markRecommendationConfirmed,
    markRecommendationRejected,
    resolveAlertByDeduplicationKey,
    updateAmbulanceStatus,
    updateEmergencyStatus,
    findDispatchStatusEventByEventId,
lockDispatchForTransition,
resolveActiveAlertsForEmergency,
resolveEmergencyCase,
updateDispatchLifecycleStatus,
  } from "../repositories/dispatchRepository.js";
  
  function mapEmergencyCase(
    row,
  ) {
    if (!row) {
      return null;
    }
  
    return {
      id: row.id,
  
      eventId:
        row.event_id,
  
      caseNumber:
        row.case_number,
  
      summary:
        row.summary,
  
      status:
        row.status,
  
      createdBy: {
        id:
          row.created_by_user_id,
  
        name:
          row.created_by_name,
      },
  
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
  
      reportedAt:
        row.reported_at,
  
      receivedAt:
        row.received_at,
  
      resolvedAt:
        row.resolved_at,
  
      payload:
        row.payload,
  
      activeAlertCount:
        row.active_alert_count ??
        0,
  
      createdAt:
        row.created_at,
  
      updatedAt:
        row.updated_at,
    };
  }
  
  function mapRecommendation(
    row,
  ) {
    if (!row) {
      return null;
    }
  
    return {
      id: row.id,
  
      eventId:
        row.event_id,
  
      status:
        row.status,
  
      isExpired:
        row.is_expired,
  
      distanceMeters:
        Number(
          row.distance_meters,
        ),
  
      distanceKilometers:
        Number(
          (
            Number(
              row.distance_meters,
            ) / 1000
          ).toFixed(2),
        ),
  
      ambulanceLocationAgeSeconds:
        row.ambulance_location_age_seconds,
  
      maxLocationAgeSeconds:
        row.max_location_age_seconds,
  
      generatedAt:
        row.generated_at,
  
      expiresAt:
        row.expires_at,
  
      emergencyCase: {
        id:
          row.emergency_id,
  
        caseNumber:
          row.case_number,
  
        summary:
          row.emergency_summary,
  
        status:
          row.emergency_status,
  
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
  
        status:
          row.ambulance_current_status,
  
        isOperational:
          row.ambulance_is_operational,
  
        location: {
          longitude:
            Number(
              row.ambulance_longitude,
            ),
  
          latitude:
            Number(
              row.ambulance_latitude,
            ),
        },
  
        locationRecordedAt:
          row.ambulance_location_recorded_at,
      },
  
      requestedBy: {
        id:
          row.requested_by_user_id,
  
        name:
          row.requested_by_user_name,
      },
  
      confirmedBy:
        row.confirmed_by_user_id
          ? {
              id:
                row.confirmed_by_user_id,
  
              name:
                row.confirmed_by_user_name,
  
              confirmedAt:
                row.confirmed_at,
            }
          : null,
  
      rejectedBy:
        row.rejected_by_user_id
          ? {
              id:
                row.rejected_by_user_id,
  
              name:
                row.rejected_by_user_name,
  
              rejectedAt:
                row.rejected_at,
  
              reason:
                row.rejection_reason,
            }
          : null,
  
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
    if (!row) {
      return null;
    }
  
    return {
      id: row.id,
  
      eventId:
        row.event_id,
  
      dispatchNumber:
        row.dispatch_number,
  
      status:
        row.status,
  
      recommendationId:
        row.recommendation_id,
  
      assignedDistanceMeters:
        Number(
          row.assigned_distance_meters,
        ),
  
      assignedDistanceKilometers:
        Number(
          (
            Number(
              row.assigned_distance_meters,
            ) / 1000
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
  
        status:
          row.ambulance_status,
  
        isOperational:
          row.ambulance_is_operational,
  
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
          row.confirmed_by_user_id,
  
        name:
          row.confirmed_by_user_name,
      },
  
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
  
  function mapAlert(
    row,
  ) {
    if (!row) {
      return null;
    }
  
    return {
      id: row.id,
  
      eventId:
        row.event_id,
  
      deduplicationKey:
        row.deduplication_key,
  
      alertType:
        row.alert_type,
  
      status:
        row.status,
  
      title:
        row.title,
  
      message:
        row.message,
  
      emergencyCase:
        row.emergency_case_id
          ? {
              id:
                row.emergency_case_id,
  
              caseNumber:
                row.emergency_case_number,
            }
          : null,
  
      facility:
        row.facility_id
          ? {
              id:
                row.facility_id,
  
              name:
                row.facility_name,
            }
          : null,
  
      ambulance:
        row.ambulance_id
          ? {
              id:
                row.ambulance_id,
  
              code:
                row.ambulance_code,
            }
          : null,
  
      acknowledgedBy:
        row.acknowledged_by_user_id
          ? {
              id:
                row.acknowledged_by_user_id,
  
              name:
                row.acknowledged_by_name,
  
              acknowledgedAt:
                row.acknowledged_at,
            }
          : null,
  
      resolvedBy:
        row.resolved_by_user_id
          ? {
              id:
                row.resolved_by_user_id,
  
              name:
                row.resolved_by_name,
  
              resolvedAt:
                row.resolved_at,
            }
          : null,
  
      payload:
        row.payload,
  
      createdAt:
        row.created_at,
  
      updatedAt:
        row.updated_at,
    };
  }
  
  function publishManagerEvent(
    eventName,
    payload,
  ) {
    try {
      const io =
        getSocketServer();
  
      io
        .to(
          "role:health_manager",
        )
        .emit(
          eventName,
          payload,
        );
    } catch (error) {
      console.error(
        `Failed to publish ${eventName}:`,
        error.message,
      );
    }
  }
  
  function mapUniqueViolation(
    error,
  ) {
    if (
      error?.code !== "23505"
    ) {
      return null;
    }
  
    return new HttpError(
      409,
      "DISPATCH_RESOURCE_CONFLICT",
      "The emergency or ambulance was reserved by another request. Refresh the operational data and try again.",
    );
  }
  
  export async function generateDispatchRecommendation(
    {
      emergencyId,
      eventId,
    },
    authenticatedUser,
  ) {
    const client =
      await pool.connect();
  
    let recommendation;
    let emergency;
    let confirmationAlert;
    let created = false;
  
    try {
      await client.query(
        "BEGIN",
      );
  
      const duplicateRecommendation =
        await findRecommendationByEventId(
          client,
          eventId,
        );
  
      if (duplicateRecommendation) {
        await client.query(
          "COMMIT",
        );
  
        return {
          duplicate: true,
  
          reused: false,
  
          recommendation:
            mapRecommendation(
              duplicateRecommendation,
            ),
        };
      }
  
      await expirePendingRecommendations(
        client,
        authenticatedUser.id,
      );
  
      const lockedEmergency =
        await lockEmergencyForRecommendation(
          client,
          emergencyId,
        );
  
      if (!lockedEmergency) {
        throw new HttpError(
          404,
          "EMERGENCY_CASE_NOT_FOUND",
          "The requested emergency case was not found.",
        );
      }
  
      if (
        [
          "DISPATCHED",
          "RESOLVED",
          "CANCELLED",
        ].includes(
          lockedEmergency.status,
        )
      ) {
        throw new HttpError(
          409,
          "EMERGENCY_NOT_ELIGIBLE_FOR_RECOMMENDATION",
          `A recommendation cannot be generated while the emergency status is ${lockedEmergency.status}.`,
        );
      }
  
      const existingActiveRecommendation =
        await findActiveRecommendationForEmergency(
          client,
          emergencyId,
        );
  
      if (
        existingActiveRecommendation
      ) {
        await client.query(
          "COMMIT",
        );
  
        return {
          duplicate: false,
  
          reused: true,
  
          recommendation:
            mapRecommendation(
              existingActiveRecommendation,
            ),
        };
      }
  
      const nearestAmbulance =
        await findNearestEligibleAmbulance(
          client,
          {
            emergencyId,
  
            maxLocationAgeSeconds:
              dispatchConfig
                .maxLocationAgeSeconds,
  
            maxDistanceMeters:
              dispatchConfig
                .maxDistanceMeters,
          },
        );
  
      if (!nearestAmbulance) {
        throw new HttpError(
          409,
          "NO_ELIGIBLE_AMBULANCE",
          "No available operational ambulance with a recent location was found within the configured dispatch distance.",
          {
            maxLocationAgeSeconds:
              dispatchConfig
                .maxLocationAgeSeconds,
  
            maxDistanceMeters:
              dispatchConfig
                .maxDistanceMeters,
          },
        );
      }
  
      const insertedRecommendation =
        await insertDispatchRecommendation(
          client,
          {
            eventId,
  
            emergencyCaseId:
              emergencyId,
  
            ambulanceId:
              nearestAmbulance
                .ambulance_id,
  
            requestedByUserId:
              authenticatedUser.id,
  
            distanceMeters:
              nearestAmbulance
                .distance_meters,
  
            emergencyLongitude:
              nearestAmbulance
                .emergency_longitude,
  
            emergencyLatitude:
              nearestAmbulance
                .emergency_latitude,
  
            ambulanceLongitude:
              nearestAmbulance
                .ambulance_longitude,
  
            ambulanceLatitude:
              nearestAmbulance
                .ambulance_latitude,
  
            ambulanceLocationRecordedAt:
              nearestAmbulance
                .last_location_at,
  
            ambulanceLocationAgeSeconds:
              nearestAmbulance
                .location_age_seconds,
  
            maxLocationAgeSeconds:
              dispatchConfig
                .maxLocationAgeSeconds,
  
            recommendationTtlSeconds:
              dispatchConfig
                .recommendationTtlSeconds,
  
            payload: {
              algorithm:
                "NEAREST_ELIGIBLE_AMBULANCE",
  
              maxDistanceMeters:
                dispatchConfig
                  .maxDistanceMeters,
  
              maxLocationAgeSeconds:
                dispatchConfig
                  .maxLocationAgeSeconds,
            },
          },
        );
  
      if (!insertedRecommendation) {
        recommendation =
          await findRecommendationByEventId(
            client,
            eventId,
          );
  
        await client.query(
          "COMMIT",
        );
  
        return {
          duplicate: true,
  
          reused: false,
  
          recommendation:
            mapRecommendation(
              recommendation,
            ),
        };
      }
  
      await updateEmergencyStatus(
        client,
        {
          emergencyId,
  
          status:
            "AWAITING_MANAGER_CONFIRMATION",
        },
      );
  
      const confirmationAlertKey =
        `dispatch-confirmation:${insertedRecommendation.id}`;
  
      await insertAlert(
        client,
        {
          eventId:
            randomUUID(),
  
          deduplicationKey:
            confirmationAlertKey,
  
          emergencyCaseId:
            emergencyId,
  
          ambulanceId:
            nearestAmbulance
              .ambulance_id,
  
          alertType:
            "DISPATCH_CONFIRMATION_REQUIRED",
  
          title:
            "Ambulance confirmation required",
  
          message:
            `${nearestAmbulance.ambulance_code} is recommended for ${lockedEmergency.case_number}.`,
  
          payload: {
            recommendationId:
              insertedRecommendation.id,
  
            distanceMeters:
              nearestAmbulance
                .distance_meters,
  
            expiresInSeconds:
              dispatchConfig
                .recommendationTtlSeconds,
          },
        },
      );
  
      recommendation =
        await findRecommendationById(
          client,
          insertedRecommendation.id,
        );
  
      emergency =
        await findEmergencyById(
          client,
          emergencyId,
        );
  
      confirmationAlert =
        await findAlertByDeduplicationKey(
          client,
          confirmationAlertKey,
        );
  
      created = true;
  
      await client.query(
        "COMMIT",
      );
    } catch (error) {
      await client.query(
        "ROLLBACK",
      );
  
      const conflictError =
        mapUniqueViolation(
          error,
        );
  
      if (conflictError) {
        throw conflictError;
      }
  
      throw error;
    } finally {
      client.release();
    }
  
    const mappedRecommendation =
      mapRecommendation(
        recommendation,
      );
  
    const mappedEmergency =
      mapEmergencyCase(
        emergency,
      );
  
    const mappedAlert =
      mapAlert(
        confirmationAlert,
      );
  
    if (created) {
      publishManagerEvent(
        "dispatch:recommendation-created",
        mappedRecommendation,
      );
  
      publishManagerEvent(
        "emergency:updated",
        mappedEmergency,
      );
  
      publishManagerEvent(
        "alert:created",
        mappedAlert,
      );
    }
  
    return {
      duplicate: false,
  
      reused: false,
  
      recommendation:
        mappedRecommendation,
  
      emergencyCase:
        mappedEmergency,
  
      alert:
        mappedAlert,
    };
  }
  
  export async function getLatestDispatchRecommendation(
    emergencyId,
  ) {
    const client =
      await pool.connect();
  
    try {
      const recommendation =
        await findLatestRecommendationForEmergency(
          client,
          emergencyId,
        );
  
      /*
       * No recommendation is a valid initial state.
       */
      if (!recommendation) {
        return null;
      }
  
      return mapRecommendation(
        recommendation,
      );
    } finally {
      client.release();
    }
  }
  
  export async function confirmDispatchRecommendation(
    {
      recommendationId,
      dispatchEventId,
    },
    authenticatedUser,
  ) {
    const client =
      await pool.connect();
  
    let recommendation;
    let dispatch;
    let emergency;
    let ambulanceStatus;
    let resolvedConfirmationAlert;
    let dispatchAlert;
  
    try {
      await client.query(
        "BEGIN",
      );
  
      const lockedRecommendation =
        await lockRecommendationById(
          client,
          recommendationId,
        );
  
      if (!lockedRecommendation) {
        throw new HttpError(
          404,
          "DISPATCH_RECOMMENDATION_NOT_FOUND",
          "The requested dispatch recommendation was not found.",
        );
      }
  
      if (
        lockedRecommendation.status ===
        "CONFIRMED"
      ) {
        dispatch =
          await findDispatchByRecommendationId(
            client,
            recommendationId,
          );
  
        await client.query(
          "COMMIT",
        );
  
        return {
          duplicate: true,
  
          recommendation:
            mapRecommendation(
              lockedRecommendation,
            ),
  
          dispatch:
            mapDispatch(
              dispatch,
            ),
        };
      }
  
      if (
        lockedRecommendation.status !==
        "PENDING"
      ) {
        throw new HttpError(
          409,
          "RECOMMENDATION_NOT_PENDING",
          `The recommendation cannot be confirmed because its status is ${lockedRecommendation.status}.`,
        );
      }
  
      if (
        new Date(
          lockedRecommendation
            .expires_at,
        ).getTime() <= Date.now()
      ) {
        throw new HttpError(
          409,
          "RECOMMENDATION_EXPIRED",
          "The dispatch recommendation has expired. Generate a new recommendation.",
        );
      }
  
      const lockedResources =
        await lockDispatchResources(
          client,
          {
            emergencyId:
              lockedRecommendation
                .emergency_id,
  
            ambulanceId:
              lockedRecommendation
                .ambulance_id,
          },
        );
  
      if (!lockedResources) {
        throw new HttpError(
          409,
          "DISPATCH_RESOURCES_NOT_FOUND",
          "The emergency or recommended ambulance is no longer available.",
        );
      }
  
      if (
        ![
          "OPEN",
          "AWAITING_MANAGER_CONFIRMATION",
        ].includes(
          lockedResources
            .emergency_status,
        )
      ) {
        throw new HttpError(
          409,
          "EMERGENCY_STATE_CHANGED",
          `The emergency cannot be dispatched while its status is ${lockedResources.emergency_status}.`,
        );
      }
  
      if (
        lockedResources
          .ambulance_status !==
          "AVAILABLE" ||
        !lockedResources
          .is_operational
      ) {
        throw new HttpError(
          409,
          "AMBULANCE_NOT_AVAILABLE",
          "The recommended ambulance is no longer available and operational.",
        );
      }
  
      if (
        !lockedResources
          .has_current_location ||
        !lockedResources
          .last_location_at
      ) {
        throw new HttpError(
          409,
          "AMBULANCE_LOCATION_UNAVAILABLE",
          "The recommended ambulance no longer has a valid current location.",
        );
      }
  
      if (
        lockedResources
          .location_age_seconds >
        lockedRecommendation
          .max_location_age_seconds
      ) {
        throw new HttpError(
          409,
          "AMBULANCE_LOCATION_STALE",
          "The recommended ambulance location is too old. Generate a new recommendation.",
        );
      }
  
      const [
        emergencyHasDispatch,
        ambulanceHasDispatch,
      ] = await Promise.all([
        hasActiveDispatchForEmergency(
          client,
          lockedRecommendation
            .emergency_id,
        ),
  
        hasActiveDispatchForAmbulance(
          client,
          lockedRecommendation
            .ambulance_id,
        ),
      ]);
  
      if (emergencyHasDispatch) {
        throw new HttpError(
          409,
          "EMERGENCY_ALREADY_DISPATCHED",
          "The emergency already has an active dispatch.",
        );
      }
  
      if (ambulanceHasDispatch) {
        throw new HttpError(
          409,
          "AMBULANCE_ALREADY_DISPATCHED",
          "The recommended ambulance already has an active dispatch.",
        );
      }
  
      const dispatchNumber =
        await generateDispatchNumber(
          client,
        );
  
      const insertedDispatch =
        await insertAmbulanceDispatch(
          client,
          {
            eventId:
              dispatchEventId,
  
            dispatchNumber,
  
            recommendationId,
  
            emergencyCaseId:
              lockedRecommendation
                .emergency_id,
  
            ambulanceId:
              lockedRecommendation
                .ambulance_id,
  
            confirmedByUserId:
              authenticatedUser.id,
  
            emergencyLongitude:
              lockedResources
                .emergency_longitude,
  
            emergencyLatitude:
              lockedResources
                .emergency_latitude,
  
            ambulanceLongitude:
              lockedResources
                .ambulance_longitude,
  
            ambulanceLatitude:
              lockedResources
                .ambulance_latitude,
  
            assignedDistanceMeters:
              lockedResources
                .current_distance_meters,
  
            payload: {
              recommendationDistanceMeters:
                Number(
                  lockedRecommendation
                    .distance_meters,
                ),
  
              confirmationDistanceMeters:
                Number(
                  lockedResources
                    .current_distance_meters,
                ),
            },
          },
        );
  
      await markRecommendationConfirmed(
        client,
        {
          recommendationId,
  
          userId:
            authenticatedUser.id,
        },
      );
  
      ambulanceStatus =
        await updateAmbulanceStatus(
          client,
          {
            ambulanceId:
              lockedRecommendation
                .ambulance_id,
  
            status:
              "BUSY",
          },
        );
  
      await updateEmergencyStatus(
        client,
        {
          emergencyId:
            lockedRecommendation
              .emergency_id,
  
          status:
            "DISPATCHED",
        },
      );
  
      await insertDispatchStatusEvent(
        client,
        {
          eventId:
            randomUUID(),
  
          dispatchId:
            insertedDispatch.id,
  
          status:
            "ASSIGNED",
  
          changedByUserId:
            authenticatedUser.id,
  
          payload: {
            source:
              "MANAGER_CONFIRMATION",
          },
        },
      );
  
      const confirmationAlertKey =
        `dispatch-confirmation:${recommendationId}`;
  
      const resolvedAlertResult =
        await resolveAlertByDeduplicationKey(
          client,
          {
            deduplicationKey:
              confirmationAlertKey,
  
            resolvedByUserId:
              authenticatedUser.id,
          },
        );
  
      const dispatchAlertKey =
        `dispatch-status:${insertedDispatch.id}:ASSIGNED`;
  
      await insertAlert(
        client,
        {
          eventId:
            randomUUID(),
  
          deduplicationKey:
            dispatchAlertKey,
  
          emergencyCaseId:
            lockedRecommendation
              .emergency_id,
  
          ambulanceId:
            lockedRecommendation
              .ambulance_id,
  
          alertType:
            "DISPATCH_STATUS_CHANGED",
  
          title:
            "Ambulance dispatch assigned",
  
          message:
            `${dispatchNumber} was assigned to ${lockedRecommendation.case_number}.`,
  
          payload: {
            dispatchId:
              insertedDispatch.id,
  
            dispatchNumber,
  
            status:
              "ASSIGNED",
          },
        },
      );
  
      recommendation =
        await findRecommendationById(
          client,
          recommendationId,
        );
  
      dispatch =
        await findDispatchById(
          client,
          insertedDispatch.id,
        );
  
      emergency =
        await findEmergencyById(
          client,
          lockedRecommendation
            .emergency_id,
        );
  
      resolvedConfirmationAlert =
        resolvedAlertResult
          ? await findAlertByDeduplicationKey(
              client,
              confirmationAlertKey,
            )
          : null;
  
      dispatchAlert =
        await findAlertByDeduplicationKey(
          client,
          dispatchAlertKey,
        );
  
      await client.query(
        "COMMIT",
      );
    } catch (error) {
      await client.query(
        "ROLLBACK",
      );
  
      const conflictError =
        mapUniqueViolation(
          error,
        );
  
      if (conflictError) {
        throw conflictError;
      }
  
      throw error;
    } finally {
      client.release();
    }
  
    const mappedRecommendation =
      mapRecommendation(
        recommendation,
      );
  
    const mappedDispatch =
      mapDispatch(
        dispatch,
      );
  
    const mappedEmergency =
      mapEmergencyCase(
        emergency,
      );
  
    const mappedResolvedAlert =
      mapAlert(
        resolvedConfirmationAlert,
      );
  
    const mappedDispatchAlert =
      mapAlert(
        dispatchAlert,
      );
  
    publishManagerEvent(
      "dispatch:recommendation-updated",
      mappedRecommendation,
    );
  
    publishManagerEvent(
      "dispatch:created",
      mappedDispatch,
    );
  
    publishManagerEvent(
      "dispatch:status-updated",
      mappedDispatch,
    );
  
    publishManagerEvent(
      "ambulance:status-updated",
      {
        ambulanceId:
          ambulanceStatus.id,
  
        code:
          ambulanceStatus.code,
  
        status:
          ambulanceStatus.status,
  
        isOperational:
          ambulanceStatus
            .is_operational,
  
        dispatchId:
          mappedDispatch.id,
  
        updatedAt:
          ambulanceStatus.updated_at,
      },
    );
  
    publishManagerEvent(
      "emergency:updated",
      mappedEmergency,
    );
  
    if (mappedResolvedAlert) {
      publishManagerEvent(
        "alert:updated",
        mappedResolvedAlert,
      );
    }
  
    publishManagerEvent(
      "alert:created",
      mappedDispatchAlert,
    );
  
    return {
      duplicate: false,
  
      recommendation:
        mappedRecommendation,
  
      dispatch:
        mappedDispatch,
  
      emergencyCase:
        mappedEmergency,
  
      ambulanceStatus: {
        id:
          ambulanceStatus.id,
  
        code:
          ambulanceStatus.code,
  
        status:
          ambulanceStatus.status,
  
        isOperational:
          ambulanceStatus
            .is_operational,
  
        updatedAt:
          ambulanceStatus.updated_at,
      },
    };
  }
  
  export async function rejectDispatchRecommendation(
    {
      recommendationId,
      reason,
    },
    authenticatedUser,
  ) {
    const client =
      await pool.connect();
  
    let recommendation;
    let emergency;
    let resolvedAlert;
  
    try {
      await client.query(
        "BEGIN",
      );
  
      const lockedRecommendation =
        await lockRecommendationById(
          client,
          recommendationId,
        );
  
      if (!lockedRecommendation) {
        throw new HttpError(
          404,
          "DISPATCH_RECOMMENDATION_NOT_FOUND",
          "The requested dispatch recommendation was not found.",
        );
      }
  
      if (
        lockedRecommendation.status ===
        "REJECTED"
      ) {
        await client.query(
          "COMMIT",
        );
  
        return {
          duplicate: true,
  
          recommendation:
            mapRecommendation(
              lockedRecommendation,
            ),
        };
      }
  
      if (
        lockedRecommendation.status !==
        "PENDING"
      ) {
        throw new HttpError(
          409,
          "RECOMMENDATION_NOT_PENDING",
          `The recommendation cannot be rejected because its status is ${lockedRecommendation.status}.`,
        );
      }
  
      await markRecommendationRejected(
        client,
        {
          recommendationId,
  
          userId:
            authenticatedUser.id,
  
          reason,
        },
      );
  
      await updateEmergencyStatus(
        client,
        {
          emergencyId:
            lockedRecommendation
              .emergency_id,
  
          status:
            "OPEN",
        },
      );
  
      const confirmationAlertKey =
        `dispatch-confirmation:${recommendationId}`;
  
      const resolvedAlertResult =
        await resolveAlertByDeduplicationKey(
          client,
          {
            deduplicationKey:
              confirmationAlertKey,
  
            resolvedByUserId:
              authenticatedUser.id,
          },
        );
  
      recommendation =
        await findRecommendationById(
          client,
          recommendationId,
        );
  
      emergency =
        await findEmergencyById(
          client,
          lockedRecommendation
            .emergency_id,
        );
  
      resolvedAlert =
        resolvedAlertResult
          ? await findAlertByDeduplicationKey(
              client,
              confirmationAlertKey,
            )
          : null;
  
      await client.query(
        "COMMIT",
      );
    } catch (error) {
      await client.query(
        "ROLLBACK",
      );
  
      throw error;
    } finally {
      client.release();
    }
  
    const mappedRecommendation =
      mapRecommendation(
        recommendation,
      );
  
    const mappedEmergency =
      mapEmergencyCase(
        emergency,
      );
  
    publishManagerEvent(
      "dispatch:recommendation-updated",
      mappedRecommendation,
    );
  
    publishManagerEvent(
      "emergency:updated",
      mappedEmergency,
    );
  
    if (resolvedAlert) {
      publishManagerEvent(
        "alert:updated",
        mapAlert(
          resolvedAlert,
        ),
      );
    }
  
    return {
      duplicate: false,
  
      recommendation:
        mappedRecommendation,
  
      emergencyCase:
        mappedEmergency,
    };
  }
  
  export async function getActiveDispatches(
    filters,
  ) {
    const client =
      await pool.connect();
  
    try {
      const rows =
        await listActiveDispatches(
          client,
          filters,
        );
  
      return rows.map(
        mapDispatch,
      );
    } finally {
      client.release();
    }
  }
  const dispatchLifecycleRules =
  Object.freeze({
    EN_ROUTE: {
      expectedCurrentStatus:
        "ASSIGNED",

      alertTitle:
        "Ambulance started route",

      createAlertMessage(
        dispatchNumber,
        ambulanceCode,
      ) {
        return `${ambulanceCode} started ${dispatchNumber} and is now en route.`;
      },
    },

    ARRIVED: {
      expectedCurrentStatus:
        "EN_ROUTE",

      alertTitle:
        "Ambulance arrived",

      createAlertMessage(
        dispatchNumber,
        ambulanceCode,
      ) {
        return `${ambulanceCode} arrived at the emergency for ${dispatchNumber}.`;
      },
    },

    COMPLETED: {
      expectedCurrentStatus:
        "ARRIVED",

      alertTitle:
        "Emergency dispatch completed",

      createAlertMessage(
        dispatchNumber,
        ambulanceCode,
      ) {
        return `${dispatchNumber} was completed by ${ambulanceCode}.`;
      },
    },
  });

/*
 * Applies one dispatch lifecycle transition inside one
 * PostgreSQL transaction.
 *
 * Supported transitions:
 *
 * ASSIGNED → EN_ROUTE
 * EN_ROUTE → ARRIVED
 * ARRIVED → COMPLETED
 */
export async function transitionAmbulanceDispatch(
  {
    dispatchId,
    eventId,
    targetStatus,
  },
  authenticatedUser,
) {
  const lifecycleRule =
    dispatchLifecycleRules[
      targetStatus
    ];

  if (!lifecycleRule) {
    throw new HttpError(
      400,
      "UNSUPPORTED_DISPATCH_TRANSITION",
      "The requested dispatch transition is not supported.",
    );
  }

  const client =
    await pool.connect();

  let dispatch;
  let emergency;
  let ambulanceStatus = null;
  let statusAlert = null;
  let resolvedAlerts = [];

  try {
    await client.query(
      "BEGIN",
    );

    /*
     * Idempotency check.
     *
     * The same eventId can safely be retried after a network
     * timeout without inserting another status event.
     */
    const existingStatusEvent =
      await findDispatchStatusEventByEventId(
        client,
        eventId,
      );

    if (existingStatusEvent) {
      if (
        String(
          existingStatusEvent
            .dispatch_id,
        ) !==
          String(dispatchId) ||
        existingStatusEvent.status !==
          targetStatus
      ) {
        throw new HttpError(
          409,
          "DISPATCH_EVENT_ID_CONFLICT",
          "The dispatch transition event ID was already used for another transition.",
        );
      }

      dispatch =
        await findDispatchById(
          client,
          dispatchId,
        );

      await client.query(
        "COMMIT",
      );

      return {
        duplicate: true,

        dispatch:
          mapDispatch(
            dispatch,
          ),

        emergencyCase: null,

        ambulanceStatus: null,
      };
    }

    const lockedDispatch =
      await lockDispatchForTransition(
        client,
        dispatchId,
      );

    if (!lockedDispatch) {
      throw new HttpError(
        404,
        "DISPATCH_NOT_FOUND",
        "The requested ambulance dispatch was not found.",
      );
    }

    /*
     * Repeating a command with a new event ID after the state
     * was already applied does not create another event.
     */
    if (
      lockedDispatch
        .dispatch_status ===
      targetStatus
    ) {
      dispatch =
        await findDispatchById(
          client,
          dispatchId,
        );

      await client.query(
        "COMMIT",
      );

      return {
        duplicate: true,

        dispatch:
          mapDispatch(
            dispatch,
          ),

        emergencyCase: null,

        ambulanceStatus: null,
      };
    }

    if (
      lockedDispatch
        .dispatch_status !==
      lifecycleRule
        .expectedCurrentStatus
    ) {
      throw new HttpError(
        409,
        "INVALID_DISPATCH_TRANSITION",
        `The dispatch cannot move from ${lockedDispatch.dispatch_status} to ${targetStatus}.`,
        {
          currentStatus:
            lockedDispatch
              .dispatch_status,

          requiredStatus:
            lifecycleRule
              .expectedCurrentStatus,

          targetStatus,
        },
      );
    }

    /*
     * The emergency and ambulance must remain assigned to this
     * active operation throughout the lifecycle.
     */
    if (
      lockedDispatch
        .emergency_status !==
      "DISPATCHED"
    ) {
      throw new HttpError(
        409,
        "EMERGENCY_NOT_DISPATCHED",
        "The emergency case is no longer in the DISPATCHED state.",
      );
    }

    if (
      lockedDispatch
        .ambulance_status !==
      "BUSY"
    ) {
      throw new HttpError(
        409,
        "AMBULANCE_NOT_BUSY",
        "The assigned ambulance is no longer marked as BUSY.",
      );
    }

    const updatedDispatch =
      await updateDispatchLifecycleStatus(
        client,
        {
          dispatchId,

          targetStatus,
        },
      );

    if (!updatedDispatch) {
      throw new HttpError(
        409,
        "DISPATCH_STATE_CHANGED",
        "The dispatch state changed before the transition could be applied.",
      );
    }

    /*
     * The client-provided eventId becomes the immutable
     * dispatch status event identifier.
     */
    await insertDispatchStatusEvent(
      client,
      {
        eventId,

        dispatchId,

        status:
          targetStatus,

        changedByUserId:
          authenticatedUser.id,

        payload: {
          source:
            "HEALTH_MANAGER_ACTION",

          previousStatus:
            lifecycleRule
              .expectedCurrentStatus,

          targetStatus,
        },
      },
    );

    /*
     * Final operation:
     *
     * - Resolve the emergency.
     * - Return the ambulance to AVAILABLE.
     * - Resolve previous alerts for the emergency.
     */
    if (
      targetStatus ===
      "COMPLETED"
    ) {
      const resolvedEmergency =
        await resolveEmergencyCase(
          client,
          lockedDispatch
            .emergency_id,
        );

      if (!resolvedEmergency) {
        throw new HttpError(
          409,
          "EMERGENCY_COMPLETION_FAILED",
          "The emergency case could not be resolved from its current state.",
        );
      }

      ambulanceStatus =
        await updateAmbulanceStatus(
          client,
          {
            ambulanceId:
              lockedDispatch
                .ambulance_id,

            status:
              "AVAILABLE",
          },
        );

      if (!ambulanceStatus) {
        throw new HttpError(
          409,
          "AMBULANCE_RELEASE_FAILED",
          "The ambulance could not be returned to the AVAILABLE state.",
        );
      }

      const resolvedAlertIds =
        await resolveActiveAlertsForEmergency(
          client,
          {
            emergencyId:
              lockedDispatch
                .emergency_id,

            resolvedByUserId:
              authenticatedUser.id,
          },
        );

      for (
        const resolvedAlertReference of
        resolvedAlertIds
      ) {
        const resolvedAlert =
          await findAlertById(
            client,
            resolvedAlertReference.id,
          );

        if (resolvedAlert) {
          resolvedAlerts.push(
            resolvedAlert,
          );
        }
      }
    }

    /*
     * Create one alert for the new dispatch status.
     *
     * The deduplication key ensures that each lifecycle status
     * has only one alert for the dispatch.
     */
    const statusAlertKey =
      `dispatch-status:${dispatchId}:${targetStatus}`;

    await insertAlert(
      client,
      {
        eventId:
          randomUUID(),

        deduplicationKey:
          statusAlertKey,

        emergencyCaseId:
          lockedDispatch
            .emergency_id,

        ambulanceId:
          lockedDispatch
            .ambulance_id,

        alertType:
          "DISPATCH_STATUS_CHANGED",

        title:
          lifecycleRule
            .alertTitle,

        message:
          lifecycleRule
            .createAlertMessage(
              lockedDispatch
                .dispatch_number,

              lockedDispatch
                .ambulance_code,
            ),

        payload: {
          dispatchId:
            String(dispatchId),

          dispatchNumber:
            lockedDispatch
              .dispatch_number,

          previousStatus:
            lifecycleRule
              .expectedCurrentStatus,

          status:
            targetStatus,
        },
      },
    );

    dispatch =
      await findDispatchById(
        client,
        dispatchId,
      );

    statusAlert =
      await findAlertByDeduplicationKey(
        client,
        statusAlertKey,
      );

    if (
      targetStatus ===
      "COMPLETED"
    ) {
      emergency =
        await findEmergencyById(
          client,
          lockedDispatch
            .emergency_id,
        );
    }

    await client.query(
      "COMMIT",
    );
  } catch (error) {
    await client.query(
      "ROLLBACK",
    );

    throw error;
  } finally {
    client.release();
  }

  const mappedDispatch =
    mapDispatch(
      dispatch,
    );

  const mappedEmergency =
    mapEmergencyCase(
      emergency,
    );

  const mappedStatusAlert =
    mapAlert(
      statusAlert,
    );

  /*
   * Broadcast only after PostgreSQL COMMIT succeeds.
   *
   * Socket.IO serializes normal JavaScript objects when they
   * are emitted; manual JSON.stringify is unnecessary.
   */
  publishManagerEvent(
    "dispatch:status-updated",
    mappedDispatch,
  );

  if (mappedStatusAlert) {
    publishManagerEvent(
      "alert:created",
      mappedStatusAlert,
    );
  }

  for (
    const resolvedAlert of
    resolvedAlerts
  ) {
    publishManagerEvent(
      "alert:updated",
      mapAlert(
        resolvedAlert,
      ),
    );
  }

  if (
    targetStatus ===
    "COMPLETED"
  ) {
    publishManagerEvent(
      "emergency:updated",
      mappedEmergency,
    );

    publishManagerEvent(
      "ambulance:status-updated",
      {
        ambulanceId:
          ambulanceStatus.id,

        code:
          ambulanceStatus.code,

        status:
          ambulanceStatus.status,

        isOperational:
          ambulanceStatus
            .is_operational,

        dispatchId:
          mappedDispatch.id,

        updatedAt:
          ambulanceStatus
            .updated_at,
      },
    );
  }

  return {
    duplicate: false,

    dispatch:
      mappedDispatch,

    emergencyCase:
      mappedEmergency,

    ambulanceStatus:
      ambulanceStatus
        ? {
            id:
              ambulanceStatus.id,

            code:
              ambulanceStatus.code,

            status:
              ambulanceStatus.status,

            isOperational:
              ambulanceStatus
                .is_operational,

            updatedAt:
              ambulanceStatus
                .updated_at,
          }
        : null,
  };
}