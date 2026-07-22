import { pool } from "../config/databasePool.js";
import { getSocketServer } from "../config/socket.js";

import { HttpError } from "../utils/httpError.js";

import {
  findAmbulanceByDeviceId,
  findAmbulanceLocationEventByIdentity,
  findCurrentFacilityOccupancy,
  findFacilityByCode,
  findFacilityOccupancyEventByIdentity,
  insertAmbulanceLocationEvent,
  insertFacilityOccupancyEvent,
  updateAmbulanceCurrentLocation,
  upsertCurrentFacilityOccupancy,
} from "../repositories/liveMonitoringRepository.js";

const MAXIMUM_FUTURE_CLOCK_DRIFT_MS =
  60 * 1000;

function ensureTimestampIsAcceptable(
  recordedAt,
) {
  const recordedTime =
    new Date(recordedAt).getTime();

  if (
    recordedTime >
    Date.now() +
      MAXIMUM_FUTURE_CLOCK_DRIFT_MS
  ) {
    throw new HttpError(
      400,
      "RECORDED_AT_IN_FUTURE",
      "The recorded time is too far in the future.",
    );
  }
}

function mapFacilityOccupancyEvent(
  event,
) {
  if (!event) {
    return null;
  }

  return {
    id: event.id,
    eventId: event.event_id,
    facilityId: event.facility_id,
    sourceDeviceId:
      event.source_device_id,
    sequenceNumber:
      event.sequence_number,
    totalBeds: event.total_beds,
    occupiedBeds:
      event.occupied_beds,
    availableBeds:
      event.available_beds,
    occupancyPercentage:
      event.occupancy_percentage,
    status: event.status,
    recordedAt:
      event.recorded_at,
    receivedAt:
      event.received_at,
    payload: event.payload,
  };
}

function mapAmbulanceLocationEvent(
  event,
) {
  if (!event) {
    return null;
  }

  return {
    id: event.id,
    eventId: event.event_id,
    ambulanceId:
      event.ambulance_id,
    deviceId: event.device_id,
    sequenceNumber:
      event.sequence_number,
    longitude: event.longitude,
    latitude: event.latitude,
    speedKmh: event.speed_kmh,
    headingDegrees:
      event.heading_degrees,
    recordedAt:
      event.recorded_at,
    receivedAt:
      event.received_at,
    payload: event.payload,
  };
}

function publishLiveEvent(
  eventName,
  payload,
) {
  try {
    const io = getSocketServer();

    io
      .to("role:health_manager")
      .emit(
        eventName,
        payload,
      );
  } catch (error) {
    /*
     * Database persistence has already succeeded.
     * A temporary Socket problem must not undo stored data.
     */
    console.error(
      `Failed to publish ${eventName}:`,
      error.message,
    );
  }
}

export async function processFacilityOccupancyEvent(
  input,
) {
  ensureTimestampIsAcceptable(
    input.recordedAt,
  );

  const client =
    await pool.connect();

  let response;

  try {
    await client.query("BEGIN");

    const facility =
      await findFacilityByCode(
        client,
        input.facilityCode,
      );

    if (!facility) {
      throw new HttpError(
        404,
        "FACILITY_NOT_FOUND",
        "The requested medical facility was not found.",
      );
    }

    if (!facility.is_operational) {
      throw new HttpError(
        409,
        "FACILITY_NOT_OPERATIONAL",
        "Occupancy readings cannot be accepted for a non-operational facility.",
      );
    }

    if (
      input.occupiedBeds >
      facility.total_beds
    ) {
      throw new HttpError(
        400,
        "OCCUPIED_BEDS_EXCEED_CAPACITY",
        "Occupied beds cannot exceed the facility capacity.",
        {
          totalBeds:
            facility.total_beds,
          occupiedBeds:
            input.occupiedBeds,
        },
      );
    }

    const previousCurrentState =
      await findCurrentFacilityOccupancy(
        client,
        facility.id,
      );

    const insertedEvent =
      await insertFacilityOccupancyEvent(
        client,
        {
          eventId: input.eventId,
          facilityId: facility.id,
          sourceDeviceId:
            input.sourceDeviceId,
          sequenceNumber:
            input.sequenceNumber,
          totalBeds:
            facility.total_beds,
          occupiedBeds:
            input.occupiedBeds,
          recordedAt:
            input.recordedAt,
          payload: input.payload,
        },
      );

    if (!insertedEvent) {
      const existingEvent =
        await findFacilityOccupancyEventByIdentity(
          client,
          {
            eventId:
              input.eventId,
            sourceDeviceId:
              input.sourceDeviceId,
            sequenceNumber:
              input.sequenceNumber,
          },
        );

      await client.query("COMMIT");

      return {
        duplicate: true,
        currentStateUpdated: false,
        event:
          mapFacilityOccupancyEvent(
            existingEvent,
          ),
      };
    }

    const currentState =
      await upsertCurrentFacilityOccupancy(
        client,
        insertedEvent,
      );

    await client.query("COMMIT");

    response = {
      duplicate: false,
      currentStateUpdated:
        Boolean(currentState),
      event:
        mapFacilityOccupancyEvent(
          insertedEvent,
        ),
    };

    publishLiveEvent(
      "facility:occupancy-updated",
      {
        ...response.event,
        facilityCode:
          facility.code,
        facilityName:
          facility.name,
        governorateId:
          facility.governorate_id,
        currentStateUpdated:
          response.currentStateUpdated,
      },
    );

    if (
      currentState &&
      previousCurrentState?.status !==
        currentState.status
    ) {
      publishLiveEvent(
        "facility:status-changed",
        {
          facilityId:
            facility.id,
          facilityCode:
            facility.code,
          facilityName:
            facility.name,
          previousStatus:
            previousCurrentState?.status ??
            null,
          status:
            currentState.status,
          occupancyPercentage:
            currentState.occupancy_percentage,
          changedAt:
            currentState.recorded_at,
        },
      );
    }

    return response;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function processAmbulanceLocationEvent(
  input,
) {
  ensureTimestampIsAcceptable(
    input.recordedAt,
  );

  const client =
    await pool.connect();

  try {
    await client.query("BEGIN");

    const ambulance =
      await findAmbulanceByDeviceId(
        client,
        input.deviceId,
      );

    if (!ambulance) {
      throw new HttpError(
        404,
        "AMBULANCE_DEVICE_NOT_FOUND",
        "No ambulance is registered for the supplied device ID.",
      );
    }

    const insertedEvent =
      await insertAmbulanceLocationEvent(
        client,
        {
          eventId: input.eventId,
          ambulanceId:
            ambulance.id,
          deviceId:
            input.deviceId,
          sequenceNumber:
            input.sequenceNumber,
          longitude:
            input.longitude,
          latitude:
            input.latitude,
          speedKmh:
            input.speedKmh,
          headingDegrees:
            input.headingDegrees,
          recordedAt:
            input.recordedAt,
          payload:
            input.payload,
        },
      );

    if (!insertedEvent) {
      const existingEvent =
        await findAmbulanceLocationEventByIdentity(
          client,
          {
            eventId:
              input.eventId,
            deviceId:
              input.deviceId,
            sequenceNumber:
              input.sequenceNumber,
          },
        );

      await client.query("COMMIT");

      return {
        duplicate: true,
        currentStateUpdated: false,
        event:
          mapAmbulanceLocationEvent(
            existingEvent,
          ),
      };
    }

    const currentAmbulance =
      await updateAmbulanceCurrentLocation(
        client,
        {
          ambulanceId:
            ambulance.id,
          longitude:
            input.longitude,
          latitude:
            input.latitude,
          sequenceNumber:
            input.sequenceNumber,
          recordedAt:
            input.recordedAt,
        },
      );

    await client.query("COMMIT");

    const response = {
      duplicate: false,
      currentStateUpdated:
        Boolean(currentAmbulance),
      event:
        mapAmbulanceLocationEvent(
          insertedEvent,
        ),
    };

    publishLiveEvent(
      "ambulance:location-updated",
      {
        ...response.event,
        ambulanceCode:
          ambulance.code,
        status:
          ambulance.status,
        isOperational:
          ambulance.is_operational,
        governorateId:
          ambulance.assigned_governorate_id,
        currentStateUpdated:
          response.currentStateUpdated,
      },
    );

    return response;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}