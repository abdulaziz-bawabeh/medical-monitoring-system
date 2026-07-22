import {
    pool,
  } from "../config/databasePool.js";
  
  export async function selectAmbulanceLocationHistory({
    from,
    to,
    governorateId,
    ambulanceId,
    limit,
  }) {
    const result =
      await pool.query(
        `
          SELECT
            location_event.id::TEXT
              AS id,
  
            location_event.event_id::TEXT
              AS event_id,
  
            location_event.ambulance_id::TEXT
              AS ambulance_id,
  
            ambulance.code
              AS ambulance_code,
  
            ambulance.status
              AS current_ambulance_status,
  
            ambulance.is_operational,
  
            ambulance.device_id,
  
            base_facility.id::TEXT
              AS base_facility_id,
  
            base_facility.name
              AS base_facility_name,
  
            governorate.id::TEXT
              AS governorate_id,
  
            governorate.name
              AS governorate_name,
  
            governorate.slug
              AS governorate_slug,
  
            location_event.device_id
              AS source_device_id,
  
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
  
            location_event.payload
  
          FROM ambulance_location_events
            AS location_event
  
          JOIN ambulances
            AS ambulance
            ON ambulance.id =
               location_event.ambulance_id
  
          JOIN governorates
            AS governorate
            ON governorate.id =
               ambulance.assigned_governorate_id
  
          LEFT JOIN medical_facilities
            AS base_facility
            ON base_facility.id =
               ambulance.base_facility_id
  
          WHERE
            location_event.recorded_at >=
              $1::TIMESTAMPTZ
  
            AND location_event.recorded_at <=
              $2::TIMESTAMPTZ
  
            AND (
              $3::SMALLINT IS NULL
  
              OR ambulance.assigned_governorate_id =
                 $3::SMALLINT
            )
  
            AND (
              $4::BIGINT IS NULL
  
              OR location_event.ambulance_id =
                 $4::BIGINT
            )
  
          ORDER BY
            location_event.recorded_at ASC,
            location_event.id ASC
  
          LIMIT $5::INTEGER;
        `,
        [
          from,
          to,
          governorateId,
          ambulanceId,
          limit + 1,
        ],
      );
  
    return result.rows;
  }
  
  export async function selectEmergencyHistory({
    from,
    to,
    governorateId,
    status,
    limit,
  }) {
    const result =
      await pool.query(
        `
          SELECT
            emergency.id::TEXT
              AS id,
  
            emergency.event_id::TEXT
              AS event_id,
  
            emergency.case_number,
  
            emergency.summary,
  
            emergency.status,
  
            ST_X(
              emergency.location
            )::DOUBLE PRECISION
              AS longitude,
  
            ST_Y(
              emergency.location
            )::DOUBLE PRECISION
              AS latitude,
  
            emergency.reported_at,
  
            emergency.received_at,
  
            emergency.resolved_at,
  
            emergency.payload,
  
            emergency.created_at,
  
            emergency.updated_at,
  
            governorate.id::TEXT
              AS governorate_id,
  
            governorate.name
              AS governorate_name,
  
            governorate.slug
              AS governorate_slug,
  
              creator.id::TEXT
              AS created_by_id,
            
            COALESCE(
              NULLIF(
                TO_JSONB(creator) ->> 'name',
                ''
              ),
            
              NULLIF(
                TO_JSONB(creator) ->> 'full_name',
                ''
              ),
            
              NULLIF(
                TO_JSONB(creator) ->> 'username',
                ''
              ),
            
              NULLIF(
                TO_JSONB(creator) ->> 'email',
                ''
              ),
            
              'Unknown user'
            ) AS created_by_name,
  
            (
              SELECT COUNT(*)::INTEGER
  
              FROM alerts
                AS alert
  
              WHERE
                alert.emergency_case_id =
                  emergency.id
  
                AND alert.status <> 'RESOLVED'
            ) AS active_alert_count,
  
            (
              SELECT COUNT(*)::INTEGER
  
              FROM ambulance_dispatches
                AS dispatch
  
              WHERE
                dispatch.emergency_case_id =
                  emergency.id
            ) AS dispatch_count
  
          FROM emergency_cases
            AS emergency
  
          JOIN governorates
            AS governorate
            ON governorate.id =
               emergency.governorate_id
  
          JOIN users
            AS creator
            ON creator.id =
               emergency.created_by_user_id
  
          WHERE
            emergency.reported_at >=
              $1::TIMESTAMPTZ
  
            AND emergency.reported_at <=
              $2::TIMESTAMPTZ
  
            AND (
              $3::SMALLINT IS NULL
  
              OR emergency.governorate_id =
                 $3::SMALLINT
            )
  
            AND (
              $4::TEXT IS NULL
  
              OR emergency.status =
                 $4::TEXT
            )
  
          ORDER BY
            emergency.reported_at DESC,
            emergency.id DESC
  
          LIMIT $5::INTEGER;
        `,
        [
          from,
          to,
          governorateId,
          status,
          limit + 1,
        ],
      );
  
    return result.rows;
  }
  
  export async function selectDispatchHistory({
    from,
    to,
    governorateId,
    ambulanceId,
    status,
    limit,
  }) {
    const result =
      await pool.query(
        `
          SELECT
            dispatch.id::TEXT
              AS id,
  
            dispatch.event_id::TEXT
              AS event_id,
  
            dispatch.dispatch_number,
  
            dispatch.recommendation_id::TEXT
              AS recommendation_id,
  
            dispatch.status,
  
            dispatch.assigned_distance_meters
              ::DOUBLE PRECISION
              AS assigned_distance_meters,
  
            dispatch.assigned_at,
  
            dispatch.en_route_at,
  
            dispatch.arrived_at,
  
            dispatch.completed_at,
  
            dispatch.cancelled_at,
  
            dispatch.cancellation_reason,
  
            dispatch.last_route_sequence_number,
  
            dispatch.last_route_point_at,
  
            dispatch.payload,
  
            dispatch.created_at,
  
            dispatch.updated_at,
  
            ST_X(
              dispatch.emergency_location
            )::DOUBLE PRECISION
              AS emergency_longitude,
  
            ST_Y(
              dispatch.emergency_location
            )::DOUBLE PRECISION
              AS emergency_latitude,
  
            ST_X(
              dispatch.ambulance_start_location
            )::DOUBLE PRECISION
              AS ambulance_start_longitude,
  
            ST_Y(
              dispatch.ambulance_start_location
            )::DOUBLE PRECISION
              AS ambulance_start_latitude,
  
            emergency.id::TEXT
              AS emergency_id,
  
            emergency.case_number,
  
            emergency.summary
              AS emergency_summary,
  
            emergency.status
              AS emergency_status,
  
            governorate.id::TEXT
              AS governorate_id,
  
            governorate.name
              AS governorate_name,
  
            governorate.slug
              AS governorate_slug,
  
            ambulance.id::TEXT
              AS ambulance_id,
  
            ambulance.code
              AS ambulance_code,
  
            ambulance.status
              AS current_ambulance_status,
  
            ambulance.is_operational,
  
            manager.id::TEXT
  AS confirmed_by_id,

COALESCE(
  NULLIF(
    TO_JSONB(manager) ->> 'name',
    ''
  ),

  NULLIF(
    TO_JSONB(manager) ->> 'full_name',
    ''
  ),

  NULLIF(
    TO_JSONB(manager) ->> 'username',
    ''
  ),

  NULLIF(
    TO_JSONB(manager) ->> 'email',
    ''
  ),

  'Unknown user'
) AS confirmed_by_name,
  
            (
              SELECT COUNT(*)::INTEGER
  
              FROM dispatch_route_points
                AS route_point
  
              WHERE
                route_point.dispatch_id =
                  dispatch.id
            ) AS stored_route_point_count,
  
            (
              SELECT COUNT(*)::INTEGER
  
              FROM dispatch_status_events
                AS status_event
  
              WHERE
                status_event.dispatch_id =
                  dispatch.id
            ) AS status_event_count
  
          FROM ambulance_dispatches
            AS dispatch
  
          JOIN emergency_cases
            AS emergency
            ON emergency.id =
               dispatch.emergency_case_id
  
          JOIN governorates
            AS governorate
            ON governorate.id =
               emergency.governorate_id
  
          JOIN ambulances
            AS ambulance
            ON ambulance.id =
               dispatch.ambulance_id
  
          JOIN users
            AS manager
            ON manager.id =
               dispatch.confirmed_by_user_id
  
          WHERE
            dispatch.assigned_at >=
              $1::TIMESTAMPTZ
  
            AND dispatch.assigned_at <=
              $2::TIMESTAMPTZ
  
            AND (
              $3::SMALLINT IS NULL
  
              OR emergency.governorate_id =
                 $3::SMALLINT
            )
  
            AND (
              $4::BIGINT IS NULL
  
              OR dispatch.ambulance_id =
                 $4::BIGINT
            )
  
            AND (
              $5::TEXT IS NULL
  
              OR dispatch.status =
                 $5::TEXT
            )
  
          ORDER BY
            dispatch.assigned_at DESC,
            dispatch.id DESC
  
          LIMIT $6::INTEGER;
        `,
        [
          from,
          to,
          governorateId,
          ambulanceId,
          status,
          limit + 1,
        ],
      );
  
    return result.rows;
  }
  
  export async function selectDispatchHistoryMetadata(
    dispatchId,
  ) {
    const result =
      await pool.query(
        `
          SELECT
            dispatch.id::TEXT
              AS id,
  
            dispatch.dispatch_number,
  
            dispatch.status,
  
            dispatch.assigned_distance_meters
              ::DOUBLE PRECISION
              AS assigned_distance_meters,
  
            dispatch.assigned_at,
  
            dispatch.en_route_at,
  
            dispatch.arrived_at,
  
            dispatch.completed_at,
  
            dispatch.cancelled_at,
  
            dispatch.last_route_sequence_number,
  
            dispatch.last_route_point_at,
  
            emergency.id::TEXT
              AS emergency_id,
  
            emergency.case_number,
  
            emergency.summary
              AS emergency_summary,
  
            emergency.status
              AS emergency_status,
  
            ST_X(
              dispatch.emergency_location
            )::DOUBLE PRECISION
              AS emergency_longitude,
  
            ST_Y(
              dispatch.emergency_location
            )::DOUBLE PRECISION
              AS emergency_latitude,
  
            ambulance.id::TEXT
              AS ambulance_id,
  
            ambulance.code
              AS ambulance_code,
  
            governorate.id::TEXT
              AS governorate_id,
  
            governorate.name
              AS governorate_name,
  
            governorate.slug
              AS governorate_slug
  
          FROM ambulance_dispatches
            AS dispatch
  
          JOIN emergency_cases
            AS emergency
            ON emergency.id =
               dispatch.emergency_case_id
  
          JOIN ambulances
            AS ambulance
            ON ambulance.id =
               dispatch.ambulance_id
  
          JOIN governorates
            AS governorate
            ON governorate.id =
               emergency.governorate_id
  
          WHERE
            dispatch.id =
              $1::BIGINT
  
          LIMIT 1;
        `,
        [
          dispatchId,
        ],
      );
  
    return result.rows[0] ??
      null;
  }
  
  export async function selectDispatchRouteHistoryPoints({
    dispatchId,
    from,
    to,
    afterSequence,
    limit,
  }) {
    const result =
      await pool.query(
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
            )::DOUBLE PRECISION
              AS longitude,
  
            ST_Y(
              route_point.location
            )::DOUBLE PRECISION
              AS latitude,
  
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
  
            AND route_point.recorded_at >=
              $2::TIMESTAMPTZ
  
            AND route_point.recorded_at <=
              $3::TIMESTAMPTZ
  
            AND route_point.sequence_number >
              $4::BIGINT
  
          ORDER BY
            route_point.sequence_number ASC
  
          LIMIT $5::INTEGER;
        `,
        [
          dispatchId,
          from,
          to,
          afterSequence,
          limit + 1,
        ],
      );
  
    return result.rows;
  }
  
  export async function selectDispatchStatusHistory({
    dispatchId,
    from,
    to,
  }) {
    const result =
      await pool.query(
        `
          SELECT
            status_event.id::TEXT
              AS id,
  
            status_event.event_id::TEXT
              AS event_id,
  
            status_event.dispatch_id::TEXT
              AS dispatch_id,
  
            status_event.status,
  
            status_event.changed_by_user_id
              ::TEXT
              AS changed_by_user_id,
  
              COALESCE(
                NULLIF(
                  TO_JSONB(user_record) ->> 'name',
                  ''
                ),
              
                NULLIF(
                  TO_JSONB(user_record) ->> 'full_name',
                  ''
                ),
              
                NULLIF(
                  TO_JSONB(user_record) ->> 'username',
                  ''
                ),
              
                NULLIF(
                  TO_JSONB(user_record) ->> 'email',
                  ''
                ),
              
                'Unknown user'
              ) AS changed_by_user_name,
  
            status_event.occurred_at,
  
            status_event.received_at,
  
            status_event.payload
  
          FROM dispatch_status_events
            AS status_event
  
          LEFT JOIN users
            AS user_record
            ON user_record.id =
               status_event.changed_by_user_id
  
          WHERE
            status_event.dispatch_id =
              $1::BIGINT
  
            AND status_event.occurred_at >=
              $2::TIMESTAMPTZ
  
            AND status_event.occurred_at <=
              $3::TIMESTAMPTZ
  
          ORDER BY
            status_event.occurred_at ASC,
            status_event.id ASC;
        `,
        [
          dispatchId,
          from,
          to,
        ],
      );
  
    return result.rows;
  }