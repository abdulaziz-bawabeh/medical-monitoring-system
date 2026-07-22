export async function selectFacilitiesForOccupancySimulation(
    client,
  ) {
    const result =
      await client.query(
        `
          SELECT
            facility.id::TEXT
              AS facility_id,
  
            facility.name
              AS facility_name,
  
            facility.facility_type,
  
            facility.total_beds,
  
            governorate.id::TEXT
              AS governorate_id,
  
            governorate.name
              AS governorate_name,
  
            governorate.slug
              AS governorate_slug,
  
            current_occupancy.source_device_id
              AS current_source_device_id,
  
            current_occupancy.sequence_number
              AS current_sequence_number,
  
            current_occupancy.occupied_beds
              AS current_occupied_beds,
  
            current_occupancy.recorded_at
              AS current_recorded_at,
  
            COALESCE(
              event_history.max_sequence_number,
              0
            ) AS max_sequence_number
  
          FROM public.medical_facilities
            AS facility
  
          JOIN public.governorates
            AS governorate
            ON governorate.id =
               facility.governorate_id
  
          LEFT JOIN public.facility_current_occupancy
            AS current_occupancy
            ON current_occupancy.facility_id =
               facility.id
  
          LEFT JOIN LATERAL (
            SELECT
              MAX(
                occupancy_event.sequence_number
              ) AS max_sequence_number
  
            FROM public.facility_occupancy_events
              AS occupancy_event
  
            WHERE
              occupancy_event.facility_id =
                facility.id
          ) AS event_history
            ON TRUE
  
          WHERE
            facility.total_beds > 0
  
          ORDER BY
            facility.id ASC
  
          FOR UPDATE OF facility;
        `,
      );
  
    return result.rows;
  }
  
  export async function insertSimulationOccupancyEvent(
    client,
    {
      eventId,
      facilityId,
      sourceDeviceId,
      sequenceNumber,
      totalBeds,
      occupiedBeds,
      recordedAt,
      payload,
    },
  ) {
    const result =
      await client.query(
        `
          INSERT INTO public.facility_occupancy_events (
            event_id,
            facility_id,
            source_device_id,
            sequence_number,
            total_beds,
            occupied_beds,
            recorded_at,
            received_at,
            payload
          )
          VALUES (
            $1::UUID,
            $2::BIGINT,
            $3::TEXT,
            $4::BIGINT,
            $5::INTEGER,
            $6::INTEGER,
            $7::TIMESTAMPTZ,

GREATEST(
  clock_timestamp(),
  $7::TIMESTAMPTZ
),

$8::JSONB
          )
          RETURNING
            id::TEXT
              AS id,
  
            event_id::TEXT
              AS event_id,
  
            facility_id::TEXT
              AS facility_id,
  
            source_device_id,
  
            sequence_number,
  
            total_beds,
  
            occupied_beds,
  
            available_beds,
  
            occupancy_percentage
              ::DOUBLE PRECISION
              AS occupancy_percentage,
  
            status,
  
            recorded_at,
  
            received_at,
  
            payload;
        `,
        [
          eventId,
          facilityId,
          sourceDeviceId,
          sequenceNumber,
          totalBeds,
          occupiedBeds,
          recordedAt,
          JSON.stringify(
            payload,
          ),
        ],
      );
  
    return result.rows[0];
  }
  
  export async function upsertSimulationCurrentOccupancy(
    client,
    occupancyEvent,
  ) {
    const result =
      await client.query(
        `
          INSERT INTO public.facility_current_occupancy (
            facility_id,
            last_event_id,
            source_device_id,
            sequence_number,
            total_beds,
            occupied_beds,
            recorded_at,
            received_at,
            updated_at
          )
          VALUES (
            $1::BIGINT,
            $2::UUID,
            $3::TEXT,
            $4::BIGINT,
            $5::INTEGER,
            $6::INTEGER,
            $7::TIMESTAMPTZ,
            $8::TIMESTAMPTZ,
            NOW()
          )
  
          ON CONFLICT (facility_id)
          DO UPDATE
          SET
            last_event_id =
              EXCLUDED.last_event_id,
  
            source_device_id =
              EXCLUDED.source_device_id,
  
            sequence_number =
              EXCLUDED.sequence_number,
  
            total_beds =
              EXCLUDED.total_beds,
  
            occupied_beds =
              EXCLUDED.occupied_beds,
  
            recorded_at =
              EXCLUDED.recorded_at,
  
            received_at =
              EXCLUDED.received_at,
  
            updated_at =
              NOW()
  
          WHERE
            public.facility_current_occupancy.recorded_at
              IS NULL
  
            OR EXCLUDED.recorded_at >=
               public.facility_current_occupancy.recorded_at
  
          RETURNING
            facility_id::TEXT
              AS facility_id,
  
            last_event_id::TEXT
              AS last_event_id,
  
            source_device_id,
  
            sequence_number,
  
            total_beds,
  
            occupied_beds,
  
            available_beds,
  
            occupancy_percentage
              ::DOUBLE PRECISION
              AS occupancy_percentage,
  
            status,
  
            recorded_at,
  
            received_at,
  
            updated_at;
        `,
        [
          occupancyEvent.facility_id,
          occupancyEvent.event_id,
          occupancyEvent.source_device_id,
          occupancyEvent.sequence_number,
          occupancyEvent.total_beds,
          occupancyEvent.occupied_beds,
          occupancyEvent.recorded_at,
          occupancyEvent.received_at,
        ],
      );
  
    return result.rows[0] ??
      null;
  }