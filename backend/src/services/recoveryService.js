import {
    pool,
  } from "../config/databasePool.js";
  
  import {
    listAmbulanceLocationRecoveryEvents,
    listFacilityOccupancyRecoveryEvents,
  } from "../repositories/recoveryRepository.js";
  
  function normalizeCheckpoints(
    checkpoints,
  ) {
    const sequenceByResourceId =
      new Map();
  
    for (
      const checkpoint of
      checkpoints
    ) {
      const resourceId =
        String(
          checkpoint.resourceId,
        );
  
      const sequenceNumber =
        Number(
          checkpoint.sequenceNumber,
        );
  
      const existingSequence =
        sequenceByResourceId.get(
          resourceId,
        ) ?? 0;
  
      sequenceByResourceId.set(
        resourceId,
        Math.max(
          existingSequence,
          sequenceNumber,
        ),
      );
    }
  
    return Array.from(
      sequenceByResourceId,
      (
        [
          resourceId,
          sequenceNumber,
        ],
      ) => ({
        resourceId,
        sequenceNumber,
      }),
    );
  }
  
  function toIsoString(
    value,
  ) {
    return value instanceof Date
      ? value.toISOString()
      : new Date(
          value,
        ).toISOString();
  }
  
  function mapFacilityOccupancyEvent(
    row,
  ) {
    return {
      eventId:
        row.event_id,
  
      facilityId:
        row.facility_id,
  
      sourceDeviceId:
        row.source_device_id,
  
      sequenceNumber:
        Number(
          row.sequence_number,
        ),
  
      totalBeds:
        Number(
          row.total_beds,
        ),
  
      occupiedBeds:
        Number(
          row.occupied_beds,
        ),
  
      availableBeds:
        Number(
          row.available_beds,
        ),
  
      occupancyPercentage:
        Number(
          row.occupancy_percentage,
        ),
  
      status:
        row.status,
  
      recordedAt:
        toIsoString(
          row.recorded_at,
        ),
  
      receivedAt:
        toIsoString(
          row.received_at,
        ),
    };
  }
  
  function mapAmbulanceLocationEvent(
    row,
  ) {
    return {
      eventId:
        row.event_id,
  
      ambulanceId:
        row.ambulance_id,
  
      deviceId:
        row.device_id,
  
      sequenceNumber:
        Number(
          row.sequence_number,
        ),
  
      longitude:
        Number(
          row.longitude,
        ),
  
      latitude:
        Number(
          row.latitude,
        ),
  
      speedKmh:
        row.speed_kmh ===
        null
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
        toIsoString(
          row.recorded_at,
        ),
  
      receivedAt:
        toIsoString(
          row.received_at,
        ),
  
      currentStateUpdated:
        true,
  
      status:
        row.ambulance_status,
  
      isOperational:
        row.is_operational,
    };
  }
  
  export async function recoverLiveOperationsReadings({
    facilityCheckpoints,
    ambulanceCheckpoints,
    limitPerResource,
  }) {
    const client =
      await pool.connect();
  
    try {
      const normalizedFacilityCheckpoints =
        normalizeCheckpoints(
          facilityCheckpoints,
        );
  
      const normalizedAmbulanceCheckpoints =
        normalizeCheckpoints(
          ambulanceCheckpoints,
        );
  
      const facilityRows =
        await listFacilityOccupancyRecoveryEvents(
          client,
          {
            checkpoints:
              normalizedFacilityCheckpoints,
  
            limitPerResource,
          },
        );
  
      const ambulanceRows =
        await listAmbulanceLocationRecoveryEvents(
          client,
          {
            checkpoints:
              normalizedAmbulanceCheckpoints,
  
            limitPerResource,
          },
        );
  
      return {
        generatedAt:
          new Date()
            .toISOString(),
  
        facility: {
          count:
            facilityRows.length,
  
          hasMore:
            facilityRows.some(
              (row) =>
                row
                  .has_more_for_resource,
            ),
  
          events:
            facilityRows.map(
              mapFacilityOccupancyEvent,
            ),
        },
  
        ambulance: {
          count:
            ambulanceRows.length,
  
          hasMore:
            ambulanceRows.some(
              (row) =>
                row
                  .has_more_for_resource,
            ),
  
          events:
            ambulanceRows.map(
              mapAmbulanceLocationEvent,
            ),
        },
      };
    } finally {
      client.release();
    }
  }