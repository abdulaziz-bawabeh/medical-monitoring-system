import {
    pool,
  } from "../config/databasePool.js";
  
  export async function selectHistoryOverview({
    from,
    to,
    governorateId,
  }) {
    const result =
      await pool.query(
        `
          WITH facility_history AS (
            SELECT
              occupancy_event.facility_id,
              occupancy_event.status,
              occupancy_event.occupancy_percentage
  
            FROM facility_occupancy_events
              AS occupancy_event
  
            JOIN medical_facilities
              AS facility
              ON facility.id =
                 occupancy_event.facility_id
  
            WHERE
              occupancy_event.recorded_at >=
                $1::TIMESTAMPTZ
  
              AND occupancy_event.recorded_at <=
                $2::TIMESTAMPTZ
  
              AND (
                $3::SMALLINT IS NULL
  
                OR facility.governorate_id =
                   $3::SMALLINT
              )
          ),
  
          ambulance_history AS (
            SELECT
              location_event.ambulance_id
  
            FROM ambulance_location_events
              AS location_event
  
            JOIN ambulances
              AS ambulance
              ON ambulance.id =
                 location_event.ambulance_id
  
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
          ),
  
          emergency_history AS (
            SELECT
              emergency.id,
              emergency.status
  
            FROM emergency_cases
              AS emergency
  
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
          ),
  
          dispatch_history AS (
            SELECT
              dispatch.id,
              dispatch.status
  
            FROM ambulance_dispatches
              AS dispatch
  
            JOIN emergency_cases
              AS emergency
              ON emergency.id =
                 dispatch.emergency_case_id
  
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
          ),
  
          route_history AS (
            SELECT
              route_point.id
  
            FROM dispatch_route_points
              AS route_point
  
            JOIN ambulance_dispatches
              AS dispatch
              ON dispatch.id =
                 route_point.dispatch_id
  
            JOIN emergency_cases
              AS emergency
              ON emergency.id =
                 dispatch.emergency_case_id
  
            WHERE
              route_point.recorded_at >=
                $1::TIMESTAMPTZ
  
              AND route_point.recorded_at <=
                $2::TIMESTAMPTZ
  
              AND (
                $3::SMALLINT IS NULL
  
                OR emergency.governorate_id =
                   $3::SMALLINT
              )
          ),
  
          dispatch_status_history AS (
            SELECT
              status_event.id
  
            FROM dispatch_status_events
              AS status_event
  
            JOIN ambulance_dispatches
              AS dispatch
              ON dispatch.id =
                 status_event.dispatch_id
  
            JOIN emergency_cases
              AS emergency
              ON emergency.id =
                 dispatch.emergency_case_id
  
            WHERE
              status_event.occurred_at >=
                $1::TIMESTAMPTZ
  
              AND status_event.occurred_at <=
                $2::TIMESTAMPTZ
  
              AND (
                $3::SMALLINT IS NULL
  
                OR emergency.governorate_id =
                   $3::SMALLINT
              )
          ),
  
          alert_history AS (
            SELECT
              alert.id,
              alert.status
  
            FROM alerts
              AS alert
  
            LEFT JOIN emergency_cases
              AS emergency
              ON emergency.id =
                 alert.emergency_case_id
  
            LEFT JOIN medical_facilities
              AS facility
              ON facility.id =
                 alert.facility_id
  
            LEFT JOIN ambulances
              AS ambulance
              ON ambulance.id =
                 alert.ambulance_id
  
            WHERE
              alert.created_at >=
                $1::TIMESTAMPTZ
  
              AND alert.created_at <=
                $2::TIMESTAMPTZ
  
              AND (
                $3::SMALLINT IS NULL
  
                OR COALESCE(
                  emergency.governorate_id,
                  facility.governorate_id,
                  ambulance.assigned_governorate_id
                ) = $3::SMALLINT
              )
          )
  
          SELECT
            (
              SELECT COUNT(*)::INTEGER
              FROM facility_history
            ) AS occupancy_reading_count,
  
            (
              SELECT COUNT(
                DISTINCT facility_id
              )::INTEGER
              FROM facility_history
            ) AS monitored_facility_count,
  
            (
              SELECT COUNT(*)::INTEGER
              FROM facility_history
              WHERE status = 'RED'
            ) AS red_occupancy_reading_count,
  
            (
              SELECT
                COALESCE(
                  AVG(
                    occupancy_percentage
                  ),
                  0
                )::DOUBLE PRECISION
  
              FROM facility_history
            ) AS average_occupancy_percentage,
  
            (
              SELECT COUNT(*)::INTEGER
              FROM ambulance_history
            ) AS ambulance_location_reading_count,
  
            (
              SELECT COUNT(
                DISTINCT ambulance_id
              )::INTEGER
              FROM ambulance_history
            ) AS tracked_ambulance_count,
  
            (
              SELECT COUNT(*)::INTEGER
              FROM emergency_history
            ) AS emergency_count,
  
            (
              SELECT COUNT(*)::INTEGER
              FROM emergency_history
              WHERE status = 'RESOLVED'
            ) AS resolved_emergency_count,
  
            (
              SELECT COUNT(*)::INTEGER
              FROM emergency_history
              WHERE status IN (
                'OPEN',
                'AWAITING_MANAGER_CONFIRMATION',
                'DISPATCHED'
              )
            ) AS active_emergency_count,
  
            (
              SELECT COUNT(*)::INTEGER
              FROM dispatch_history
            ) AS dispatch_count,
  
            (
              SELECT COUNT(*)::INTEGER
              FROM dispatch_history
              WHERE status = 'COMPLETED'
            ) AS completed_dispatch_count,
  
            (
              SELECT COUNT(*)::INTEGER
              FROM dispatch_history
              WHERE status IN (
                'ASSIGNED',
                'EN_ROUTE',
                'ARRIVED'
              )
            ) AS active_dispatch_count,
  
            (
              SELECT COUNT(*)::INTEGER
              FROM route_history
            ) AS route_point_count,
  
            (
              SELECT COUNT(*)::INTEGER
              FROM dispatch_status_history
            ) AS dispatch_status_event_count,
  
            (
              SELECT COUNT(*)::INTEGER
              FROM alert_history
            ) AS alert_count,
  
            (
              SELECT COUNT(*)::INTEGER
              FROM alert_history
              WHERE status = 'OPEN'
            ) AS open_alert_count,
  
            (
              SELECT COUNT(*)::INTEGER
              FROM alert_history
              WHERE status = 'ACKNOWLEDGED'
            ) AS acknowledged_alert_count,
  
            (
              SELECT COUNT(*)::INTEGER
              FROM alert_history
              WHERE status = 'RESOLVED'
            ) AS resolved_alert_count;
        `,
        [
          from,
          to,
          governorateId,
        ],
      );
  
    return result.rows[0];
  }
  
  export async function selectFacilityOccupancyHistory({
    from,
    to,
    governorateId,
    facilityId,
    limit,
  }) {
    const result =
      await pool.query(
        `
          SELECT
            occupancy_event.id::TEXT
              AS id,
  
            occupancy_event.event_id::TEXT
              AS event_id,
  
            occupancy_event.facility_id::TEXT
              AS facility_id,
  
            facility.name
              AS facility_name,
  
            facility.facility_type,
  
            facility.total_beds
              AS facility_total_beds,
  
            governorate.id::TEXT
              AS governorate_id,
  
            governorate.name
              AS governorate_name,
  
            governorate.slug
              AS governorate_slug,
  
            occupancy_event.source_device_id,
  
            occupancy_event.sequence_number,
  
            occupancy_event.total_beds,
  
            occupancy_event.occupied_beds,
  
            occupancy_event.available_beds,
  
            occupancy_event.occupancy_percentage
              ::DOUBLE PRECISION
              AS occupancy_percentage,
  
            occupancy_event.status,
  
            occupancy_event.recorded_at,
  
            occupancy_event.received_at,
  
            occupancy_event.payload
  
          FROM facility_occupancy_events
            AS occupancy_event
  
          JOIN medical_facilities
            AS facility
            ON facility.id =
               occupancy_event.facility_id
  
          JOIN governorates
            AS governorate
            ON governorate.id =
               facility.governorate_id
  
          WHERE
            occupancy_event.recorded_at >=
              $1::TIMESTAMPTZ
  
            AND occupancy_event.recorded_at <=
              $2::TIMESTAMPTZ
  
            AND (
              $3::SMALLINT IS NULL
  
              OR facility.governorate_id =
                 $3::SMALLINT
            )
  
            AND (
              $4::BIGINT IS NULL
  
              OR occupancy_event.facility_id =
                 $4::BIGINT
            )
  
          ORDER BY
            occupancy_event.recorded_at ASC,
            occupancy_event.id ASC
  
          LIMIT $5::INTEGER;
        `,
        [
          from,
          to,
          governorateId,
          facilityId,
          limit + 1,
        ],
      );
  
    return result.rows;
  }