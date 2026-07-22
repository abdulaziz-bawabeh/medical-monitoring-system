export async function selectHistoricalFacilitySnapshot(
    client,
    {
      at,
      earliestAvailableAt,
      governorateId,
    },
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
  
            facility.total_beds
              AS configured_total_beds,
  
            ST_X(
              facility.location
            )::DOUBLE PRECISION
              AS longitude,
  
            ST_Y(
              facility.location
            )::DOUBLE PRECISION
              AS latitude,
  
            governorate.id::TEXT
              AS governorate_id,
  
            governorate.name
              AS governorate_name,
  
            governorate.slug
              AS governorate_slug,
  
            occupancy.event_id::TEXT
              AS occupancy_event_id,
  
            occupancy.source_device_id,
  
            occupancy.sequence_number,
  
            occupancy.total_beds,
  
            occupancy.occupied_beds,
  
            occupancy.available_beds,
  
            occupancy.occupancy_percentage
              ::DOUBLE PRECISION
              AS occupancy_percentage,
  
            occupancy.status
              AS occupancy_status,
  
            occupancy.recorded_at
              AS occupancy_recorded_at,
  
            occupancy.received_at
              AS occupancy_received_at
  
          FROM medical_facilities
            AS facility
  
          JOIN governorates
            AS governorate
            ON governorate.id =
               facility.governorate_id
  
          LEFT JOIN LATERAL (
            SELECT
              occupancy_event.event_id,
              occupancy_event.source_device_id,
              occupancy_event.sequence_number,
              occupancy_event.total_beds,
              occupancy_event.occupied_beds,
              occupancy_event.available_beds,
              occupancy_event.occupancy_percentage,
              occupancy_event.status,
              occupancy_event.recorded_at,
              occupancy_event.received_at
  
            FROM facility_occupancy_events
              AS occupancy_event
  
            WHERE
              occupancy_event.facility_id =
                facility.id
  
              AND occupancy_event.recorded_at <=
                $1::TIMESTAMPTZ
  
              AND occupancy_event.recorded_at >=
                $2::TIMESTAMPTZ
  
            ORDER BY
              occupancy_event.recorded_at DESC,
              occupancy_event.id DESC
  
            LIMIT 1
          ) AS occupancy
            ON TRUE
  
          WHERE
            (
              $3::SMALLINT IS NULL
  
              OR facility.governorate_id =
                 $3::SMALLINT
            )
  
          ORDER BY
            governorate.name ASC,
            facility.name ASC;
        `,
        [
          at,
          earliestAvailableAt,
          governorateId,
        ],
      );
  
    return result.rows;
  }
  
  export async function selectHistoricalAmbulanceSnapshot(
    client,
    {
      at,
      earliestAvailableAt,
      governorateId,
    },
  ) {
    const result =
      await client.query(
        `
          SELECT
            ambulance.id::TEXT
              AS ambulance_id,
  
            ambulance.code
              AS ambulance_code,
  
            ambulance.device_id,
  
            ambulance.is_operational,
  
            ambulance.status
              AS current_status,
  
            governorate.id::TEXT
              AS governorate_id,
  
            governorate.name
              AS governorate_name,
  
            governorate.slug
              AS governorate_slug,
  
            base_facility.id::TEXT
              AS base_facility_id,
  
            base_facility.name
              AS base_facility_name,
  
            CASE
              WHEN active_dispatch.id IS NOT NULL
                THEN 'BUSY'
  
              WHEN ambulance.is_operational = FALSE
                THEN ambulance.status
  
              ELSE 'AVAILABLE'
            END AS historical_status,
  
            CASE
              WHEN active_dispatch.id IS NOT NULL
                THEN 'ACTIVE_DISPATCH_TIMELINE'
  
              ELSE 'CURRENT_OPERATIONAL_FALLBACK'
            END AS status_source,
  
            active_dispatch.id::TEXT
              AS active_dispatch_id,
  
            active_dispatch.dispatch_number,
  
            active_dispatch.status_at_time
              AS active_dispatch_status,
  
            CASE
              WHEN route_location.recorded_at IS NOT NULL
                AND (
                  device_location.recorded_at IS NULL
  
                  OR route_location.recorded_at >
                     device_location.recorded_at
                )
                THEN ST_X(
                  route_location.location
                )
  
              ELSE ST_X(
                device_location.location
              )
            END::DOUBLE PRECISION
              AS longitude,
  
            CASE
              WHEN route_location.recorded_at IS NOT NULL
                AND (
                  device_location.recorded_at IS NULL
  
                  OR route_location.recorded_at >
                     device_location.recorded_at
                )
                THEN ST_Y(
                  route_location.location
                )
  
              ELSE ST_Y(
                device_location.location
              )
            END::DOUBLE PRECISION
              AS latitude,
  
            CASE
              WHEN route_location.recorded_at IS NOT NULL
                AND (
                  device_location.recorded_at IS NULL
  
                  OR route_location.recorded_at >
                     device_location.recorded_at
                )
                THEN route_location.recorded_at
  
              ELSE device_location.recorded_at
            END AS location_recorded_at,
  
            CASE
              WHEN route_location.recorded_at IS NOT NULL
                AND (
                  device_location.recorded_at IS NULL
  
                  OR route_location.recorded_at >
                     device_location.recorded_at
                )
                THEN route_location.sequence_number
  
              ELSE device_location.sequence_number
            END AS location_sequence_number,
  
            CASE
              WHEN route_location.recorded_at IS NOT NULL
                AND (
                  device_location.recorded_at IS NULL
  
                  OR route_location.recorded_at >
                     device_location.recorded_at
                )
                THEN route_location.speed_kmh
  
              ELSE device_location.speed_kmh
            END::DOUBLE PRECISION
              AS speed_kmh,
  
            CASE
              WHEN route_location.recorded_at IS NOT NULL
                AND (
                  device_location.recorded_at IS NULL
  
                  OR route_location.recorded_at >
                     device_location.recorded_at
                )
                THEN route_location.heading_degrees
  
              ELSE device_location.heading_degrees
            END::DOUBLE PRECISION
              AS heading_degrees,
  
            CASE
              WHEN route_location.recorded_at IS NOT NULL
                AND (
                  device_location.recorded_at IS NULL
  
                  OR route_location.recorded_at >
                     device_location.recorded_at
                )
                THEN 'DISPATCH_ROUTE_POINT'
  
              WHEN device_location.recorded_at IS NOT NULL
                THEN 'AMBULANCE_LOCATION_EVENT'
  
              ELSE NULL
            END AS location_source
  
          FROM ambulances
            AS ambulance
  
          JOIN governorates
            AS governorate
            ON governorate.id =
               ambulance.assigned_governorate_id
  
          LEFT JOIN medical_facilities
            AS base_facility
            ON base_facility.id =
               ambulance.base_facility_id
  
          LEFT JOIN LATERAL (
            SELECT
              location_event.location,
              location_event.sequence_number,
              location_event.speed_kmh,
              location_event.heading_degrees,
              location_event.recorded_at
  
            FROM ambulance_location_events
              AS location_event
  
            WHERE
              location_event.ambulance_id =
                ambulance.id
  
              AND location_event.recorded_at <=
                $1::TIMESTAMPTZ
  
              AND location_event.recorded_at >=
                $2::TIMESTAMPTZ
  
            ORDER BY
              location_event.recorded_at DESC,
              location_event.id DESC
  
            LIMIT 1
          ) AS device_location
            ON TRUE
  
          LEFT JOIN LATERAL (
            SELECT
              route_point.location,
              route_point.sequence_number,
              route_point.speed_kmh,
              route_point.heading_degrees,
              route_point.recorded_at
  
            FROM dispatch_route_points
              AS route_point
  
            WHERE
              route_point.ambulance_id =
                ambulance.id
  
              AND route_point.recorded_at <=
                $1::TIMESTAMPTZ
  
              AND route_point.recorded_at >=
                $2::TIMESTAMPTZ
  
            ORDER BY
              route_point.recorded_at DESC,
              route_point.id DESC
  
            LIMIT 1
          ) AS route_location
            ON TRUE
  
          LEFT JOIN LATERAL (
            SELECT
              dispatch.id,
              dispatch.dispatch_number,
  
              CASE
                WHEN dispatch.arrived_at IS NOT NULL
                  AND dispatch.arrived_at <=
                      $1::TIMESTAMPTZ
                  THEN 'ARRIVED'
  
                WHEN dispatch.en_route_at IS NOT NULL
                  AND dispatch.en_route_at <=
                      $1::TIMESTAMPTZ
                  THEN 'EN_ROUTE'
  
                ELSE 'ASSIGNED'
              END AS status_at_time
  
            FROM ambulance_dispatches
              AS dispatch
  
            WHERE
              dispatch.ambulance_id =
                ambulance.id
  
              AND dispatch.assigned_at <=
                $1::TIMESTAMPTZ
  
              AND (
                dispatch.completed_at IS NULL
  
                OR dispatch.completed_at >
                   $1::TIMESTAMPTZ
              )
  
              AND (
                dispatch.cancelled_at IS NULL
  
                OR dispatch.cancelled_at >
                   $1::TIMESTAMPTZ
              )
  
            ORDER BY
              dispatch.assigned_at DESC,
              dispatch.id DESC
  
            LIMIT 1
          ) AS active_dispatch
            ON TRUE
  
          WHERE
            (
              $3::SMALLINT IS NULL
  
              OR ambulance.assigned_governorate_id =
                 $3::SMALLINT
            )
  
          ORDER BY
            governorate.name ASC,
            ambulance.code ASC;
        `,
        [
          at,
          earliestAvailableAt,
          governorateId,
        ],
      );
  
    return result.rows;
  }
  
  export async function selectHistoricalEmergencySnapshot(
    client,
    {
      at,
      governorateId,
    },
  ) {
    const result =
      await client.query(
        `
          SELECT
            emergency.id::TEXT
              AS emergency_id,
  
            emergency.event_id::TEXT
              AS event_id,
  
            emergency.case_number,
  
            emergency.summary,
  
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
  
            active_dispatch.id::TEXT
              AS active_dispatch_id,
  
            active_dispatch.dispatch_number,
  
            active_dispatch.status_at_time
              AS active_dispatch_status,
  
            CASE
              WHEN active_dispatch.id IS NOT NULL
                THEN 'DISPATCHED'
  
              ELSE 'OPEN'
            END AS historical_status,
  
            (
              SELECT COUNT(*)::INTEGER
  
              FROM alerts
                AS alert
  
              WHERE
                alert.emergency_case_id =
                  emergency.id
  
                AND alert.created_at <=
                  $1::TIMESTAMPTZ
  
                AND (
                  alert.resolved_at IS NULL
  
                  OR alert.resolved_at >
                     $1::TIMESTAMPTZ
                )
            ) AS active_alert_count
  
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
  
          LEFT JOIN LATERAL (
            SELECT
              dispatch.id,
              dispatch.dispatch_number,
  
              CASE
                WHEN dispatch.arrived_at IS NOT NULL
                  AND dispatch.arrived_at <=
                      $1::TIMESTAMPTZ
                  THEN 'ARRIVED'
  
                WHEN dispatch.en_route_at IS NOT NULL
                  AND dispatch.en_route_at <=
                      $1::TIMESTAMPTZ
                  THEN 'EN_ROUTE'
  
                ELSE 'ASSIGNED'
              END AS status_at_time
  
            FROM ambulance_dispatches
              AS dispatch
  
            WHERE
              dispatch.emergency_case_id =
                emergency.id
  
              AND dispatch.assigned_at <=
                $1::TIMESTAMPTZ
  
              AND (
                dispatch.completed_at IS NULL
  
                OR dispatch.completed_at >
                   $1::TIMESTAMPTZ
              )
  
              AND (
                dispatch.cancelled_at IS NULL
  
                OR dispatch.cancelled_at >
                   $1::TIMESTAMPTZ
              )
  
            ORDER BY
              dispatch.assigned_at DESC,
              dispatch.id DESC
  
            LIMIT 1
          ) AS active_dispatch
            ON TRUE
  
          WHERE
            emergency.reported_at <=
              $1::TIMESTAMPTZ
  
            AND (
              emergency.resolved_at IS NULL
  
              OR emergency.resolved_at >
                 $1::TIMESTAMPTZ
            )
  
            AND NOT (
              emergency.status = 'CANCELLED'
  
              AND emergency.updated_at <=
                  $1::TIMESTAMPTZ
            )
  
            AND (
              $2::SMALLINT IS NULL
  
              OR emergency.governorate_id =
                 $2::SMALLINT
            )
  
          ORDER BY
            emergency.reported_at DESC,
            emergency.id DESC;
        `,
        [
          at,
          governorateId,
        ],
      );
  
    return result.rows;
  }
  
  export async function selectHistoricalActiveDispatches(
    client,
    {
      at,
      governorateId,
    },
  ) {
    const result =
      await client.query(
        `
          SELECT
            dispatch.id::TEXT
              AS dispatch_id,
  
            dispatch.dispatch_number,
  
            dispatch.assigned_distance_meters
              ::DOUBLE PRECISION
              AS assigned_distance_meters,
  
            dispatch.assigned_at,
  
            dispatch.en_route_at,
  
            dispatch.arrived_at,
  
            dispatch.completed_at,
  
            dispatch.cancelled_at,
  
            CASE
              WHEN dispatch.arrived_at IS NOT NULL
                AND dispatch.arrived_at <=
                    $1::TIMESTAMPTZ
                THEN 'ARRIVED'
  
              WHEN dispatch.en_route_at IS NOT NULL
                AND dispatch.en_route_at <=
                    $1::TIMESTAMPTZ
                THEN 'EN_ROUTE'
  
              ELSE 'ASSIGNED'
            END AS historical_status,
  
            emergency.id::TEXT
              AS emergency_id,
  
            emergency.case_number,
  
            emergency.summary
              AS emergency_summary,
  
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
              AS governorate_slug,
  
            latest_route.sequence_number
              AS latest_route_sequence_number,
  
            latest_route.recorded_at
              AS latest_route_recorded_at,
  
            ST_X(
              latest_route.location
            )::DOUBLE PRECISION
              AS latest_route_longitude,
  
            ST_Y(
              latest_route.location
            )::DOUBLE PRECISION
              AS latest_route_latitude,
  
            (
              SELECT COUNT(*)::INTEGER
  
              FROM dispatch_route_points
                AS route_point_count
  
              WHERE
                route_point_count.dispatch_id =
                  dispatch.id
  
                AND route_point_count.recorded_at <=
                  $1::TIMESTAMPTZ
            ) AS route_point_count_at_time
  
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
  
          LEFT JOIN LATERAL (
            SELECT
              route_point.sequence_number,
              route_point.location,
              route_point.recorded_at
  
            FROM dispatch_route_points
              AS route_point
  
            WHERE
              route_point.dispatch_id =
                dispatch.id
  
              AND route_point.recorded_at <=
                $1::TIMESTAMPTZ
  
            ORDER BY
              route_point.sequence_number DESC
  
            LIMIT 1
          ) AS latest_route
            ON TRUE
  
          WHERE
            dispatch.assigned_at <=
              $1::TIMESTAMPTZ
  
            AND (
              dispatch.completed_at IS NULL
  
              OR dispatch.completed_at >
                 $1::TIMESTAMPTZ
            )
  
            AND (
              dispatch.cancelled_at IS NULL
  
              OR dispatch.cancelled_at >
                 $1::TIMESTAMPTZ
            )
  
            AND (
              $2::SMALLINT IS NULL
  
              OR emergency.governorate_id =
                 $2::SMALLINT
            )
  
          ORDER BY
            dispatch.assigned_at DESC,
            dispatch.id DESC;
        `,
        [
          at,
          governorateId,
        ],
      );
  
    return result.rows;
  }