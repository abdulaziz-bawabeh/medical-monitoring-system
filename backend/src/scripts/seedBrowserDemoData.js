import {
    pool,
  } from "../config/databasePool.js";
  
  const REQUIRED_CONFIRMATION =
    "RESET_OPERATIONAL_DEMO_DATA";
  
  const confirmation =
    process.env
      .DEMO_SEED_CONFIRM;
  
  if (
    confirmation !==
    REQUIRED_CONFIRMATION
  ) {
    throw new Error(
      [
        "Browser demo seed was blocked.",
        "",
        "This script resets operational demo data.",
        "Add the following value to backend/.env:",
        "",
        `DEMO_SEED_CONFIRM=${REQUIRED_CONFIRMATION}`,
      ].join("\n"),
    );
  }
  
  const SEED_TAG =
    "browser-demo-v1";
  
  const DEVICE_SOURCE =
    "browser-demo-seeder";
  
  const scriptStartedAt =
    Date.now();
  
  function isoAgo(
    seconds,
  ) {
    return new Date(
      scriptStartedAt -
        seconds * 1000,
    ).toISOString();
  }
  
  function isoAfter(
    seconds,
  ) {
    return new Date(
      scriptStartedAt +
        seconds * 1000,
    ).toISOString();
  }
  
  function demoPayload(
    extra = {},
  ) {
    return JSON.stringify({
      seedTag:
        SEED_TAG,
  
      synthetic:
        true,
  
      ...extra,
    });
  }
  
  function mapRowsBy(
    rows,
    key,
  ) {
    return Object.fromEntries(
      rows.map(
        (row) => [
          row[key],
          row,
        ],
      ),
    );
  }
  
  function requireRecords(
    recordMap,
    requiredKeys,
    resourceName,
  ) {
    const missing =
      requiredKeys.filter(
        (key) =>
          !recordMap[key],
      );
  
    if (
      missing.length > 0
    ) {
      throw new Error(
        `${resourceName} records are missing: ${missing.join(", ")}`,
      );
    }
  }
  
  async function getTableColumns(
    client,
    tableName,
  ) {
    const result =
      await client.query(
        `
          SELECT
            column_name,
            is_generated,
            is_identity
  
          FROM information_schema.columns
  
          WHERE
            table_schema = 'public'
            AND table_name = $1;
        `,
        [
          tableName,
        ],
      );
  
    if (
      result.rows.length === 0
    ) {
      throw new Error(
        `Required table does not exist: ${tableName}`,
      );
    }
  
    return new Map(
      result.rows.map(
        (row) => [
          row.column_name,
          row,
        ],
      ),
    );
  }
  
  function canInsertColumn(
    columns,
    columnName,
  ) {
    const column =
      columns.get(
        columnName,
      );
  
    return (
      column &&
      column.is_generated !==
        "ALWAYS" &&
      column.is_identity !==
        "YES"
    );
  }
  
  function findSourceColumn(
    columns,
  ) {
    const candidates = [
      "source_device_id",
      "device_id",
      "source_id",
      "source",
    ];
  
    return (
      candidates.find(
        (columnName) =>
          canInsertColumn(
            columns,
            columnName,
          ),
      ) ?? null
    );
  }

  function findInsertableColumn(
    columns,
    candidateNames,
  ) {
    return (
      candidateNames.find(
        (columnName) =>
          canInsertColumn(
            columns,
            columnName,
          ),
      ) ?? null
    );
  }
  
  function requireInsertableColumn(
    columns,
    candidateNames,
    tableName,
    logicalFieldName,
  ) {
    const columnName =
      findInsertableColumn(
        columns,
        candidateNames,
      );
  
    if (!columnName) {
      throw new Error(
        [
          `No insertable column was found for ${logicalFieldName}.`,
          `Table: ${tableName}.`,
          `Expected one of: ${candidateNames.join(", ")}.`,
        ].join(" "),
      );
    }
  
    return columnName;
  }
  
  async function resetOperationalData(
    client,
  ) {
    console.log(
      "Resetting operational demo data...",
    );
  
    await client.query(`
      TRUNCATE TABLE
        dispatch_route_points,
        dispatch_status_events,
        alerts,
        ambulance_dispatches,
        dispatch_recommendations,
        emergency_cases,
        facility_current_occupancy,
        facility_occupancy_events,
        ambulance_location_events
  
      RESTART IDENTITY
      CASCADE;
    `);
  
    const streamSequenceResult =
      await client.query(`
        SELECT
          TO_REGCLASS(
            'public.stream_sequence'
          ) AS table_name;
      `);
  
    if (
      streamSequenceResult
        .rows[0]
        .table_name
    ) {
      await client.query(`
        TRUNCATE TABLE
          stream_sequence
        RESTART IDENTITY;
      `);
    }
  }

  async function ensureDemoAmbulances(
    client,
  ) {
    console.log(
      "Ensuring demo ambulances exist...",
    );
  
    /*
     * Actual ambulances table columns:
     *
     * assigned_governorate_id
     * base_facility_id
     * code
     * device_id
     *
     * Both assigned_governorate_id and device_id are required.
     */
    const ambulanceDefinitions = [
      {
        code: "A-104",
  
        deviceId:
          "ambulance-device-104",
  
        facilityName:
          "Homs Field Medical Point",
  
        governorateSlug:
          "homs",
      },
  
      {
        code: "A-105",
  
        deviceId:
          "ambulance-device-105",
  
        facilityName:
          "Latakia Emergency Clinic",
  
        governorateSlug:
          "latakia",
      },
  
      {
        code: "A-106",
  
        deviceId:
          "ambulance-device-106",
  
        facilityName:
          "Aleppo Central Medical Center",
  
        governorateSlug:
          "aleppo",
      },
    ];
  
    for (
      const definition of
      ambulanceDefinitions
    ) {
      const resourceResult =
        await client.query(
          `
            SELECT
              facility.id::TEXT
                AS facility_id,
  
              facility.name
                AS facility_name,
  
              governorate.id::TEXT
                AS governorate_id,
  
              governorate.name
                AS governorate_name
  
            FROM medical_facilities
              AS facility
  
            CROSS JOIN governorates
              AS governorate
  
            WHERE
              facility.name = $1
  
              AND governorate.slug =
                $2
  
            LIMIT 1;
          `,
          [
            definition.facilityName,
            definition.governorateSlug,
          ],
        );
  
      const resources =
        resourceResult.rows[0];
  
      if (!resources) {
        throw new Error(
          [
            `Cannot create ${definition.code}.`,
            `Facility: ${definition.facilityName}`,
            `Governorate: ${definition.governorateSlug}`,
          ].join(" "),
        );
      }
  
      const insertResult =
        await client.query(
          `
            INSERT INTO ambulances (
              assigned_governorate_id,
              base_facility_id,
              code,
              device_id,
              status,
              is_operational,
              last_sequence_number,
              created_at,
              updated_at
            )
            VALUES (
              $1::SMALLINT,
              $2::BIGINT,
              $3,
              $4,
              'AVAILABLE',
              TRUE,
              0,
              NOW(),
              NOW()
            )
  
            ON CONFLICT (code)
            DO UPDATE SET
              assigned_governorate_id =
                EXCLUDED.assigned_governorate_id,
  
              base_facility_id =
                EXCLUDED.base_facility_id,
  
              device_id =
                EXCLUDED.device_id,
  
              updated_at =
                NOW()
  
            RETURNING
              id::TEXT AS id,
              code,
              device_id;
          `,
          [
            resources.governorate_id,
            resources.facility_id,
            definition.code,
            definition.deviceId,
          ],
        );
  
      const ambulance =
        insertResult.rows[0];
  
      console.log(
        [
          `Demo ambulance ready: ${ambulance.code}`,
          `device=${ambulance.device_id}`,
          `facility=${resources.facility_name}`,
          `governorate=${resources.governorate_name}`,
        ].join(" | "),
      );
    }
  }

  async function loadBaseResources(
    client,
  ) {
    const managerResult =
      await client.query(`
        SELECT
          id::TEXT AS id,
          full_name,
          email
  
        FROM users
  
        WHERE
          role = 'health_manager'
          AND is_active = TRUE
  
        ORDER BY id
  
        LIMIT 1;
      `);
  
    const manager =
      managerResult.rows[0];
  
    if (!manager) {
      throw new Error(
        "No active health_manager user was found.",
      );
    }
  
    const governorateResult =
      await client.query(`
        SELECT
          id::TEXT AS id,
          name,
          slug
  
        FROM governorates
  
        WHERE is_active = TRUE;
      `);
  
    const governorates =
      mapRowsBy(
        governorateResult.rows,
        "slug",
      );
  
    requireRecords(
      governorates,
      [
        "damascus",
        "deir-ez-zor",
        "homs",
        "latakia",
        "aleppo",
      ],
      "Governorate",
    );
  
    const facilityNames = [
      "Aleppo Central Medical Center",
      "Damascus Central Medical Center",
      "Damascus North Emergency Clinic",
      "Homs Field Medical Point",
      "Latakia Emergency Clinic",
    ];
  
    const facilityResult =
      await client.query(
        `
          SELECT
            id::TEXT AS id,
            name,
            total_beds
  
          FROM medical_facilities
  
          WHERE name =
            ANY($1::TEXT[]);
        `,
        [
          facilityNames,
        ],
      );
  
    const facilities =
      mapRowsBy(
        facilityResult.rows,
        "name",
      );
  
    requireRecords(
      facilities,
      facilityNames,
      "Medical facility",
    );
    await ensureDemoAmbulances(
        client,
      );
    const ambulanceCodes = [
      "A-101",
      "A-102",
      "A-103",
      "A-104",
      "A-105",
      "A-106",
    ];
  
    const ambulanceResult =
      await client.query(
        `
          SELECT
            id::TEXT AS id,
            code
  
          FROM ambulances
  
          WHERE code =
            ANY($1::TEXT[]);
        `,
        [
          ambulanceCodes,
        ],
      );
  
    const ambulances =
      mapRowsBy(
        ambulanceResult.rows,
        "code",
      );
  
    requireRecords(
      ambulances,
      ambulanceCodes,
      "Ambulance",
    );
  
    return {
      manager,
      governorates,
      facilities,
      ambulances,
    };
  }
  
  async function insertFacilityOccupancy(
    client,
    {
      tableName,
      facility,
      eventId,
      sequenceNumber,
      occupiedBeds,
      recordedAt,
    },
  ) {
    const columns =
      await getTableColumns(
        client,
        tableName,
      );
  
    const totalBeds =
      Number(
        facility.total_beds,
      );
  
    const availableBeds =
      totalBeds -
      occupiedBeds;
  
    const occupancyPercentage =
      Number(
        (
          occupiedBeds /
          totalBeds *
          100
        ).toFixed(2),
      );
  
    const status =
      occupancyPercentage > 90
        ? "RED"
        : "GREEN";
  
    const insertColumns = [];
    const insertValues = [];
    const parameters = [];
  
    function addParameter(
      columnName,
      value,
      cast = "",
    ) {
      if (
        !columnName ||
        !canInsertColumn(
          columns,
          columnName,
        )
      ) {
        return;
      }
  
      parameters.push(
        value,
      );
  
      insertColumns.push(
        columnName,
      );
  
      insertValues.push(
        `$${parameters.length}${cast}`,
      );
    }
  
    /*
     * facility_current_occupancy uses names such as:
     *
     * last_event_id
     * last_sequence_number
     * last_recorded_at
     * last_received_at
     *
     * facility_occupancy_events normally uses:
     *
     * event_id
     * sequence_number
     * recorded_at
     * received_at
     */
    const isCurrentOccupancyTable =
      tableName ===
      "facility_current_occupancy";
  
    const eventColumn =
      requireInsertableColumn(
        columns,
  
        isCurrentOccupancyTable
          ? [
              "last_event_id",
              "event_id",
            ]
          : [
              "event_id",
              "last_event_id",
            ],
  
        tableName,
        "event identifier",
      );
  
    const sequenceColumn =
      requireInsertableColumn(
        columns,
  
        isCurrentOccupancyTable
          ? [
              "last_sequence_number",
              "sequence_number",
            ]
          : [
              "sequence_number",
              "last_sequence_number",
            ],
  
        tableName,
        "sequence number",
      );
  
    const recordedAtColumn =
      requireInsertableColumn(
        columns,
  
        isCurrentOccupancyTable
          ? [
              "last_recorded_at",
              "recorded_at",
            ]
          : [
              "recorded_at",
              "last_recorded_at",
            ],
  
        tableName,
        "recorded time",
      );
  
    const receivedAtColumn =
      findInsertableColumn(
        columns,
  
        isCurrentOccupancyTable
          ? [
              "last_received_at",
              "received_at",
            ]
          : [
              "received_at",
              "last_received_at",
            ],
      );
  
    addParameter(
      "facility_id",
      facility.id,
      "::BIGINT",
    );
  
    addParameter(
      eventColumn,
      eventId,
      "::UUID",
    );
  
    const sourceColumn =
      findSourceColumn(
        columns,
      );
  
    if (sourceColumn) {
      addParameter(
        sourceColumn,
        `${DEVICE_SOURCE}:${facility.id}`,
      );
    }
  
    addParameter(
      sequenceColumn,
      sequenceNumber,
      "::BIGINT",
    );
  
    /*
     * Generated columns are automatically skipped by
     * canInsertColumn().
     */
    addParameter(
      "total_beds",
      totalBeds,
      "::INTEGER",
    );
  
    addParameter(
      "occupied_beds",
      occupiedBeds,
      "::INTEGER",
    );
  
    addParameter(
      "available_beds",
      availableBeds,
      "::INTEGER",
    );
  
    addParameter(
      "occupancy_percentage",
      occupancyPercentage,
      "::NUMERIC",
    );
  
    addParameter(
      "status",
      status,
    );
  
    addParameter(
      recordedAtColumn,
      recordedAt,
      "::TIMESTAMPTZ",
    );
  
    if (receivedAtColumn) {
      addParameter(
        receivedAtColumn,
        recordedAt,
        "::TIMESTAMPTZ",
      );
    }
  
    addParameter(
      "payload",
      demoPayload({
        scenario:
          "facility-occupancy",
  
        tableName,
      }),
      "::JSONB",
    );
  
    addParameter(
      "created_at",
      recordedAt,
      "::TIMESTAMPTZ",
    );
  
    addParameter(
      "updated_at",
      recordedAt,
      "::TIMESTAMPTZ",
    );
  
    await client.query(
      `
        INSERT INTO ${tableName} (
          ${insertColumns.join(", ")}
        )
        VALUES (
          ${insertValues.join(", ")}
        );
      `,
      parameters,
    );
  
    return {
      status,
      occupancyPercentage,
      availableBeds,
    };
  }
  async function seedFacilityOccupancy(
    client,
    facilities,
  ) {
    console.log(
      "Seeding facility occupancy...",
    );
  
    const scenarios = [
      {
        facilityName:
          "Aleppo Central Medical Center",
  
        eventId:
          "11000000-0000-4000-8000-000000000001",
  
        sequenceNumber:
          1001,
  
        occupiedBeds:
          152,
  
        recordedAt:
          isoAgo(30),
      },
      {
        facilityName:
          "Damascus Central Medical Center",
  
        eventId:
          "11000000-0000-4000-8000-000000000002",
  
        sequenceNumber:
          1002,
  
        occupiedBeds:
          80,
  
        recordedAt:
          isoAgo(25),
      },
      {
        facilityName:
          "Damascus North Emergency Clinic",
  
        eventId:
          "11000000-0000-4000-8000-000000000003",
  
        sequenceNumber:
          1003,
  
        occupiedBeds:
          32,
  
        recordedAt:
          isoAgo(20),
      },
      {
        facilityName:
          "Homs Field Medical Point",
  
        eventId:
          "11000000-0000-4000-8000-000000000004",
  
        sequenceNumber:
          1004,
  
        occupiedBeds:
          9,
  
        recordedAt:
          isoAgo(15),
      },
      {
        facilityName:
          "Latakia Emergency Clinic",
  
        eventId:
          "11000000-0000-4000-8000-000000000005",
  
        sequenceNumber:
          1005,
  
        occupiedBeds:
          36,
  
        recordedAt:
          isoAgo(10),
      },
    ];
  
    for (
      const scenario of
      scenarios
    ) {
      const facility =
        facilities[
          scenario
            .facilityName
        ];
  
      const result =
        await insertFacilityOccupancy(
          client,
          {
            tableName:
              "facility_current_occupancy",
  
            facility,
            ...scenario,
          },
        );
  
      await insertFacilityOccupancy(
        client,
        {
          tableName:
            "facility_occupancy_events",
  
          facility,
          ...scenario,
        },
      );
  
      console.log(
        [
          facility.name,
          `${result.occupancyPercentage}%`,
          result.status,
          `${result.availableBeds} available beds`,
        ].join(" | "),
      );
    }
  }
  
  async function insertAmbulanceLocationEvent(
    client,
    {
      ambulance,
      eventId,
      sequenceNumber,
      longitude,
      latitude,
      speedKmh,
      headingDegrees,
      recordedAt,
    },
  ) {
    const columns =
      await getTableColumns(
        client,
        "ambulance_location_events",
      );
  
    const insertColumns = [];
    const insertValues = [];
    const parameters = [];
  
    function addParameter(
      columnName,
      value,
      cast = "",
    ) {
      if (
        !canInsertColumn(
          columns,
          columnName,
        )
      ) {
        return;
      }
  
      parameters.push(
        value,
      );
  
      insertColumns.push(
        columnName,
      );
  
      insertValues.push(
        `$${parameters.length}${cast}`,
      );
    }
  
    addParameter(
      "ambulance_id",
      ambulance.id,
      "::BIGINT",
    );
  
    addParameter(
      "event_id",
      eventId,
      "::UUID",
    );
  
    const sourceColumn =
      findSourceColumn(
        columns,
      );
  
    if (sourceColumn) {
      addParameter(
        sourceColumn,
        `${DEVICE_SOURCE}:${ambulance.code}`,
      );
    }
  
    addParameter(
      "sequence_number",
      sequenceNumber,
      "::BIGINT",
    );
  
    if (
      canInsertColumn(
        columns,
        "location",
      )
    ) {
      parameters.push(
        longitude,
        latitude,
      );
  
      insertColumns.push(
        "location",
      );
  
      insertValues.push(
        `ST_SetSRID(
          ST_MakePoint(
            $${parameters.length - 1},
            $${parameters.length}
          ),
          4326
        )`,
      );
    }
  
    addParameter(
      "speed_kmh",
      speedKmh,
      "::NUMERIC",
    );
  
    addParameter(
      "heading_degrees",
      headingDegrees,
      "::NUMERIC",
    );
  
    addParameter(
      "recorded_at",
      recordedAt,
      "::TIMESTAMPTZ",
    );
  
    addParameter(
      "received_at",
      recordedAt,
      "::TIMESTAMPTZ",
    );
  
    addParameter(
      "is_recovered",
      false,
      "::BOOLEAN",
    );
  
    addParameter(
      "payload",
      demoPayload({
        scenario:
          "ambulance-location",
      }),
      "::JSONB",
    );
  
    addParameter(
      "created_at",
      recordedAt,
      "::TIMESTAMPTZ",
    );
  
    await client.query(
      `
        INSERT INTO ambulance_location_events (
          ${insertColumns.join(", ")}
        )
        VALUES (
          ${insertValues.join(", ")}
        );
      `,
      parameters,
    );
  }
  
  async function seedAmbulances(
    client,
    ambulances,
  ) {
    console.log(
      "Seeding ambulance states...",
    );
  
    const scenarios = [
      {
        code: "A-101",
        status: "AVAILABLE",
        isOperational: true,
        longitude: 36.3000,
        latitude: 33.5200,
        locationAgeSeconds: 20,
        sequenceNumber: 2001,
        speedKmh: 0,
        headingDegrees: 0,
        description:
          "Eligible recent ambulance near Damascus",
      },
      {
        code: "A-102",
        status: "AVAILABLE",
        isOperational: true,
        longitude: 36.2950,
        latitude: 33.5180,
        locationAgeSeconds: 600,
        sequenceNumber: 2002,
        speedKmh: 0,
        headingDegrees: 0,
        description:
          "Available ambulance with stale location",
      },
      {
        code: "A-103",
        status: "BUSY",
        isOperational: true,
        longitude: 36.3100,
        latitude: 33.5250,
        locationAgeSeconds: 25,
        sequenceNumber: 2003,
        speedKmh: 0,
        headingDegrees: 0,
        description:
          "Busy ambulance with ASSIGNED dispatch",
      },
      {
        code: "A-104",
        status: "BUSY",
        isOperational: true,
        longitude: 36.7350,
        latitude: 34.7370,
        locationAgeSeconds: 10,
        sequenceNumber: 2004,
        speedKmh: 42,
        headingDegrees: 70,
        description:
          "Busy ambulance with EN_ROUTE dispatch",
      },
      {
        code: "A-105",
        status: "AVAILABLE",
        isOperational: true,
        longitude: 35.7800,
        latitude: 35.5200,
        locationAgeSeconds: 30,
        sequenceNumber: 2005,
        speedKmh: 0,
        headingDegrees: 0,
        description:
          "Eligible recent ambulance near Latakia",
      },
      {
        code: "A-106",
        status: "MAINTENANCE",
        isOperational: false,
        longitude: 37.1400,
        latitude: 36.2100,
        locationAgeSeconds: 40,
        sequenceNumber: 2006,
        speedKmh: 0,
        headingDegrees: 0,
        description:
          "Ambulance excluded because it is under maintenance",
      },
    ];
  
    for (
      const scenario of
      scenarios
    ) {
      const ambulance =
        ambulances[
          scenario.code
        ];
  
      const recordedAt =
        isoAgo(
          scenario
            .locationAgeSeconds,
        );
  
      await client.query(
        `
          UPDATE ambulances
  
          SET
            status = $2,
  
            is_operational = $3,
  
            current_location =
              ST_SetSRID(
                ST_MakePoint(
                  $4,
                  $5
                ),
                4326
              ),
  
            last_location_at =
              $6::TIMESTAMPTZ,
  
            last_sequence_number =
              $7::BIGINT,
  
            updated_at = NOW()
  
          WHERE id =
            $1::BIGINT;
        `,
        [
          ambulance.id,
          scenario.status,
          scenario.isOperational,
          scenario.longitude,
          scenario.latitude,
          recordedAt,
          scenario.sequenceNumber,
        ],
      );
  
      await insertAmbulanceLocationEvent(
        client,
        {
          ambulance,
  
          eventId:
            `12000000-0000-4000-8000-${String(
              scenario
                .sequenceNumber,
            ).padStart(
              12,
              "0",
            )}`,
  
          sequenceNumber:
            scenario
              .sequenceNumber,
  
          longitude:
            scenario.longitude,
  
          latitude:
            scenario.latitude,
  
          speedKmh:
            scenario.speedKmh,
  
          headingDegrees:
            scenario
              .headingDegrees,
  
          recordedAt,
        },
      );
  
      console.log(
        [
          scenario.code,
          scenario.status,
          scenario
            .isOperational
            ? "operational"
            : "not operational",
          `${scenario.locationAgeSeconds}s old`,
          scenario.description,
        ].join(" | "),
      );
    }
  }
  
  async function insertEmergency(
    client,
    manager,
    governorate,
    scenario,
  ) {
    const result =
      await client.query(
        `
          INSERT INTO emergency_cases (
            event_id,
            case_number,
            created_by_user_id,
            governorate_id,
            summary,
            status,
            location,
            reported_at,
            received_at,
            resolved_at,
            payload
          )
          VALUES (
            $1::UUID,
            $2,
            $3::BIGINT,
            $4::SMALLINT,
            $5,
            $6,
  
            ST_SetSRID(
              ST_MakePoint(
                $7,
                $8
              ),
              4326
            ),
  
            $9::TIMESTAMPTZ,
  
            GREATEST(
              NOW(),
              $9::TIMESTAMPTZ
            ),
  
            $10::TIMESTAMPTZ,
  
            $11::JSONB
          )
  
          RETURNING
            id::TEXT AS id,
            case_number,
            status;
        `,
        [
          scenario.eventId,
          scenario.caseNumber,
          manager.id,
          governorate.id,
          scenario.summary,
          scenario.status,
          scenario.longitude,
          scenario.latitude,
          scenario.reportedAt,
          scenario.resolvedAt,
          demoPayload({
            scenario:
              scenario.scenario,
          }),
        ],
      );
  
    return result.rows[0];
  }
  
  async function seedEmergencyCases(
    client,
    {
      manager,
      governorates,
    },
  ) {
    console.log(
      "Seeding emergency cases...",
    );
  
    const scenarios = {
      openDamascus: {
        eventId:
          "13000000-0000-4000-8000-000000000001",
  
        caseNumber:
          "EMR-DEMO-OPEN-DAMASCUS",
  
        governorateSlug:
          "damascus",
  
        summary:
          "Browser demo: generate and confirm a normal Damascus ambulance recommendation.",
  
        status:
          "OPEN",
  
        longitude:
          36.2900,
  
        latitude:
          33.5150,
  
        reportedAt:
          isoAgo(300),
  
        resolvedAt:
          null,
  
        scenario:
          "happy-path-recommendation",
      },
  
      noEligibleDeir: {
        eventId:
          "13000000-0000-4000-8000-000000000002",
  
        caseNumber:
          "EMR-DEMO-NO-ELIGIBLE",
  
        governorateSlug:
          "deir-ez-zor",
  
        summary:
          "Browser demo: no eligible recent ambulance exists within the configured distance.",
  
        status:
          "OPEN",
  
        longitude:
          40.1400,
  
        latitude:
          35.3300,
  
        reportedAt:
          isoAgo(270),
  
        resolvedAt:
          null,
  
        scenario:
          "no-eligible-ambulance",
      },
  
      stalePending: {
        eventId:
          "13000000-0000-4000-8000-000000000003",
  
        caseNumber:
          "EMR-DEMO-STALE-CONFIRMATION",
  
        governorateSlug:
          "damascus",
  
        summary:
          "Browser demo: pending recommendation whose ambulance current location is stale.",
  
        status:
          "AWAITING_MANAGER_CONFIRMATION",
  
        longitude:
          36.2920,
  
        latitude:
          33.5160,
  
        reportedAt:
          isoAgo(240),
  
        resolvedAt:
          null,
  
        scenario:
          "stale-recommendation-confirmation",
      },
  
      assigned: {
        eventId:
          "13000000-0000-4000-8000-000000000004",
  
        caseNumber:
          "EMR-DEMO-ASSIGNED",
  
        governorateSlug:
          "damascus",
  
        summary:
          "Browser demo: an ambulance has been assigned but has not started moving.",
  
        status:
          "DISPATCHED",
  
        longitude:
          36.3200,
  
        latitude:
          33.5300,
  
        reportedAt:
          isoAgo(900),
  
        resolvedAt:
          null,
  
        scenario:
          "assigned-dispatch",
      },
  
      enRoute: {
        eventId:
          "13000000-0000-4000-8000-000000000005",
  
        caseNumber:
          "EMR-DEMO-EN-ROUTE",
  
        governorateSlug:
          "homs",
  
        summary:
          "Browser demo: an ambulance is travelling toward an emergency in Homs.",
  
        status:
          "DISPATCHED",
  
        longitude:
          36.7500,
  
        latitude:
          34.7450,
  
        reportedAt:
          isoAgo(1200),
  
        resolvedAt:
          null,
  
        scenario:
          "en-route-dispatch",
      },
  
      completed: {
        eventId:
          "13000000-0000-4000-8000-000000000006",
  
        caseNumber:
          "EMR-DEMO-COMPLETED",
  
        governorateSlug:
          "latakia",
  
        summary:
          "Browser demo: a completed historical ambulance response.",
  
        status:
          "RESOLVED",
  
        longitude:
          35.7900,
  
        latitude:
          35.5300,
  
        reportedAt:
          isoAgo(86400),
  
        resolvedAt:
          isoAgo(82800),
  
        scenario:
          "completed-dispatch",
      },
    };
  
    const inserted = {};
  
    for (
      const [
        key,
        scenario,
      ] of Object.entries(
        scenarios,
      )
    ) {
      inserted[key] =
        await insertEmergency(
          client,
          manager,
          governorates[
            scenario
              .governorateSlug
          ],
          scenario,
        );
  
      inserted[key] = {
        ...inserted[key],
        ...scenario,
      };
  
      console.log(
        `${scenario.caseNumber} | ${scenario.status}`,
      );
    }
  
    return inserted;
  }
  
  async function insertRecommendation(
    client,
    {
      emergency,
      ambulance,
      manager,
      eventId,
      status,
      distanceMeters,
      generatedAt,
      expiresAt,
      ambulanceLocationRecordedAt,
      ambulanceLocationAgeSeconds,
      confirmedAt = null,
      scenario,
    },
  ) {
    const result =
      await client.query(
        `
          INSERT INTO dispatch_recommendations (
            event_id,
            emergency_case_id,
            ambulance_id,
            requested_by_user_id,
            status,
            distance_meters,
            emergency_location,
            ambulance_location,
            ambulance_location_recorded_at,
            ambulance_location_age_seconds,
            max_location_age_seconds,
            generated_at,
            expires_at,
            confirmed_by_user_id,
            confirmed_at,
            payload
          )
          VALUES (
            $1::UUID,
            $2::BIGINT,
            $3::BIGINT,
            $4::BIGINT,
            $5,
            $6,
  
            ST_SetSRID(
              ST_MakePoint(
                $7,
                $8
              ),
              4326
            ),
  
            ST_SetSRID(
              ST_MakePoint(
                $9,
                $10
              ),
              4326
            ),
  
            $11::TIMESTAMPTZ,
            $12::INTEGER,
            120,
            $13::TIMESTAMPTZ,
            $14::TIMESTAMPTZ,
  
            CASE
              WHEN $5 = 'CONFIRMED'
                THEN $4::BIGINT
              ELSE NULL
            END,
  
            $15::TIMESTAMPTZ,
  
            $16::JSONB
          )
  
          RETURNING
            id::TEXT AS id,
            status;
        `,
        [
          eventId,
          emergency.id,
          ambulance.id,
          manager.id,
          status,
          distanceMeters,
          emergency.longitude,
          emergency.latitude,
          ambulance.longitude,
          ambulance.latitude,
          ambulanceLocationRecordedAt,
          ambulanceLocationAgeSeconds,
          generatedAt,
          expiresAt,
          confirmedAt,
          demoPayload({
            scenario,
          }),
        ],
      );
  
    return result.rows[0];
  }
  
  async function seedRecommendations(
    client,
    {
      emergencies,
      ambulances,
      manager,
    },
  ) {
    console.log(
      "Seeding recommendations...",
    );
  
    const ambulanceLocations = {
      "A-102": {
        longitude: 36.2950,
        latitude: 33.5180,
      },
  
      "A-103": {
        longitude: 36.3100,
        latitude: 33.5250,
      },
  
      "A-104": {
        longitude: 36.7000,
        latitude: 34.7200,
      },
  
      "A-105": {
        longitude: 35.7800,
        latitude: 35.5200,
      },
    };
  
    const stalePending =
      await insertRecommendation(
        client,
        {
          emergency:
            emergencies
              .stalePending,
  
          ambulance: {
            ...ambulances[
              "A-102"
            ],
  
            ...ambulanceLocations[
              "A-102"
            ],
          },
  
          manager,
  
          eventId:
            "14000000-0000-4000-8000-000000000001",
  
          status:
            "PENDING",
  
          distanceMeters:
            740,
  
          generatedAt:
            isoAgo(60),
  
          expiresAt:
            isoAfter(1800),
  
          ambulanceLocationRecordedAt:
            isoAgo(60),
  
          ambulanceLocationAgeSeconds:
            60,
  
          scenario:
            "stale-pending-recommendation",
        },
      );
  
    const assigned =
      await insertRecommendation(
        client,
        {
          emergency:
            emergencies.assigned,
  
          ambulance: {
            ...ambulances[
              "A-103"
            ],
  
            ...ambulanceLocations[
              "A-103"
            ],
          },
  
          manager,
  
          eventId:
            "14000000-0000-4000-8000-000000000002",
  
          status:
            "CONFIRMED",
  
          distanceMeters:
            1450,
  
          generatedAt:
            isoAgo(850),
  
          expiresAt:
            isoAgo(550),
  
          ambulanceLocationRecordedAt:
            isoAgo(850),
  
          ambulanceLocationAgeSeconds:
            20,
  
          confirmedAt:
            isoAgo(800),
  
          scenario:
            "confirmed-assigned-recommendation",
        },
      );
  
    const enRoute =
      await insertRecommendation(
        client,
        {
          emergency:
            emergencies.enRoute,
  
          ambulance: {
            ...ambulances[
              "A-104"
            ],
  
            ...ambulanceLocations[
              "A-104"
            ],
          },
  
          manager,
  
          eventId:
            "14000000-0000-4000-8000-000000000003",
  
          status:
            "CONFIRMED",
  
          distanceMeters:
            5200,
  
          generatedAt:
            isoAgo(1150),
  
          expiresAt:
            isoAgo(850),
  
          ambulanceLocationRecordedAt:
            isoAgo(1150),
  
          ambulanceLocationAgeSeconds:
            25,
  
          confirmedAt:
            isoAgo(1100),
  
          scenario:
            "confirmed-en-route-recommendation",
        },
      );
  
    const completed =
      await insertRecommendation(
        client,
        {
          emergency:
            emergencies.completed,
  
          ambulance: {
            ...ambulances[
              "A-105"
            ],
  
            ...ambulanceLocations[
              "A-105"
            ],
          },
  
          manager,
  
          eventId:
            "14000000-0000-4000-8000-000000000004",
  
          status:
            "CONFIRMED",
  
          distanceMeters:
            3100,
  
          generatedAt:
            isoAgo(86000),
  
          expiresAt:
            isoAgo(85700),
  
          ambulanceLocationRecordedAt:
            isoAgo(86000),
  
          ambulanceLocationAgeSeconds:
            30,
  
          confirmedAt:
            isoAgo(85900),
  
          scenario:
            "confirmed-completed-recommendation",
        },
      );
  
    return {
      stalePending,
      assigned,
      enRoute,
      completed,
    };
  }
  
  async function insertDispatch(
    client,
    {
      emergency,
      ambulance,
      recommendation,
      manager,
      eventId,
      dispatchNumber,
      status,
      startLongitude,
      startLatitude,
      distanceMeters,
      assignedAt,
      enRouteAt = null,
      arrivedAt = null,
      completedAt = null,
      lastRouteSequenceNumber = 0,
      lastRoutePointAt = null,
      scenario,
    },
  ) {
    const result =
      await client.query(
        `
          INSERT INTO ambulance_dispatches (
            event_id,
            dispatch_number,
            recommendation_id,
            emergency_case_id,
            ambulance_id,
            confirmed_by_user_id,
            status,
            emergency_location,
            ambulance_start_location,
            assigned_distance_meters,
            assigned_at,
            en_route_at,
            arrived_at,
            completed_at,
            last_route_sequence_number,
            last_route_point_at,
            payload
          )
          VALUES (
            $1::UUID,
            $2,
            $3::BIGINT,
            $4::BIGINT,
            $5::BIGINT,
            $6::BIGINT,
            $7,
  
            ST_SetSRID(
              ST_MakePoint(
                $8,
                $9
              ),
              4326
            ),
  
            ST_SetSRID(
              ST_MakePoint(
                $10,
                $11
              ),
              4326
            ),
  
            $12,
            $13::TIMESTAMPTZ,
            $14::TIMESTAMPTZ,
            $15::TIMESTAMPTZ,
            $16::TIMESTAMPTZ,
            $17::BIGINT,
            $18::TIMESTAMPTZ,
            $19::JSONB
          )
  
          RETURNING
            id::TEXT AS id,
            dispatch_number,
            status;
        `,
        [
          eventId,
          dispatchNumber,
          recommendation.id,
          emergency.id,
          ambulance.id,
          manager.id,
          status,
          emergency.longitude,
          emergency.latitude,
          startLongitude,
          startLatitude,
          distanceMeters,
          assignedAt,
          enRouteAt,
          arrivedAt,
          completedAt,
          lastRouteSequenceNumber,
          lastRoutePointAt,
          demoPayload({
            scenario,
          }),
        ],
      );
  
    return result.rows[0];
  }
  
  async function insertDispatchStatusEvent(
    client,
    {
      dispatch,
      manager,
      eventId,
      status,
      occurredAt,
      scenario,
    },
  ) {
    await client.query(
      `
        INSERT INTO dispatch_status_events (
          event_id,
          dispatch_id,
          status,
          changed_by_user_id,
          occurred_at,
          received_at,
          payload
        )
        VALUES (
          $1::UUID,
          $2::BIGINT,
          $3,
          $4::BIGINT,
          $5::TIMESTAMPTZ,
          $5::TIMESTAMPTZ,
          $6::JSONB
        );
      `,
      [
        eventId,
        dispatch.id,
        status,
        manager.id,
        occurredAt,
        demoPayload({
          scenario,
        }),
      ],
    );
  }
  
  async function seedDispatches(
    client,
    {
      emergencies,
      recommendations,
      ambulances,
      manager,
    },
  ) {
    console.log(
      "Seeding dispatches...",
    );
  
    const assigned =
      await insertDispatch(
        client,
        {
          emergency:
            emergencies.assigned,
  
          ambulance:
            ambulances["A-103"],
  
          recommendation:
            recommendations.assigned,
  
          manager,
  
          eventId:
            "15000000-0000-4000-8000-000000000001",
  
          dispatchNumber:
            "DSP-DEMO-ASSIGNED",
  
          status:
            "ASSIGNED",
  
          startLongitude:
            36.3100,
  
          startLatitude:
            33.5250,
  
          distanceMeters:
            1450,
  
          assignedAt:
            isoAgo(800),
  
          scenario:
            "assigned-dispatch",
        },
      );
  
    const enRoute =
      await insertDispatch(
        client,
        {
          emergency:
            emergencies.enRoute,
  
          ambulance:
            ambulances["A-104"],
  
          recommendation:
            recommendations.enRoute,
  
          manager,
  
          eventId:
            "15000000-0000-4000-8000-000000000002",
  
          dispatchNumber:
            "DSP-DEMO-EN-ROUTE",
  
          status:
            "EN_ROUTE",
  
          startLongitude:
            36.7000,
  
          startLatitude:
            34.7200,
  
          distanceMeters:
            5200,
  
          assignedAt:
            isoAgo(1100),
  
          enRouteAt:
            isoAgo(1000),
  
          lastRouteSequenceNumber:
            8,
  
          lastRoutePointAt:
            isoAgo(10),
  
          scenario:
            "en-route-dispatch",
        },
      );
  
    const completed =
      await insertDispatch(
        client,
        {
          emergency:
            emergencies.completed,
  
          ambulance:
            ambulances["A-105"],
  
          recommendation:
            recommendations.completed,
  
          manager,
  
          eventId:
            "15000000-0000-4000-8000-000000000003",
  
          dispatchNumber:
            "DSP-DEMO-COMPLETED",
  
          status:
            "COMPLETED",
  
          startLongitude:
            35.7800,
  
          startLatitude:
            35.5200,
  
          distanceMeters:
            3100,
  
          assignedAt:
            isoAgo(85900),
  
          enRouteAt:
            isoAgo(85500),
  
          arrivedAt:
            isoAgo(83700),
  
          completedAt:
            isoAgo(82800),
  
          scenario:
            "completed-dispatch",
        },
      );
  
    await insertDispatchStatusEvent(
      client,
      {
        dispatch:
          assigned,
  
        manager,
  
        eventId:
          "16000000-0000-4000-8000-000000000001",
  
        status:
          "ASSIGNED",
  
        occurredAt:
          isoAgo(800),
  
        scenario:
          "assigned-status",
      },
    );
  
    await insertDispatchStatusEvent(
      client,
      {
        dispatch:
          enRoute,
  
        manager,
  
        eventId:
          "16000000-0000-4000-8000-000000000002",
  
        status:
          "ASSIGNED",
  
        occurredAt:
          isoAgo(1100),
  
        scenario:
          "en-route-assigned-status",
      },
    );
  
    await insertDispatchStatusEvent(
      client,
      {
        dispatch:
          enRoute,
  
        manager,
  
        eventId:
          "16000000-0000-4000-8000-000000000003",
  
        status:
          "EN_ROUTE",
  
        occurredAt:
          isoAgo(1000),
  
        scenario:
          "en-route-status",
      },
    );
  
    const completedStatuses = [
      {
        eventId:
          "16000000-0000-4000-8000-000000000004",
  
        status:
          "ASSIGNED",
  
        occurredAt:
          isoAgo(85900),
      },
      {
        eventId:
          "16000000-0000-4000-8000-000000000005",
  
        status:
          "EN_ROUTE",
  
        occurredAt:
          isoAgo(85500),
      },
      {
        eventId:
          "16000000-0000-4000-8000-000000000006",
  
        status:
          "ARRIVED",
  
        occurredAt:
          isoAgo(83700),
      },
      {
        eventId:
          "16000000-0000-4000-8000-000000000007",
  
        status:
          "COMPLETED",
  
        occurredAt:
          isoAgo(82800),
      },
    ];
  
    for (
      const statusEvent of
      completedStatuses
    ) {
      await insertDispatchStatusEvent(
        client,
        {
          dispatch:
            completed,
  
          manager,
  
          ...statusEvent,
  
          scenario:
            "completed-dispatch-status",
        },
      );
    }
  
    console.log(
      `${assigned.dispatch_number} | ASSIGNED`,
    );
  
    console.log(
      `${enRoute.dispatch_number} | EN_ROUTE`,
    );
  
    console.log(
      `${completed.dispatch_number} | COMPLETED`,
    );
  
    return {
      assigned,
      enRoute,
      completed,
    };
  }
  
  async function seedRoutePoints(
    client,
    dispatch,
    ambulance,
  ) {
    console.log(
      "Seeding EN_ROUTE route points...",
    );
  
    const points = [
      [36.7000, 34.7200],
      [36.7050, 34.7220],
      [36.7100, 34.7250],
      [36.7160, 34.7280],
      [36.7210, 34.7310],
      [36.7260, 34.7330],
      [36.7310, 34.7350],
      [36.7350, 34.7370],
    ];
  
    for (
      let index = 0;
      index < points.length;
      index += 1
    ) {
      const [
        longitude,
        latitude,
      ] = points[index];
  
      const sequenceNumber =
        index + 1;
  
      const recordedAt =
        isoAgo(
          17 - index,
        );
  
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
            $9::TIMESTAMPTZ,
            FALSE,
            'BROWSER_DEMO_SEEDER',
            $10::JSONB
          );
        `,
        [
          `17000000-0000-4000-8000-${String(
            sequenceNumber,
          ).padStart(
            12,
            "0",
          )}`,
  
          dispatch.id,
          ambulance.id,
          sequenceNumber,
          longitude,
          latitude,
          38 + index,
          65 + index,
          recordedAt,
          demoPayload({
            scenario:
              "en-route-route-point",
          }),
        ],
      );
    }
  
    console.log(
      `${points.length} route points inserted for ${dispatch.dispatch_number}`,
    );
  }
  
  async function insertAlert(
    client,
    {
      eventId,
      deduplicationKey,
      alertType,
      status,
      title,
      message,
      manager,
  
      emergencyCaseId = null,
      facilityId = null,
      ambulanceId = null,
  
      /*
       * All seeded alerts are created in the past.
       *
       * This guarantees that ACKNOWLEDGED and RESOLVED times
       * never occur before created_at.
       */
      createdAt = isoAgo(120),
  
      acknowledgedAt = null,
      resolvedAt = null,
  
      scenario,
    },
  ) {
    const createdTimestamp =
      new Date(
        createdAt,
      ).getTime();
  
    if (
      !Number.isFinite(
        createdTimestamp,
      )
    ) {
      throw new Error(
        `Invalid alert createdAt value for ${deduplicationKey}.`,
      );
    }
  
    /*
     * Only ACKNOWLEDGED alerts receive acknowledgement fields.
     */
    let effectiveAcknowledgedAt =
      status === "ACKNOWLEDGED"
        ? (
            acknowledgedAt ??
            isoAgo(60)
          )
        : null;
  
    /*
     * Only RESOLVED alerts receive resolution fields.
     */
    let effectiveResolvedAt =
      status === "RESOLVED"
        ? (
            resolvedAt ??
            isoAgo(30)
          )
        : null;
  
    /*
     * Protect the seed from invalid historical ordering.
     */
    if (
      effectiveAcknowledgedAt &&
      new Date(
        effectiveAcknowledgedAt,
      ).getTime() <
        createdTimestamp
    ) {
      effectiveAcknowledgedAt =
        createdAt;
    }
  
    if (
      effectiveResolvedAt &&
      new Date(
        effectiveResolvedAt,
      ).getTime() <
        createdTimestamp
    ) {
      effectiveResolvedAt =
        createdAt;
    }
  
    /*
     * updated_at follows the latest lifecycle event.
     */
    const updatedAt =
      effectiveResolvedAt ??
      effectiveAcknowledgedAt ??
      createdAt;
  
    await client.query(
      `
        INSERT INTO alerts (
          event_id,
          deduplication_key,
          emergency_case_id,
          facility_id,
          ambulance_id,
          alert_type,
          status,
          title,
          message,
  
          acknowledged_by_user_id,
          acknowledged_at,
  
          resolved_by_user_id,
          resolved_at,
  
          payload,
          created_at,
          updated_at
        )
        VALUES (
          $1::UUID,
          $2,
          $3::BIGINT,
          $4::BIGINT,
          $5::BIGINT,
          $6,
          $7,
          $8,
          $9,
  
          CASE
            WHEN $7 = 'ACKNOWLEDGED'
              THEN $10::BIGINT
            ELSE NULL
          END,
  
          $11::TIMESTAMPTZ,
  
          CASE
            WHEN $7 = 'RESOLVED'
              THEN $10::BIGINT
            ELSE NULL
          END,
  
          $12::TIMESTAMPTZ,
  
          $13::JSONB,
          $14::TIMESTAMPTZ,
          $15::TIMESTAMPTZ
        );
      `,
      [
        eventId,
        deduplicationKey,
        emergencyCaseId,
        facilityId,
        ambulanceId,
        alertType,
        status,
        title,
        message,
        manager.id,
  
        effectiveAcknowledgedAt,
        effectiveResolvedAt,
  
        demoPayload({
          scenario,
        }),
  
        createdAt,
        updatedAt,
      ],
    );
  }
  async function seedAlerts(
    client,
    {
      manager,
      facilities,
      emergencies,
      ambulances,
      recommendations,
      dispatches,
    },
  ) {
    console.log(
      "Seeding operational alerts...",
    );
  
    const alerts = [
      {
        eventId:
          "18000000-0000-4000-8000-000000000001",
  
        deduplicationKey:
          "demo:facility-high-occupancy:aleppo",
  
        facilityId:
          facilities[
            "Aleppo Central Medical Center"
          ].id,
  
        alertType:
          "FACILITY_HIGH_OCCUPANCY",
  
        status:
          "OPEN",
  
        title:
          "High facility occupancy",
  
        message:
          "Aleppo Central Medical Center is above 90% occupancy.",
  
        scenario:
          "open-high-occupancy-alert",
      },
      {
        eventId:
          "18000000-0000-4000-8000-000000000002",
  
        deduplicationKey:
          "demo:facility-high-occupancy:damascus-north",
  
        facilityId:
          facilities[
            "Damascus North Emergency Clinic"
          ].id,
  
        alertType:
          "FACILITY_HIGH_OCCUPANCY",
  
        status:
          "ACKNOWLEDGED",
  
        title:
          "High facility occupancy",
  
        message:
          "Damascus North Emergency Clinic is above 90% occupancy.",
  
        acknowledgedAt:
          isoAgo(60),
  
        scenario:
          "acknowledged-high-occupancy-alert",
      },
      {
        eventId:
          "18000000-0000-4000-8000-000000000003",
  
        deduplicationKey:
          "demo:emergency-created:open-damascus",
  
        emergencyCaseId:
          emergencies
            .openDamascus
            .id,
  
        alertType:
          "EMERGENCY_CASE_CREATED",
  
        status:
          "OPEN",
  
        title:
          "New emergency case",
  
        message:
          "EMR-DEMO-OPEN-DAMASCUS requires operational review.",
  
        scenario:
          "open-emergency-alert",
      },
      {
        eventId:
          "18000000-0000-4000-8000-000000000004",
  
        deduplicationKey:
          `dispatch-confirmation:${recommendations.stalePending.id}`,
  
        emergencyCaseId:
          emergencies
            .stalePending
            .id,
  
        ambulanceId:
          ambulances[
            "A-102"
          ].id,
  
        alertType:
          "DISPATCH_CONFIRMATION_REQUIRED",
  
        status:
          "OPEN",
  
        title:
          "Ambulance confirmation required",
  
        message:
          "A-102 is recommended, but its current location is stale.",
  
        scenario:
          "stale-confirmation-alert",
      },
      {
        eventId:
          "18000000-0000-4000-8000-000000000005",
  
        deduplicationKey:
          `dispatch-status:${dispatches.assigned.id}:ASSIGNED`,
  
        emergencyCaseId:
          emergencies
            .assigned
            .id,
  
        ambulanceId:
          ambulances[
            "A-103"
          ].id,
  
        alertType:
          "DISPATCH_STATUS_CHANGED",
  
        status:
          "OPEN",
  
        title:
          "Ambulance dispatch assigned",
  
        message:
          "DSP-DEMO-ASSIGNED is waiting for the ambulance to start.",
  
        scenario:
          "assigned-dispatch-alert",
      },
      {
        eventId:
          "18000000-0000-4000-8000-000000000006",
  
        deduplicationKey:
          `dispatch-status:${dispatches.enRoute.id}:EN_ROUTE`,
  
        emergencyCaseId:
          emergencies
            .enRoute
            .id,
  
        ambulanceId:
          ambulances[
            "A-104"
          ].id,
  
        alertType:
          "DISPATCH_STATUS_CHANGED",
  
        status:
          "OPEN",
  
        title:
          "Ambulance is en route",
  
        message:
          "DSP-DEMO-EN-ROUTE is travelling toward the emergency.",
  
        scenario:
          "en-route-dispatch-alert",
      },
    ];
  
    for (
      const alert of alerts
    ) {
      await insertAlert(
        client,
        {
          manager,
          emergencyCaseId:
            null,
  
          facilityId:
            null,
  
          ambulanceId:
            null,
  
          acknowledgedAt:
            null,
  
          resolvedAt:
            null,
  
          ...alert,
        },
      );
    }
  
    console.log(
      `${alerts.length} alerts inserted.`,
    );
  }
  
  async function verifyDemoData(
    client,
  ) {
    const result =
      await client.query(`
        SELECT
          (
            SELECT COUNT(*)
            FROM medical_facilities
          ) AS facilities,
  
          (
            SELECT COUNT(*)
            FROM facility_current_occupancy
          ) AS current_occupancy_rows,
  
          (
            SELECT COUNT(*)
            FROM ambulances
            WHERE status = 'AVAILABLE'
          ) AS available_ambulances,
  
          (
            SELECT COUNT(*)
            FROM ambulances
            WHERE status = 'BUSY'
          ) AS busy_ambulances,
  
          (
            SELECT COUNT(*)
            FROM emergency_cases
            WHERE status IN (
              'OPEN',
              'AWAITING_MANAGER_CONFIRMATION',
              'DISPATCHED'
            )
          ) AS active_emergencies,
  
          (
            SELECT COUNT(*)
            FROM alerts
            WHERE status = 'OPEN'
          ) AS open_alerts,
  
          (
            SELECT COUNT(*)
            FROM dispatch_recommendations
            WHERE status = 'PENDING'
          ) AS pending_recommendations,
  
          (
            SELECT COUNT(*)
            FROM ambulance_dispatches
            WHERE status IN (
              'ASSIGNED',
              'EN_ROUTE',
              'ARRIVED'
            )
          ) AS active_dispatches,
  
          (
            SELECT COUNT(*)
            FROM dispatch_route_points
          ) AS route_points;
      `);
  
    return result.rows[0];
  }
  
  async function run() {
    const client =
      await pool.connect();
  
    try {
      console.log(
        "Starting browser demo seed...",
      );
  
      await client.query(
        "BEGIN",
      );
  
      await resetOperationalData(
        client,
      );
  
      const resources =
        await loadBaseResources(
          client,
        );
  
      await seedFacilityOccupancy(
        client,
        resources.facilities,
      );
  
      await seedAmbulances(
        client,
        resources.ambulances,
      );
  
      const emergencies =
        await seedEmergencyCases(
          client,
          resources,
        );
  
      const recommendations =
        await seedRecommendations(
          client,
          {
            emergencies,
  
            ambulances:
              resources.ambulances,
  
            manager:
              resources.manager,
          },
        );
  
      const dispatches =
        await seedDispatches(
          client,
          {
            emergencies,
  
            recommendations,
  
            ambulances:
              resources.ambulances,
  
            manager:
              resources.manager,
          },
        );
  
      await seedRoutePoints(
        client,
        dispatches.enRoute,
        resources
          .ambulances[
            "A-104"
          ],
      );
  
      await seedAlerts(
        client,
        {
          ...resources,
  
          emergencies,
  
          recommendations,
  
          dispatches,
        },
      );
  
      const verification =
        await verifyDemoData(
          client,
        );
  
      await client.query(
        "COMMIT",
      );
  
      console.log("");
      console.log(
        "Browser demo seed completed successfully.",
      );
  
      console.table(
        verification,
      );
  
      console.log("");
      console.log(
        "Open http://localhost:5173/dashboard and press Refresh.",
      );
    } catch (error) {
      await client.query(
        "ROLLBACK",
      );
  
      console.error(
        "Browser demo seed failed:",
        error,
      );
  
      process.exitCode = 1;
    } finally {
      client.release();
  
      await pool.end();
    }
  }
  
  run();