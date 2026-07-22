function serializeCheckpoints(
    checkpoints,
  ) {
    return JSON.stringify(
      checkpoints.map(
        (checkpoint) => ({
          resource_id:
            String(
              checkpoint.resourceId,
            ),
  
          sequence_number:
            Number(
              checkpoint.sequenceNumber,
            ),
        }),
      ),
    );
  }
  
  export async function listFacilityOccupancyRecoveryEvents(
    client,
    {
      checkpoints,
      limitPerResource,
    },
  ) {
    if (
      checkpoints.length ===
      0
    ) {
      return [];
    }
  
    const result =
      await client.query(
        `
          WITH checkpoints AS (
            SELECT
              checkpoint.resource_id
                ::BIGINT
                AS resource_id,
  
              checkpoint.sequence_number
                ::BIGINT
                AS sequence_number
  
            FROM JSONB_TO_RECORDSET(
              $1::JSONB
            ) AS checkpoint(
              resource_id TEXT,
              sequence_number BIGINT
            )
          ),
  
          ranked_events AS (
            SELECT
              occupancy_event.id::TEXT
                AS id,
  
              occupancy_event.event_id::TEXT
                AS event_id,
  
              occupancy_event.facility_id::TEXT
                AS facility_id,
  
              occupancy_event.source_device_id,
  
              occupancy_event.sequence_number,
  
              occupancy_event.total_beds,
  
              occupancy_event.occupied_beds,
  
              occupancy_event.available_beds,
  
              occupancy_event
                .occupancy_percentage
                ::DOUBLE PRECISION
                AS occupancy_percentage,
  
              occupancy_event.status,
  
              occupancy_event.recorded_at,
  
              occupancy_event.received_at,
  
              occupancy_event.payload,
  
              ROW_NUMBER() OVER (
                PARTITION BY
                  occupancy_event.facility_id
  
                ORDER BY
                  occupancy_event
                    .sequence_number ASC
              ) AS recovery_row_number,
  
              COUNT(*) OVER (
                PARTITION BY
                  occupancy_event.facility_id
              ) AS total_after_checkpoint
  
            FROM public.facility_occupancy_events
              AS occupancy_event
  
            JOIN checkpoints
              ON checkpoints.resource_id =
                 occupancy_event.facility_id
  
            WHERE
              occupancy_event.sequence_number >
              checkpoints.sequence_number
          )
  
          SELECT
            id,
            event_id,
            facility_id,
            source_device_id,
            sequence_number,
            total_beds,
            occupied_beds,
            available_beds,
            occupancy_percentage,
            status,
            recorded_at,
            received_at,
            payload,
  
            (
              total_after_checkpoint >
              $2::INTEGER
            ) AS has_more_for_resource
  
          FROM ranked_events
  
          WHERE
            recovery_row_number <=
            $2::INTEGER
  
          ORDER BY
            facility_id::BIGINT ASC,
            sequence_number ASC;
        `,
        [
          serializeCheckpoints(
            checkpoints,
          ),
  
          limitPerResource,
        ],
      );
  
    return result.rows;
  }
  
  export async function listAmbulanceLocationRecoveryEvents(
    client,
    {
      checkpoints,
      limitPerResource,
    },
  ) {
    if (
      checkpoints.length ===
      0
    ) {
      return [];
    }
  
    const result =
      await client.query(
        `
          WITH checkpoints AS (
            SELECT
              checkpoint.resource_id
                ::BIGINT
                AS resource_id,
  
              checkpoint.sequence_number
                ::BIGINT
                AS sequence_number
  
            FROM JSONB_TO_RECORDSET(
              $1::JSONB
            ) AS checkpoint(
              resource_id TEXT,
              sequence_number BIGINT
            )
          ),
  
          ranked_events AS (
            SELECT
              location_event.id::TEXT
                AS id,
  
              location_event.event_id::TEXT
                AS event_id,
  
              location_event.ambulance_id::TEXT
                AS ambulance_id,
  
              location_event.device_id,
  
              location_event.sequence_number,
  
              ST_X(
                location_event.location
              )::DOUBLE PRECISION
                AS longitude,
  
              ST_Y(
                location_event.location
              )::DOUBLE PRECISION
                AS latitude,
  
              location_event.speed_kmh
                ::DOUBLE PRECISION
                AS speed_kmh,
  
              location_event.heading_degrees
                ::DOUBLE PRECISION
                AS heading_degrees,
  
              location_event.recorded_at,
  
              location_event.received_at,
  
              location_event.payload,
  
              ambulance.status
                AS ambulance_status,
  
              ambulance.is_operational,
  
              ROW_NUMBER() OVER (
                PARTITION BY
                  location_event.ambulance_id
  
                ORDER BY
                  location_event
                    .sequence_number ASC
              ) AS recovery_row_number,
  
              COUNT(*) OVER (
                PARTITION BY
                  location_event.ambulance_id
              ) AS total_after_checkpoint
  
            FROM public.ambulance_location_events
              AS location_event
  
            JOIN checkpoints
              ON checkpoints.resource_id =
                 location_event.ambulance_id
  
            JOIN public.ambulances
              AS ambulance
              ON ambulance.id =
                 location_event.ambulance_id
  
            WHERE
              location_event.sequence_number >
              checkpoints.sequence_number
          )
  
          SELECT
            id,
            event_id,
            ambulance_id,
            device_id,
            sequence_number,
            longitude,
            latitude,
            speed_kmh,
            heading_degrees,
            recorded_at,
            received_at,
            payload,
            ambulance_status,
            is_operational,
  
            (
              total_after_checkpoint >
              $2::INTEGER
            ) AS has_more_for_resource
  
          FROM ranked_events
  
          WHERE
            recovery_row_number <=
            $2::INTEGER
  
          ORDER BY
            ambulance_id::BIGINT ASC,
            sequence_number ASC;
        `,
        [
          serializeCheckpoints(
            checkpoints,
          ),
  
          limitPerResource,
        ],
      );
  
    return result.rows;
  }