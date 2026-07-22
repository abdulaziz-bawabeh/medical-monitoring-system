export async function findFacilityByCode(
    client,
    facilityCode,
  ) {
    const result = await client.query(
      `
        SELECT
          id::TEXT AS id,
          governorate_id::TEXT
            AS governorate_id,
          code,
          name,
          total_beds,
          is_operational
        FROM medical_facilities
        WHERE code = $1
        LIMIT 1;
      `,
      [facilityCode],
    );
  
    return result.rows[0] ?? null;
  }
  
  export async function findAmbulanceByDeviceId(
    client,
    deviceId,
  ) {
    const result = await client.query(
      `
        SELECT
          id::TEXT AS id,
          assigned_governorate_id::TEXT
            AS assigned_governorate_id,
          base_facility_id::TEXT
            AS base_facility_id,
          code,
          device_id,
          status,
          is_operational,
          last_location_at,
          last_sequence_number::TEXT
            AS last_sequence_number
        FROM ambulances
        WHERE device_id = $1
        LIMIT 1;
      `,
      [deviceId],
    );
  
    return result.rows[0] ?? null;
  }
  
  export async function findCurrentFacilityOccupancy(
    client,
    facilityId,
  ) {
    const result = await client.query(
      `
        SELECT
          facility_id::TEXT
            AS facility_id,
          source_device_id,
          sequence_number::TEXT
            AS sequence_number,
          status,
          recorded_at
        FROM facility_current_occupancy
        WHERE facility_id = $1
        LIMIT 1;
      `,
      [facilityId],
    );
  
    return result.rows[0] ?? null;
  }
  
  export async function insertFacilityOccupancyEvent(
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
    const result = await client.query(
      `
        INSERT INTO facility_occupancy_events (
          event_id,
          facility_id,
          source_device_id,
          sequence_number,
          total_beds,
          occupied_beds,
          recorded_at,
          payload
        )
        VALUES (
          $1::UUID,
          $2,
          $3,
          $4::BIGINT,
          $5,
          $6,
          $7::TIMESTAMPTZ,
          $8::JSONB
        )
  
        ON CONFLICT DO NOTHING
  
        RETURNING
          id::TEXT AS id,
          event_id::TEXT AS event_id,
          facility_id::TEXT
            AS facility_id,
          source_device_id,
          sequence_number::TEXT
            AS sequence_number,
          total_beds,
          occupied_beds,
          available_beds,
          occupancy_percentage::DOUBLE PRECISION
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
        JSON.stringify(payload),
      ],
    );
  
    return result.rows[0] ?? null;
  }
  
  export async function findFacilityOccupancyEventByIdentity(
    client,
    {
      eventId,
      sourceDeviceId,
      sequenceNumber,
    },
  ) {
    const result = await client.query(
      `
        SELECT
          id::TEXT AS id,
          event_id::TEXT AS event_id,
          facility_id::TEXT
            AS facility_id,
          source_device_id,
          sequence_number::TEXT
            AS sequence_number,
          total_beds,
          occupied_beds,
          available_beds,
          occupancy_percentage::DOUBLE PRECISION
            AS occupancy_percentage,
          status,
          recorded_at,
          received_at,
          payload
        FROM facility_occupancy_events
        WHERE event_id = $1::UUID
           OR (
                source_device_id = $2
                AND sequence_number = $3::BIGINT
              )
        ORDER BY
          CASE
            WHEN event_id = $1::UUID
            THEN 0
            ELSE 1
          END
        LIMIT 1;
      `,
      [
        eventId,
        sourceDeviceId,
        sequenceNumber,
      ],
    );
  
    return result.rows[0] ?? null;
  }
  
  export async function upsertCurrentFacilityOccupancy(
    client,
    event,
  ) {
    const result = await client.query(
      `
        INSERT INTO facility_current_occupancy AS current_state (
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
          $1,
          $2::UUID,
          $3,
          $4::BIGINT,
          $5,
          $6,
          $7::TIMESTAMPTZ,
          $8::TIMESTAMPTZ,
          NOW()
        )
  
        ON CONFLICT (facility_id)
        DO UPDATE SET
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
          EXCLUDED.recorded_at
            > current_state.recorded_at
  
          OR (
            EXCLUDED.recorded_at
              = current_state.recorded_at
  
            AND EXCLUDED.source_device_id
              = current_state.source_device_id
  
            AND EXCLUDED.sequence_number
              > current_state.sequence_number
          )
  
        RETURNING
          facility_id::TEXT
            AS facility_id,
          last_event_id::TEXT
            AS last_event_id,
          source_device_id,
          sequence_number::TEXT
            AS sequence_number,
          total_beds,
          occupied_beds,
          available_beds,
          occupancy_percentage::DOUBLE PRECISION
            AS occupancy_percentage,
          status,
          recorded_at,
          received_at;
      `,
      [
        event.facility_id,
        event.event_id,
        event.source_device_id,
        event.sequence_number,
        event.total_beds,
        event.occupied_beds,
        event.recorded_at,
        event.received_at,
      ],
    );
  
    return result.rows[0] ?? null;
  }
  
  export async function insertAmbulanceLocationEvent(
    client,
    {
      eventId,
      ambulanceId,
      deviceId,
      sequenceNumber,
      longitude,
      latitude,
      speedKmh,
      headingDegrees,
      recordedAt,
      payload,
    },
  ) {
    const result = await client.query(
      `
        INSERT INTO ambulance_location_events (
          event_id,
          ambulance_id,
          device_id,
          sequence_number,
          location,
          speed_kmh,
          heading_degrees,
          recorded_at,
          payload
        )
        VALUES (
          $1::UUID,
          $2,
          $3,
          $4::BIGINT,
  
          ST_SetSRID(
            ST_MakePoint(
              $5,
              $6
            ),
            4326
          ),
  
          $7,
          $8,
          $9::TIMESTAMPTZ,
          $10::JSONB
        )
  
        ON CONFLICT DO NOTHING
  
        RETURNING
          id::TEXT AS id,
          event_id::TEXT AS event_id,
          ambulance_id::TEXT
            AS ambulance_id,
          device_id,
          sequence_number::TEXT
            AS sequence_number,
          ST_X(location)
            AS longitude,
          ST_Y(location)
            AS latitude,
          speed_kmh::DOUBLE PRECISION
            AS speed_kmh,
          heading_degrees::DOUBLE PRECISION
            AS heading_degrees,
          recorded_at,
          received_at,
          payload;
      `,
      [
        eventId,
        ambulanceId,
        deviceId,
        sequenceNumber,
        longitude,
        latitude,
        speedKmh,
        headingDegrees,
        recordedAt,
        JSON.stringify(payload),
      ],
    );
  
    return result.rows[0] ?? null;
  }
  
  export async function findAmbulanceLocationEventByIdentity(
    client,
    {
      eventId,
      deviceId,
      sequenceNumber,
    },
  ) {
    const result = await client.query(
      `
        SELECT
          id::TEXT AS id,
          event_id::TEXT AS event_id,
          ambulance_id::TEXT
            AS ambulance_id,
          device_id,
          sequence_number::TEXT
            AS sequence_number,
          ST_X(location)
            AS longitude,
          ST_Y(location)
            AS latitude,
          speed_kmh::DOUBLE PRECISION
            AS speed_kmh,
          heading_degrees::DOUBLE PRECISION
            AS heading_degrees,
          recorded_at,
          received_at,
          payload
        FROM ambulance_location_events
        WHERE event_id = $1::UUID
           OR (
                device_id = $2
                AND sequence_number = $3::BIGINT
              )
        ORDER BY
          CASE
            WHEN event_id = $1::UUID
            THEN 0
            ELSE 1
          END
        LIMIT 1;
      `,
      [
        eventId,
        deviceId,
        sequenceNumber,
      ],
    );
  
    return result.rows[0] ?? null;
  }
  
  export async function updateAmbulanceCurrentLocation(
    client,
    {
      ambulanceId,
      longitude,
      latitude,
      sequenceNumber,
      recordedAt,
    },
  ) {
    const result = await client.query(
      `
        UPDATE ambulances
        SET
          current_location =
            ST_SetSRID(
              ST_MakePoint(
                $2,
                $3
              ),
              4326
            ),
  
          last_location_at =
            $5::TIMESTAMPTZ,
  
          last_sequence_number =
            $4::BIGINT,
  
          updated_at =
            NOW()
  
        WHERE id = $1
  
          AND (
            last_location_at IS NULL
  
            OR $5::TIMESTAMPTZ
              > last_location_at
  
            OR (
              $5::TIMESTAMPTZ
                = last_location_at
  
              AND $4::BIGINT
                > last_sequence_number
            )
          )
  
        RETURNING
          id::TEXT AS id,
          assigned_governorate_id::TEXT
            AS assigned_governorate_id,
          code,
          device_id,
          status,
          is_operational,
          ST_X(current_location)
            AS longitude,
          ST_Y(current_location)
            AS latitude,
          last_location_at,
          last_sequence_number::TEXT
            AS last_sequence_number;
      `,
      [
        ambulanceId,
        longitude,
        latitude,
        sequenceNumber,
        recordedAt,
      ],
    );
  
    return result.rows[0] ?? null;
  }