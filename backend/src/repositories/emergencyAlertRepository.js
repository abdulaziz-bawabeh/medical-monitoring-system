/*
 * Finds the active governorate covering one geographical point.
 *
 * ST_Covers is used so a point exactly on the polygon boundary
 * is still considered covered.
 */
export async function findGovernorateCoveringPoint(
    client,
    longitude,
    latitude,
  ) {
    const result = await client.query(
      `
        WITH emergency_point AS (
          SELECT
            ST_SetSRID(
              ST_MakePoint(
                $1,
                $2
              ),
              4326
            ) AS location
        )
  
        SELECT
          governorate.id::TEXT
            AS id,
  
          governorate.name,
  
          governorate.slug
  
        FROM governorates
          AS governorate
  
        CROSS JOIN emergency_point
  
        WHERE
          governorate.is_active = TRUE
  
          AND governorate.boundary
            IS NOT NULL
  
          AND ST_Covers(
            governorate.boundary,
            emergency_point.location
          )
  
        ORDER BY
          ST_Area(
            governorate.boundary::GEOGRAPHY
          ) ASC
  
        LIMIT 1;
      `,
      [
        longitude,
        latitude,
      ],
    );
  
    return result.rows[0] ?? null;
  }
  
  /*
   * Produces a human-readable case number.
   *
   * The PostgreSQL sequence guarantees that the final value
   * does not repeat.
   */
  export async function generateEmergencyCaseNumber(
    client,
    reportedAt,
  ) {
    const result = await client.query(
      `
        SELECT
          'EMR-'
          ||
          TO_CHAR(
            $1::TIMESTAMPTZ
            AT TIME ZONE 'UTC',
            'YYYYMMDD'
          )
          ||
          '-'
          ||
          LPAD(
            NEXTVAL(
              'emergency_case_number_seq'
            )::TEXT,
            8,
            '0'
          )
          AS case_number;
      `,
      [
        reportedAt,
      ],
    );
  
    return result.rows[0].case_number;
  }
  
  export async function findEmergencyCaseByEventId(
    client,
    eventId,
  ) {
    const result = await client.query(
      `
        SELECT
          emergency.id::TEXT
            AS id,
  
          emergency.event_id::TEXT
            AS event_id,
  
          emergency.case_number,
  
          emergency.summary,
  
          emergency.status,
  
          emergency.created_by_user_id::TEXT
            AS created_by_user_id,
  
          creator.full_name
            AS created_by_name,
  
          emergency.governorate_id::TEXT
            AS governorate_id,
  
          governorate.name
            AS governorate_name,
  
          governorate.slug
            AS governorate_slug,
  
          ST_X(
            emergency.location
          ) AS longitude,
  
          ST_Y(
            emergency.location
          ) AS latitude,
  
          emergency.reported_at,
  
          emergency.received_at,
  
          emergency.resolved_at,
  
          emergency.payload,
  
          emergency.created_at,
  
          emergency.updated_at
  
        FROM emergency_cases
          AS emergency
  
        JOIN users
          AS creator
          ON creator.id =
             emergency.created_by_user_id
  
        JOIN governorates
          AS governorate
          ON governorate.id =
             emergency.governorate_id
  
        WHERE emergency.event_id =
          $1::UUID
  
        LIMIT 1;
      `,
      [
        eventId,
      ],
    );
  
    return result.rows[0] ?? null;
  }
  
  export async function insertEmergencyCase(
    client,
    {
      eventId,
      caseNumber,
      createdByUserId,
      governorateId,
      summary,
      longitude,
      latitude,
      reportedAt,
      payload,
    },
  ) {
    const result = await client.query(
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
          payload
        )
        VALUES (
          $1::UUID,
          $2,
          $3,
          $4,
          $5,
          'OPEN',
  
          ST_SetSRID(
            ST_MakePoint(
              $6,
              $7
            ),
            4326
          ),
  
          $8::TIMESTAMPTZ,
  
          GREATEST(
            NOW(),
            $8::TIMESTAMPTZ
          ),
  
          $9::JSONB
        )
  
        ON CONFLICT (event_id)
        DO NOTHING
  
        RETURNING
          id::TEXT AS id;
      `,
      [
        eventId,
        caseNumber,
        createdByUserId,
        governorateId,
        summary,
        longitude,
        latitude,
        reportedAt,
        JSON.stringify(payload),
      ],
    );
  
    return result.rows[0] ?? null;
  }
  
  export async function listActiveEmergencyCases(
    client,
    {
      governorateId = null,
      limit = 50,
    },
  ) {
    const result = await client.query(
      `
        SELECT
          emergency.id::TEXT
            AS id,
  
          emergency.event_id::TEXT
            AS event_id,
  
          emergency.case_number,
  
          emergency.summary,
  
          emergency.status,
  
          emergency.created_by_user_id::TEXT
            AS created_by_user_id,
  
          creator.full_name
            AS created_by_name,
  
          emergency.governorate_id::TEXT
            AS governorate_id,
  
          governorate.name
            AS governorate_name,
  
          governorate.slug
            AS governorate_slug,
  
          ST_X(
            emergency.location
          ) AS longitude,
  
          ST_Y(
            emergency.location
          ) AS latitude,
  
          emergency.reported_at,
  
          emergency.received_at,
  
          emergency.resolved_at,
  
          emergency.payload,
  
          emergency.created_at,
  
          emergency.updated_at,
  
          (
            SELECT
              COUNT(*)::INTEGER
  
            FROM alerts AS alert
  
            WHERE
              alert.emergency_case_id =
                emergency.id
  
              AND alert.status IN (
                'OPEN',
                'ACKNOWLEDGED'
              )
          ) AS active_alert_count
  
        FROM emergency_cases
          AS emergency
  
        JOIN users
          AS creator
          ON creator.id =
             emergency.created_by_user_id
  
        JOIN governorates
          AS governorate
          ON governorate.id =
             emergency.governorate_id
  
        WHERE
          emergency.status IN (
            'OPEN',
            'AWAITING_MANAGER_CONFIRMATION',
            'DISPATCHED'
          )
  
          AND (
            $1::SMALLINT IS NULL
            OR emergency.governorate_id =
               $1::SMALLINT
          )
  
        ORDER BY
          emergency.reported_at DESC
  
        LIMIT $2;
      `,
      [
        governorateId,
        limit,
      ],
    );
  
    return result.rows;
  }
  
  export async function insertAlert(
    client,
    {
      eventId,
      deduplicationKey,
      emergencyCaseId = null,
      facilityId = null,
      ambulanceId = null,
      alertType,
      title,
      message,
      payload,
    },
  ) {
    const result = await client.query(
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
          payload
        )
        VALUES (
          $1::UUID,
          $2,
          $3,
          $4,
          $5,
          $6,
          'OPEN',
          $7,
          $8,
          $9::JSONB
        )
  
        ON CONFLICT (
          deduplication_key
        )
        DO NOTHING
  
        RETURNING
          id::TEXT AS id;
      `,
      [
        eventId,
        deduplicationKey,
        emergencyCaseId,
        facilityId,
        ambulanceId,
        alertType,
        title,
        message,
        JSON.stringify(payload),
      ],
    );
  
    return result.rows[0] ?? null;
  }
  
  export async function findAlertByDeduplicationKey(
    client,
    deduplicationKey,
  ) {
    const result = await client.query(
      `
        SELECT
          alert.id::TEXT AS id,
  
          alert.event_id::TEXT
            AS event_id,
  
          alert.deduplication_key,
  
          alert.emergency_case_id::TEXT
            AS emergency_case_id,
  
          emergency.case_number
            AS emergency_case_number,
  
          alert.facility_id::TEXT
            AS facility_id,
  
          facility.name
            AS facility_name,
  
          alert.ambulance_id::TEXT
            AS ambulance_id,
  
          ambulance.code
            AS ambulance_code,
  
          alert.alert_type,
  
          alert.status,
  
          alert.title,
  
          alert.message,
  
          alert.acknowledged_by_user_id::TEXT
            AS acknowledged_by_user_id,
  
          acknowledged_user.full_name
            AS acknowledged_by_name,
  
          alert.acknowledged_at,
  
          alert.resolved_by_user_id::TEXT
            AS resolved_by_user_id,
  
          resolved_user.full_name
            AS resolved_by_name,
  
          alert.resolved_at,
  
          alert.payload,
  
          alert.created_at,
  
          alert.updated_at
  
        FROM alerts AS alert
  
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
  
        LEFT JOIN users
          AS acknowledged_user
          ON acknowledged_user.id =
             alert.acknowledged_by_user_id
  
        LEFT JOIN users
          AS resolved_user
          ON resolved_user.id =
             alert.resolved_by_user_id
  
        WHERE alert.deduplication_key =
          $1
  
        LIMIT 1;
      `,
      [
        deduplicationKey,
      ],
    );
  
    return result.rows[0] ?? null;
  }
  
  export async function findAlertById(
    client,
    alertId,
  ) {
    const result = await client.query(
      `
        SELECT
          alert.id::TEXT AS id,
  
          alert.event_id::TEXT
            AS event_id,
  
          alert.deduplication_key,
  
          alert.emergency_case_id::TEXT
            AS emergency_case_id,
  
          emergency.case_number
            AS emergency_case_number,
  
          alert.facility_id::TEXT
            AS facility_id,
  
          facility.name
            AS facility_name,
  
          alert.ambulance_id::TEXT
            AS ambulance_id,
  
          ambulance.code
            AS ambulance_code,
  
          alert.alert_type,
  
          alert.status,
  
          alert.title,
  
          alert.message,
  
          alert.acknowledged_by_user_id::TEXT
            AS acknowledged_by_user_id,
  
          acknowledged_user.full_name
            AS acknowledged_by_name,
  
          alert.acknowledged_at,
  
          alert.resolved_by_user_id::TEXT
            AS resolved_by_user_id,
  
          resolved_user.full_name
            AS resolved_by_name,
  
          alert.resolved_at,
  
          alert.payload,
  
          alert.created_at,
  
          alert.updated_at
  
        FROM alerts AS alert
  
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
  
        LEFT JOIN users
          AS acknowledged_user
          ON acknowledged_user.id =
             alert.acknowledged_by_user_id
  
        LEFT JOIN users
          AS resolved_user
          ON resolved_user.id =
             alert.resolved_by_user_id
  
        WHERE alert.id =
          $1::BIGINT
  
        LIMIT 1;
      `,
      [
        alertId,
      ],
    );
  
    return result.rows[0] ?? null;
  }
  
  export async function listAlerts(
    client,
    {
      status = null,
      alertType = null,
      limit = 50,
    },
  ) {
    const result = await client.query(
      `
        SELECT
          alert.id::TEXT AS id,
  
          alert.event_id::TEXT
            AS event_id,
  
          alert.deduplication_key,
  
          alert.emergency_case_id::TEXT
            AS emergency_case_id,
  
          emergency.case_number
            AS emergency_case_number,
  
          alert.facility_id::TEXT
            AS facility_id,
  
          facility.name
            AS facility_name,
  
          alert.ambulance_id::TEXT
            AS ambulance_id,
  
          ambulance.code
            AS ambulance_code,
  
          alert.alert_type,
  
          alert.status,
  
          alert.title,
  
          alert.message,
  
          alert.acknowledged_by_user_id::TEXT
            AS acknowledged_by_user_id,
  
          acknowledged_user.full_name
            AS acknowledged_by_name,
  
          alert.acknowledged_at,
  
          alert.resolved_by_user_id::TEXT
            AS resolved_by_user_id,
  
          resolved_user.full_name
            AS resolved_by_name,
  
          alert.resolved_at,
  
          alert.payload,
  
          alert.created_at,
  
          alert.updated_at
  
        FROM alerts AS alert
  
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
  
        LEFT JOIN users
          AS acknowledged_user
          ON acknowledged_user.id =
             alert.acknowledged_by_user_id
  
        LEFT JOIN users
          AS resolved_user
          ON resolved_user.id =
             alert.resolved_by_user_id
  
        WHERE
          (
            $1::TEXT IS NULL
            OR alert.status = $1
          )
  
          AND (
            $2::TEXT IS NULL
            OR alert.alert_type = $2
          )
  
        ORDER BY
          CASE alert.status
            WHEN 'OPEN' THEN 0
            WHEN 'ACKNOWLEDGED' THEN 1
            ELSE 2
          END,
  
          alert.created_at DESC
  
        LIMIT $3;
      `,
      [
        status,
        alertType,
        limit,
      ],
    );
  
    return result.rows;
  }
  
  export async function acknowledgeOpenAlert(
    client,
    {
      alertId,
      userId,
    },
  ) {
    const result = await client.query(
      `
        UPDATE alerts
        SET
          status =
            'ACKNOWLEDGED',
  
          acknowledged_by_user_id =
            $2,
  
          acknowledged_at =
            NOW(),
  
          updated_at =
            NOW()
  
        WHERE id =
          $1::BIGINT
  
          AND status =
            'OPEN'
  
        RETURNING
          id::TEXT AS id;
      `,
      [
        alertId,
        userId,
      ],
    );
  
    return result.rows[0] ?? null;
  }