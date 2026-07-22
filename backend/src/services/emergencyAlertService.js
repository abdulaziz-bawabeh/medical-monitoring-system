import {
    randomUUID,
  } from "node:crypto";
  
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
    acknowledgeOpenAlert,
    findAlertByDeduplicationKey,
    findAlertById,
    findEmergencyCaseByEventId,
    findGovernorateCoveringPoint,
    generateEmergencyCaseNumber,
    insertAlert,
    insertEmergencyCase,
    listActiveEmergencyCases,
    listAlerts,
  } from "../repositories/emergencyAlertRepository.js";
  
  const MAXIMUM_FUTURE_CLOCK_DRIFT_MS =
    60 * 1000;
  
  function validateReportedTime(
    reportedAt,
  ) {
    const reportedTime =
      new Date(
        reportedAt,
      ).getTime();
  
    if (
      reportedTime >
      Date.now() +
        MAXIMUM_FUTURE_CLOCK_DRIFT_MS
    ) {
      throw new HttpError(
        400,
        "REPORTED_AT_IN_FUTURE",
        "The emergency report time is too far in the future.",
      );
    }
  }
  
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
          row.longitude,
  
        latitude:
          row.latitude,
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
        undefined,
  
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
  
  /*
   * Database changes remain successful even if a temporary
   * Socket.IO broadcast fails.
   */
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
  
  export async function createEmergencyCase(
    input,
    authenticatedUser,
  ) {
    validateReportedTime(
      input.reportedAt,
    );
  
    const client =
      await pool.connect();
  
    let newEmergencyCreated =
      false;
  
    let newAlertCreated =
      false;
  
    let emergencyCase;
    let alert;
  
    try {
      await client.query(
        "BEGIN",
      );
  
      const existingEmergency =
        await findEmergencyCaseByEventId(
          client,
          input.eventId,
        );
  
      const alertDeduplicationKey =
        `emergency-created:${input.eventId}`;
  
      if (existingEmergency) {
        alert =
          await findAlertByDeduplicationKey(
            client,
            alertDeduplicationKey,
          );
  
        await client.query(
          "COMMIT",
        );
  
        return {
          duplicate: true,
  
          emergencyCase:
            mapEmergencyCase(
              existingEmergency,
            ),
  
          alert:
            mapAlert(alert),
        };
      }
  
      const governorate =
        await findGovernorateCoveringPoint(
          client,
          input.longitude,
          input.latitude,
        );
  
      if (!governorate) {
        throw new HttpError(
          400,
          "EMERGENCY_LOCATION_OUTSIDE_SUPPORTED_AREA",
          "The emergency location is outside the supported Syrian governorate boundaries.",
        );
      }
  
      const caseNumber =
        await generateEmergencyCaseNumber(
          client,
          input.reportedAt,
        );
  
      const insertedEmergency =
        await insertEmergencyCase(
          client,
          {
            eventId:
              input.eventId,
  
            caseNumber,
  
            createdByUserId:
              authenticatedUser.id,
  
            governorateId:
              governorate.id,
  
            summary:
              input.summary,
  
            longitude:
              input.longitude,
  
            latitude:
              input.latitude,
  
            reportedAt:
              input.reportedAt,
  
            payload:
              input.payload,
          },
        );
  
      /*
       * A concurrent request may have inserted the same event.
       */
      if (!insertedEmergency) {
        emergencyCase =
          await findEmergencyCaseByEventId(
            client,
            input.eventId,
          );
  
        alert =
          await findAlertByDeduplicationKey(
            client,
            alertDeduplicationKey,
          );
  
        await client.query(
          "COMMIT",
        );
  
        return {
          duplicate: true,
  
          emergencyCase:
            mapEmergencyCase(
              emergencyCase,
            ),
  
          alert:
            mapAlert(alert),
        };
      }
  
      emergencyCase =
        await findEmergencyCaseByEventId(
          client,
          input.eventId,
        );
  
      newEmergencyCreated =
        true;
  
      const insertedAlert =
        await insertAlert(
          client,
          {
            eventId:
              randomUUID(),
  
            deduplicationKey:
              alertDeduplicationKey,
  
            emergencyCaseId:
              emergencyCase.id,
  
            alertType:
              "EMERGENCY_CASE_CREATED",
  
            title:
              "New emergency case",
  
            message:
              `${emergencyCase.case_number} requires operational review.`,
  
            payload: {
              governorateId:
                governorate.id,
  
              governorateName:
                governorate.name,
  
              emergencyEventId:
                input.eventId,
            },
          },
        );
  
      newAlertCreated =
        Boolean(
          insertedAlert,
        );
  
      alert =
        await findAlertByDeduplicationKey(
          client,
          alertDeduplicationKey,
        );
  
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
  
    const mappedEmergency =
      mapEmergencyCase(
        emergencyCase,
      );
  
    const mappedAlert =
      mapAlert(alert);
  
    /*
     * Publish only after PostgreSQL committed successfully.
     */
    if (
      newEmergencyCreated
    ) {
      publishManagerEvent(
        "emergency:created",
        mappedEmergency,
      );
    }
  
    if (newAlertCreated) {
      publishManagerEvent(
        "alert:created",
        mappedAlert,
      );
    }
  
    return {
      duplicate: false,
  
      emergencyCase:
        mappedEmergency,
  
      alert:
        mappedAlert,
    };
  }
  
  export async function getActiveEmergencyCases(
    filters,
  ) {
    const client =
      await pool.connect();
  
    try {
      const rows =
        await listActiveEmergencyCases(
          client,
          filters,
        );
  
      return rows.map(
        mapEmergencyCase,
      );
    } finally {
      client.release();
    }
  }
  
  export async function getAlerts(
    filters,
  ) {
    const client =
      await pool.connect();
  
    try {
      const rows =
        await listAlerts(
          client,
          filters,
        );
  
      return rows.map(
        mapAlert,
      );
    } finally {
      client.release();
    }
  }
  
  export async function acknowledgeAlert(
    alertId,
    authenticatedUser,
  ) {
    const client =
      await pool.connect();
  
    let updatedAlert;
    let changed = false;
  
    try {
      await client.query(
        "BEGIN",
      );
  
      const existingAlert =
        await findAlertById(
          client,
          alertId,
        );
  
      if (!existingAlert) {
        throw new HttpError(
          404,
          "ALERT_NOT_FOUND",
          "The requested alert was not found.",
        );
      }
  
      /*
       * The action is idempotent.
       *
       * Repeating acknowledgement does not replace the original
       * manager or acknowledgement time.
       */
      if (
        existingAlert.status !==
        "OPEN"
      ) {
        await client.query(
          "COMMIT",
        );
  
        return {
          changed: false,
  
          alert:
            mapAlert(
              existingAlert,
            ),
        };
      }
  
      const updateResult =
        await acknowledgeOpenAlert(
          client,
          {
            alertId,
  
            userId:
              authenticatedUser.id,
          },
        );
  
      if (!updateResult) {
        throw new HttpError(
          409,
          "ALERT_STATE_CHANGED",
          "The alert state changed before it could be acknowledged.",
        );
      }
  
      updatedAlert =
        await findAlertById(
          client,
          alertId,
        );
  
      changed = true;
  
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
  
    const mappedAlert =
      mapAlert(
        updatedAlert,
      );
  
    if (changed) {
      publishManagerEvent(
        "alert:updated",
        mappedAlert,
      );
    }
  
    return {
      changed,
  
      alert:
        mappedAlert,
    };
  }