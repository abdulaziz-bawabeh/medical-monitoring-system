import { pool } from "../config/databasePool.js";

/**
 * Synthetic development data.
 *
 * These names and coordinates are used only for testing the
 * Proof of Concept. They do not represent verified real-world
 * medical facility records.
 */
const facilities = [
  {
    governorateSlug: "damascus",
    code: "DAM-HOSP-001",
    name: "Damascus Central Medical Center",
    facilityType: "CENTRAL_HOSPITAL",
    address: "Damascus Operations District",
    phone: null,
    totalBeds: 120,
    isOperational: true,
    longitude: 36.2765,
    latitude: 33.5138,
  },
  {
    governorateSlug: "damascus",
    code: "DAM-CLINIC-001",
    name: "Damascus North Emergency Clinic",
    facilityType: "CLINIC",
    address: "North Damascus",
    phone: null,
    totalBeds: 35,
    isOperational: true,
    longitude: 36.3001,
    latitude: 33.521,
  },
  {
    governorateSlug: "aleppo",
    code: "ALE-HOSP-001",
    name: "Aleppo Central Medical Center",
    facilityType: "CENTRAL_HOSPITAL",
    address: "Aleppo Operations District",
    phone: null,
    totalBeds: 160,
    isOperational: true,
    longitude: 37.1343,
    latitude: 36.2021,
  },
  {
    governorateSlug: "homs",
    code: "HMS-FIELD-001",
    name: "Homs Field Medical Point",
    facilityType: "FIELD_MEDICAL_POINT",
    address: "Homs Field Operations Area",
    phone: null,
    totalBeds: 18,
    isOperational: true,
    longitude: 36.7137,
    latitude: 34.7308,
  },
  {
    governorateSlug: "latakia",
    code: "LTA-CLINIC-001",
    name: "Latakia Emergency Clinic",
    facilityType: "CLINIC",
    address: "Latakia Operations District",
    phone: null,
    totalBeds: 40,
    isOperational: true,
    longitude: 35.7806,
    latitude: 35.5317,
  },
];

const ambulances = [
  {
    assignedGovernorateSlug: "damascus",
    baseFacilityCode: "DAM-HOSP-001",
    code: "A-101",
    deviceId: "ambulance-device-101",
    status: "AVAILABLE",
    isOperational: true,
    longitude: 36.282,
    latitude: 33.516,
  },
  {
    assignedGovernorateSlug: "damascus",
    baseFacilityCode: "DAM-CLINIC-001",
    code: "A-102",
    deviceId: "ambulance-device-102",
    status: "AVAILABLE",
    isOperational: true,
    longitude: 36.311,
    latitude: 33.526,
  },
  {
    assignedGovernorateSlug: "damascus",
    baseFacilityCode: "DAM-HOSP-001",
    code: "A-103",
    deviceId: "ambulance-device-103",
    status: "BUSY",
    isOperational: true,
    longitude: 36.262,
    latitude: 33.501,
  },
  {
    assignedGovernorateSlug: "aleppo",
    baseFacilityCode: "ALE-HOSP-001",
    code: "A-205",
    deviceId: "ambulance-device-205",
    status: "AVAILABLE",
    isOperational: true,
    longitude: 37.14,
    latitude: 36.206,
  },
  {
    assignedGovernorateSlug: "homs",
    baseFacilityCode: "HMS-FIELD-001",
    code: "A-310",
    deviceId: "ambulance-device-310",
    status: "MAINTENANCE",
    isOperational: false,
    longitude: 36.72,
    latitude: 34.735,
  },
  {
    assignedGovernorateSlug: "latakia",
    baseFacilityCode: "LTA-CLINIC-001",
    code: "A-401",
    deviceId: "ambulance-device-401",
    status: "AVAILABLE",
    isOperational: true,
    longitude: 35.785,
    latitude: 35.535,
  },
];

/**
 * Loads all active governorates and creates a lookup map:
 *
 * {
 *   damascus: 1,
 *   aleppo: 3,
 *   homs: 4
 * }
 */
async function loadGovernorateIds(client) {
  const result = await client.query(`
    SELECT
      id,
      slug
    FROM governorates
    WHERE is_active = TRUE;
  `);

  return new Map(
    result.rows.map((row) => [
      row.slug,
      row.id,
    ]),
  );
}

/**
 * Creates or updates one medical facility.
 *
 * ST_MakePoint expects:
 * longitude first,
 * latitude second.
 */
async function upsertFacility(
  client,
  governorateIds,
  facility,
) {
  const governorateId =
    governorateIds.get(
      facility.governorateSlug,
    );

  if (!governorateId) {
    throw new Error(
      `Governorate not found: ${facility.governorateSlug}`,
    );
  }

  const result = await client.query(
    `
      INSERT INTO medical_facilities (
        governorate_id,
        code,
        name,
        facility_type,
        address,
        phone,
        total_beds,
        is_operational,
        location
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        ST_SetSRID(
          ST_MakePoint($9, $10),
          4326
        )
      )

      ON CONFLICT (code)
      DO UPDATE SET
        governorate_id =
          EXCLUDED.governorate_id,

        name =
          EXCLUDED.name,

        facility_type =
          EXCLUDED.facility_type,

        address =
          EXCLUDED.address,

        phone =
          EXCLUDED.phone,

        total_beds =
          EXCLUDED.total_beds,

        is_operational =
          EXCLUDED.is_operational,

        location =
          EXCLUDED.location,

        updated_at =
          NOW()

      RETURNING
        id,
        code,
        name;
    `,
    [
      governorateId,
      facility.code,
      facility.name,
      facility.facilityType,
      facility.address,
      facility.phone,
      facility.totalBeds,
      facility.isOperational,
      facility.longitude,
      facility.latitude,
    ],
  );

  return result.rows[0];
}

/**
 * Loads facility IDs using the facility code.
 *
 * {
 *   "DAM-HOSP-001": 1,
 *   "ALE-HOSP-001": 3
 * }
 */
async function loadFacilityIds(client) {
  const result = await client.query(`
    SELECT
      id,
      code
    FROM medical_facilities;
  `);

  return new Map(
    result.rows.map((row) => [
      row.code,
      row.id,
    ]),
  );
}

/**
 * Creates or updates one ambulance.
 */
async function upsertAmbulance(
  client,
  governorateIds,
  facilityIds,
  ambulance,
) {
  const governorateId =
    governorateIds.get(
      ambulance.assignedGovernorateSlug,
    );

  if (!governorateId) {
    throw new Error(
      `Governorate not found: ${ambulance.assignedGovernorateSlug}`,
    );
  }

  const baseFacilityId =
    facilityIds.get(
      ambulance.baseFacilityCode,
    );

  if (!baseFacilityId) {
    throw new Error(
      `Base facility not found: ${ambulance.baseFacilityCode}`,
    );
  }

  const result = await client.query(
    `
      INSERT INTO ambulances (
        assigned_governorate_id,
        base_facility_id,
        code,
        device_id,
        status,
        is_operational,
        current_location,
        last_location_at,
        last_sequence_number
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        ST_SetSRID(
          ST_MakePoint($7, $8),
          4326
        ),
        NOW(),
        0
      )

      ON CONFLICT (code)
      DO UPDATE SET
        assigned_governorate_id =
          EXCLUDED.assigned_governorate_id,

        base_facility_id =
          EXCLUDED.base_facility_id,

        device_id =
          EXCLUDED.device_id,

        status =
          EXCLUDED.status,

        is_operational =
          EXCLUDED.is_operational,

        current_location =
          EXCLUDED.current_location,

        last_location_at =
          NOW(),

        last_sequence_number =
          0,

        updated_at =
          NOW()

      RETURNING
        id,
        code,
        device_id,
        status;
    `,
    [
      governorateId,
      baseFacilityId,
      ambulance.code,
      ambulance.deviceId,
      ambulance.status,
      ambulance.isOperational,
      ambulance.longitude,
      ambulance.latitude,
    ],
  );

  return result.rows[0];
}

async function seedDashboardData() {
  const client =
    await pool.connect();

  try {
    console.log("");
    console.log(
      "Starting Dashboard seed...",
    );

    await client.query("BEGIN");

    const governorateIds =
      await loadGovernorateIds(client);

    const savedFacilities = [];

    for (const facility of facilities) {
      const savedFacility =
        await upsertFacility(
          client,
          governorateIds,
          facility,
        );

      savedFacilities.push(
        savedFacility,
      );

      console.log(
        `Facility saved: ${savedFacility.code} - ${savedFacility.name}`,
      );
    }

    const facilityIds =
      await loadFacilityIds(client);

    const savedAmbulances = [];

    for (const ambulance of ambulances) {
      const savedAmbulance =
        await upsertAmbulance(
          client,
          governorateIds,
          facilityIds,
          ambulance,
        );

      savedAmbulances.push(
        savedAmbulance,
      );

      console.log(
        `Ambulance saved: ${savedAmbulance.code} - ${savedAmbulance.status}`,
      );
    }

    await client.query("COMMIT");

    console.log("");
    console.log(
      "Dashboard seed completed successfully.",
    );

    console.log(
      `Facilities: ${savedFacilities.length}`,
    );

    console.log(
      `Ambulances: ${savedAmbulances.length}`,
    );

    console.log("");
  } catch (error) {
    await client.query("ROLLBACK");

    throw error;
  } finally {
    client.release();
  }
}

seedDashboardData()
  .catch((error) => {
    console.error("");
    console.error(
      "Dashboard seed failed:",
    );

    console.error(error.message);
    console.error("");

    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });