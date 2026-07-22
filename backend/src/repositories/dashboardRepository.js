import { pool } from "../config/databasePool.js";

export async function listActiveGovernorates() {
  const result = await pool.query(`
    SELECT
      id::TEXT AS id,
      name,
      slug,
      boundary IS NOT NULL
        AS has_boundary
    FROM governorates
    WHERE is_active = TRUE
    ORDER BY name;
  `);

  return result.rows;
}

export async function listDashboardFacilities(
  governorateId,
) {
  const result = await pool.query(
    `
      SELECT
        facility.id::TEXT AS id,
        facility.code,
        facility.name,
        facility.facility_type,
        facility.address,
        facility.total_beds,
        facility.is_operational,

        facility.governorate_id::TEXT
          AS governorate_id,

        governorate.name
          AS governorate_name,

        governorate.slug
          AS governorate_slug,

        ST_X(facility.location)
          AS longitude,

        ST_Y(facility.location)
          AS latitude,

        occupancy.last_event_id::TEXT
          AS occupancy_event_id,

        occupancy.source_device_id
          AS occupancy_source_device_id,

        occupancy.sequence_number::TEXT
          AS occupancy_sequence_number,

        occupancy.occupied_beds,

        occupancy.available_beds,

        occupancy.occupancy_percentage::DOUBLE PRECISION
          AS occupancy_percentage,

        occupancy.status
          AS occupancy_status,

        occupancy.recorded_at
          AS occupancy_recorded_at

      FROM medical_facilities
        AS facility

      JOIN governorates
        AS governorate
        ON governorate.id =
           facility.governorate_id

      LEFT JOIN facility_current_occupancy
        AS occupancy
        ON occupancy.facility_id =
           facility.id

      WHERE (
        $1::SMALLINT IS NULL
        OR facility.governorate_id = $1
      )

      ORDER BY
        facility.name;
    `,
    [
      governorateId ?? null,
    ],
  );

  return result.rows;
}

export async function listDashboardAmbulances(
  governorateId,
) {
  const result = await pool.query(
    `
      SELECT
        ambulance.id::TEXT AS id,
        ambulance.code,
        ambulance.device_id,
        ambulance.status,
        ambulance.is_operational,

        ambulance.assigned_governorate_id::TEXT
          AS governorate_id,

        governorate.name
          AS governorate_name,

        governorate.slug
          AS governorate_slug,

        ambulance.base_facility_id::TEXT
          AS base_facility_id,

        facility.name
          AS base_facility_name,

        ST_X(
          ambulance.current_location
        ) AS longitude,

        ST_Y(
          ambulance.current_location
        ) AS latitude,

        ambulance.last_location_at,

        ambulance.last_sequence_number::TEXT
          AS last_sequence_number

      FROM ambulances
        AS ambulance

      JOIN governorates
        AS governorate
        ON governorate.id =
           ambulance.assigned_governorate_id

      LEFT JOIN medical_facilities
        AS facility
        ON facility.id =
           ambulance.base_facility_id

      WHERE (
        $1::SMALLINT IS NULL
        OR ambulance.assigned_governorate_id = $1
      )

      ORDER BY
        ambulance.code;
    `,
    [
      governorateId ?? null,
    ],
  );

  return result.rows;
}