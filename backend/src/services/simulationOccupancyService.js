import {
    randomInt,
    randomUUID,
  } from "node:crypto";
  
  import {
    pool,
  } from "../config/databasePool.js";
  
  import {
    getSocketServer,
  } from "../config/socket.js";
  
  import {
    insertSimulationOccupancyEvent,
    selectFacilitiesForOccupancySimulation,
    upsertSimulationCurrentOccupancy,
  } from "../repositories/simulationOccupancyRepository.js";
  
  const GENERATOR_VERSION =
    "1.0.0";
  
  function clamp(
    value,
    minimum,
    maximum,
  ) {
    return Math.min(
      maximum,
      Math.max(
        minimum,
        value,
      ),
    );
  }
  
  function createInitialOccupiedBeds(
    totalBeds,
  ) {
    /*
     * The first generated value is between 50% and 85%.
     */
    const minimum =
      Math.round(
        totalBeds * 0.5,
      );
  
    const maximum =
      Math.max(
        minimum + 1,
        Math.round(
          totalBeds * 0.85,
        ),
      );
  
    return randomInt(
      minimum,
      Math.min(
        totalBeds,
        maximum,
      ) + 1,
    );
  }
  
  function createNextOccupiedBeds({
    totalBeds,
    currentOccupiedBeds,
  }) {
    const safeCurrentOccupiedBeds =
      Number.isInteger(
        currentOccupiedBeds,
      )
        ? clamp(
            currentOccupiedBeds,
            0,
            totalBeds,
          )
        : createInitialOccupiedBeds(
            totalBeds,
          );
  
    const currentPercentage =
      totalBeds > 0
        ? (
            safeCurrentOccupiedBeds /
            totalBeds
          ) * 100
        : 0;
  
    /*
     * Each cycle changes at most approximately 3% of beds.
     */
    const maximumNormalChange =
      Math.max(
        1,
        Math.round(
          totalBeds * 0.03,
        ),
      );
  
    let delta =
      randomInt(
        -maximumNormalChange,
        maximumNormalChange + 1,
      );
  
    /*
     * Avoid a completely static reading.
     */
    if (delta === 0) {
      delta =
        randomInt(
          0,
          2,
        ) === 0
          ? -1
          : 1;
    }
  
    /*
     * When occupancy is already very high, make downward
     * movement more likely so the value does not remain at 100%.
     */
    if (
      currentPercentage >= 97 &&
      delta > 0
    ) {
      delta =
        -Math.max(
          1,
          delta,
        );
    }
  
    /*
     * When occupancy is very low, make upward movement more
     * likely so the value does not remain close to zero.
     */
    if (
      currentPercentage <= 30 &&
      delta < 0
    ) {
      delta =
        Math.max(
          1,
          Math.abs(
            delta,
          ),
        );
    }
  
    /*
     * Small probability of a temporary capacity pressure event.
     */
    const shouldCreatePressure =
      randomInt(
        0,
        100,
      ) < 8;
  
    if (shouldCreatePressure) {
      delta +=
        Math.max(
          1,
          Math.round(
            totalBeds * 0.04,
          ),
        );
    }
  
    const nextOccupiedBeds =
      clamp(
        safeCurrentOccupiedBeds +
          delta,
        0,
        totalBeds,
      );
  
    return {
      previousOccupiedBeds:
        safeCurrentOccupiedBeds,
  
      occupiedBeds:
        nextOccupiedBeds,
  
      appliedDelta:
        nextOccupiedBeds -
        safeCurrentOccupiedBeds,
  
      pressureScenario:
        shouldCreatePressure,
    };
  }
  
  function toIsoString(
    value,
  ) {
    if (
      value instanceof Date
    ) {
      return value.toISOString();
    }
  
    return new Date(
      value,
    ).toISOString();
  }
  
  function mapSocketEvent(
    event,
  ) {
    return {
      eventId:
        event.event_id,
  
      facilityId:
        event.facility_id,
  
      sourceDeviceId:
        event.source_device_id,
  
      sequenceNumber:
        Number(
          event.sequence_number,
        ),
  
      totalBeds:
        Number(
          event.total_beds,
        ),
  
      occupiedBeds:
        Number(
          event.occupied_beds,
        ),
  
      availableBeds:
        Number(
          event.available_beds,
        ),
  
      occupancyPercentage:
        Number(
          event.occupancy_percentage,
        ),
  
      status:
        event.status,
  
      recordedAt:
        toIsoString(
          event.recorded_at,
        ),
  
      receivedAt:
        toIsoString(
          event.received_at,
        ),
    };
  }
  
  export async function generateFacilityOccupancyReadings({
    simulationRunId,
    tickCount,
  }) {
    const client =
      await pool.connect();
  
    const committedEvents = [];
  
    try {
      await client.query(
        "BEGIN",
      );
  
      const facilities =
        await selectFacilitiesForOccupancySimulation(
          client,
        );
  
      const recordedAt =
        new Date()
          .toISOString();
  
      for (
        const facility of
        facilities
      ) {
        const totalBeds =
          Number(
            facility.total_beds,
          );
  
        const occupancyChange =
          createNextOccupiedBeds({
            totalBeds,
  
            currentOccupiedBeds:
              facility
                .current_occupied_beds ===
                null
                ? null
                : Number(
                    facility
                      .current_occupied_beds,
                  ),
          });
  
        const sequenceNumber =
          Number(
            facility
              .max_sequence_number ??
            0,
          ) + 1;
  
        const sourceDeviceId =
          `simulation-facility-${facility.facility_id}`;
  
        const payload = {
          source:
            "simulation",
  
          generator:
            "facility-occupancy",
  
          generatorVersion:
            GENERATOR_VERSION,
  
          simulationRunId:
            String(
              simulationRunId,
            ),
  
          simulationTick:
            Number(
              tickCount,
            ),
  
          facilityName:
            facility.facility_name,
  
          governorateId:
            facility.governorate_id,
  
          governorateName:
            facility.governorate_name,
  
          previousOccupiedBeds:
            occupancyChange
              .previousOccupiedBeds,
  
          appliedDelta:
            occupancyChange
              .appliedDelta,
  
          pressureScenario:
            occupancyChange
              .pressureScenario,
        };
  
        const insertedEvent =
          await insertSimulationOccupancyEvent(
            client,
            {
              eventId:
                randomUUID(),
  
              facilityId:
                facility.facility_id,
  
              sourceDeviceId,
  
              sequenceNumber,
  
              totalBeds,
  
              occupiedBeds:
                occupancyChange
                  .occupiedBeds,
  
              recordedAt,
  
              payload,
            },
          );
  
        const updatedCurrent =
          await upsertSimulationCurrentOccupancy(
            client,
            insertedEvent,
          );
  
        if (!updatedCurrent) {
          throw new Error(
            `Current occupancy was not updated for facility ${facility.facility_id}.`,
          );
        }
  
        committedEvents.push(
          insertedEvent,
        );
      }
  
      await client.query(
        "COMMIT",
      );
    } catch (error) {
      try {
        await client.query(
          "ROLLBACK",
        );
      } catch {
        // The transaction may already be closed.
      }
  
      throw error;
    } finally {
      client.release();
    }
  
    /*
     * Broadcast only after COMMIT.
     *
     * This prevents the browser from seeing data that was not
     * successfully saved in PostgreSQL.
     */
    const io =
      getSocketServer();
  
    const socketEvents =
      committedEvents.map(
        mapSocketEvent,
      );
    
      console.log(
        [
          "Broadcasting facility occupancy events",
          `clients=${io.engine.clientsCount}`,
          `events=${socketEvents.length}`,
        ].join(" | "),
      );
  
      for (
        const socketEvent of
        socketEvents
      ) {
        console.log(
          [
            "Facility occupancy Socket emit",
            `facility=${socketEvent.facilityId}`,
            `sequence=${socketEvent.sequenceNumber}`,
            `availableBeds=${socketEvent.availableBeds}`,
            `status=${socketEvent.status}`,
          ].join(" | "),
        );
      
        io.emit(
          "facility:occupancy-updated",
          socketEvent,
        );
      }
  
    return {
      generatedCount:
        socketEvents.length,
  
      events:
        socketEvents,
    };
  }