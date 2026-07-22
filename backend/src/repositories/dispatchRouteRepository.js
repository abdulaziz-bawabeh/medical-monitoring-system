export async function findRoutePointByEventId(
    client,
    eventId,
  ) {
    const result =
      await client.query(
        `
          SELECT
            route_point.id::TEXT
              AS id,
  
            route_point.event_id::TEXT
              AS event_id,
  
            route_point.dispatch_id::TEXT
              AS dispatch_id,
  
            route_point.ambulance_id::TEXT
              AS ambulance_id,
  
            route_point.sequence_number,
  
            ST_X(
              route_point.location
            ) AS longitude,
  
            ST_Y(
              route_point.location
            ) AS latitude,
  
            route_point.speed_kmh
              ::DOUBLE PRECISION
              AS speed_kmh,
  
            route_point.heading_degrees
              ::DOUBLE PRECISION
              AS heading_degrees,
  
            route_point.recorded_at,
  
            route_point.received_at,
  
            route_point.is_recovered,
  
            route_point.source,
  
            route_point.payload
  
          FROM dispatch_route_points
            AS route_point
  
          WHERE route_point.event_id =
            $1::UUID
  
          LIMIT 1;
        `,
        [
          eventId,
        ],
      );
  
    return result.rows[0] ?? null;
  }
  
  /*
   * Locks both the dispatch and the assigned ambulance.
   *
   * This prevents two concurrent route readings from applying
   * the same sequence number.
   */
  export async function lockDispatchRouteContext(
    client,
    dispatchId,
  ) {
    const result =
      await client.query(
        `
          SELECT
            dispatch.id::TEXT
              AS dispatch_id,
  
            dispatch.dispatch_number,
  
            dispatch.status
              AS dispatch_status,
  
            dispatch.ambulance_id::TEXT
              AS ambulance_id,
  
            dispatch.emergency_case_id::TEXT
              AS emergency_id,
  
            dispatch.last_route_sequence_number,
  
            dispatch.last_route_point_at,
  
            ambulance.code
              AS ambulance_code,
  
            ambulance.status
              AS ambulance_status,
  
            ambulance.is_operational,
  
            ambulance.last_location_at,
  
            ST_X(
              ambulance.current_location
            ) AS ambulance_longitude,
  
            ST_Y(
              ambulance.current_location
            ) AS ambulance_latitude,
  
            emergency.case_number,
  
            ST_X(
              emergency.location
            ) AS emergency_longitude,
  
            ST_Y(
              emergency.location
            ) AS emergency_latitude
  
          FROM ambulance_dispatches
            AS dispatch
  
          JOIN ambulances
            AS ambulance
            ON ambulance.id =
               dispatch.ambulance_id
  
          JOIN emergency_cases
            AS emergency
            ON emergency.id =
               dispatch.emergency_case_id
  
          WHERE dispatch.id =
            $1::BIGINT
  
          FOR UPDATE OF
            dispatch,
            ambulance;
        `,
        [
          dispatchId,
        ],
      );
  
    return result.rows[0] ?? null;
  }
  
  export async function insertDispatchRoutePoint(
    client,
    {
      eventId,
      dispatchId,
      ambulanceId,
      sequenceNumber,
      longitude,
      latitude,
      speedKmh,
      headingDegrees,
      recordedAt,
      payload,
    },
  ) {
    const result =
      await client.query(
        `
          INSERT INTO dispatch_route_points (
            event_id,
            dispatch_id,
            ambulance_id,
            sequence_number,
            location,
            speed_kmh,
            heading_degrees,
            recorded_at,
            received_at,
            is_recovered,
            source,
            payload
          )
          VALUES (
            $1::UUID,
            $2::BIGINT,
            $3::BIGINT,
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

            GREATEST(
              clock_timestamp(),
              $9::TIMESTAMPTZ
            ),
            
            FALSE,
            'LIVE_ROUTE_FEED',
            $10::JSONB
          )
  
          RETURNING
            id::TEXT AS id,
  
            event_id::TEXT
              AS event_id,
  
            dispatch_id::TEXT
              AS dispatch_id,
  
            ambulance_id::TEXT
              AS ambulance_id,
  
            sequence_number,
  
            ST_X(location)
              AS longitude,
  
            ST_Y(location)
              AS latitude,
  
            speed_kmh
              ::DOUBLE PRECISION
              AS speed_kmh,
  
            heading_degrees
              ::DOUBLE PRECISION
              AS heading_degrees,
  
            recorded_at,
  
            received_at,
  
            is_recovered,
  
            source,
  
            payload;
        `,
        [
          eventId,
          dispatchId,
          ambulanceId,
          sequenceNumber,
          longitude,
          latitude,
          speedKmh,
          headingDegrees,
          recordedAt,
          JSON.stringify(
            payload,
          ),
        ],
      );
  
    return result.rows[0];
  }
  
  export async function updateDispatchRouteProgress(
    client,
    {
      dispatchId,
      sequenceNumber,
      recordedAt,
    },
  ) {
    const result =
      await client.query(
        `
          UPDATE ambulance_dispatches
  
          SET
            last_route_sequence_number =
              $2::BIGINT,
  
            last_route_point_at =
              $3::TIMESTAMPTZ,
  
            updated_at =
              NOW()
  
          WHERE
            id = $1::BIGINT
  
            AND last_route_sequence_number <
                $2::BIGINT
  
          RETURNING
            id::TEXT AS id,
  
            last_route_sequence_number,
  
            last_route_point_at,
  
            updated_at;
        `,
        [
          dispatchId,
          sequenceNumber,
          recordedAt,
        ],
      );
  
    return result.rows[0] ?? null;
  }
  
  /*
   * Route sequence numbers belong to the dispatch route stream.
   *
   * We update the ambulance location and time, but we do not
   * overwrite ambulances.last_sequence_number because that field
   * belongs to the general ambulance location device stream.
   */
  export async function updateAmbulanceFromRoutePoint(
    client,
    {
      ambulanceId,
      longitude,
      latitude,
      recordedAt,
    },
  ) {
    const result =
      await client.query(
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
              $4::TIMESTAMPTZ,
  
            updated_at =
              NOW()
  
          WHERE
            id = $1::BIGINT
  
            AND (
              last_location_at IS NULL
  
              OR last_location_at <=
                 $4::TIMESTAMPTZ
            )
  
          RETURNING
            id::TEXT AS id,
  
            code,
  
            status,
  
            is_operational,
  
            ST_X(current_location)
              AS longitude,
  
            ST_Y(current_location)
              AS latitude,
  
            last_location_at,
  
            last_sequence_number,
  
            updated_at;
        `,
        [
          ambulanceId,
          longitude,
          latitude,
          recordedAt,
        ],
      );
  
    return result.rows[0] ?? null;
  }
  
  export async function findDispatchRouteMetadata(
    client,
    dispatchId,
  ) {
    const result =
      await client.query(
        `
          SELECT
            dispatch.id::TEXT
              AS dispatch_id,
  
            dispatch.dispatch_number,
  
            dispatch.status,
  
            dispatch.last_route_sequence_number,
  
            dispatch.last_route_point_at,
  
            ambulance.id::TEXT
              AS ambulance_id,
  
            ambulance.code
              AS ambulance_code,
  
            emergency.id::TEXT
              AS emergency_id,
  
            emergency.case_number,
  
            ST_X(
              emergency.location
            ) AS emergency_longitude,
  
            ST_Y(
              emergency.location
            ) AS emergency_latitude
  
          FROM ambulance_dispatches
            AS dispatch
  
          JOIN ambulances
            AS ambulance
            ON ambulance.id =
               dispatch.ambulance_id
  
          JOIN emergency_cases
            AS emergency
            ON emergency.id =
               dispatch.emergency_case_id
  
          WHERE dispatch.id =
            $1::BIGINT
  
          LIMIT 1;
        `,
        [
          dispatchId,
        ],
      );
  
    return result.rows[0] ?? null;
  }
  
  export async function listDispatchRoutePoints(
    client,
    {
      dispatchId,
      afterSequence,
      limit,
    },
  ) {
    const result =
      await client.query(
        `
          SELECT
            route_point.id::TEXT
              AS id,
  
            route_point.event_id::TEXT
              AS event_id,
  
            route_point.dispatch_id::TEXT
              AS dispatch_id,
  
            route_point.ambulance_id::TEXT
              AS ambulance_id,
  
            route_point.sequence_number,
  
            ST_X(
              route_point.location
            ) AS longitude,
  
            ST_Y(
              route_point.location
            ) AS latitude,
  
            route_point.speed_kmh
              ::DOUBLE PRECISION
              AS speed_kmh,
  
            route_point.heading_degrees
              ::DOUBLE PRECISION
              AS heading_degrees,
  
            route_point.recorded_at,
  
            route_point.received_at,
  
            route_point.is_recovered,
  
            route_point.source,
  
            route_point.payload
  
          FROM dispatch_route_points
            AS route_point
  
          WHERE
            route_point.dispatch_id =
              $1::BIGINT
  
            AND route_point.sequence_number >
              $2::BIGINT
  
          ORDER BY
            route_point.sequence_number ASC
  
          LIMIT $3;
        `,
        [
          dispatchId,
          afterSequence,
          limit,
        ],
      );
  
    return result.rows;
  }