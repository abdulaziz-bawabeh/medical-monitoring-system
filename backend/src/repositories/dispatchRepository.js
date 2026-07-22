const recommendationSelect = `
  SELECT
    recommendation.id::TEXT
      AS id,

    recommendation.event_id::TEXT
      AS event_id,

    recommendation.status,

    recommendation.distance_meters
      ::DOUBLE PRECISION
      AS distance_meters,

    recommendation.ambulance_location_age_seconds,

    recommendation.max_location_age_seconds,

    recommendation.generated_at,

    recommendation.expires_at,

    recommendation.confirmed_at,

    recommendation.rejected_at,

    recommendation.rejection_reason,

    recommendation.payload,

    CASE
      WHEN
        recommendation.status = 'PENDING'
        AND recommendation.expires_at <= NOW()
      THEN TRUE
      ELSE FALSE
    END AS is_expired,

    emergency.id::TEXT
      AS emergency_id,

    emergency.case_number,

    emergency.summary
      AS emergency_summary,

    emergency.status
      AS emergency_status,

    ST_X(
      recommendation.emergency_location
    ) AS emergency_longitude,

    ST_Y(
      recommendation.emergency_location
    ) AS emergency_latitude,

    ambulance.id::TEXT
      AS ambulance_id,

    ambulance.code
      AS ambulance_code,

    ambulance.status
      AS ambulance_current_status,

    ambulance.is_operational
      AS ambulance_is_operational,

    ST_X(
      recommendation.ambulance_location
    ) AS ambulance_longitude,

    ST_Y(
      recommendation.ambulance_location
    ) AS ambulance_latitude,

    recommendation.ambulance_location_recorded_at,

    requested_user.id::TEXT
      AS requested_by_user_id,

    requested_user.full_name
      AS requested_by_user_name,

    confirmed_user.id::TEXT
      AS confirmed_by_user_id,

    confirmed_user.full_name
      AS confirmed_by_user_name,

    rejected_user.id::TEXT
      AS rejected_by_user_id,

    rejected_user.full_name
      AS rejected_by_user_name,

    recommendation.created_at,

    recommendation.updated_at

  FROM dispatch_recommendations
    AS recommendation

  JOIN emergency_cases
    AS emergency
    ON emergency.id =
       recommendation.emergency_case_id

  JOIN ambulances
    AS ambulance
    ON ambulance.id =
       recommendation.ambulance_id

  JOIN users
    AS requested_user
    ON requested_user.id =
       recommendation.requested_by_user_id

  LEFT JOIN users
    AS confirmed_user
    ON confirmed_user.id =
       recommendation.confirmed_by_user_id

  LEFT JOIN users
    AS rejected_user
    ON rejected_user.id =
       recommendation.rejected_by_user_id
`;

const dispatchSelect = `
  SELECT
    dispatch.id::TEXT
      AS id,

    dispatch.event_id::TEXT
      AS event_id,

    dispatch.dispatch_number,

    dispatch.status,

    dispatch.recommendation_id::TEXT
      AS recommendation_id,

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

    emergency.id::TEXT
      AS emergency_id,

    emergency.case_number,

    emergency.summary
      AS emergency_summary,

    emergency.status
      AS emergency_status,

    emergency.governorate_id::TEXT
      AS governorate_id,

    governorate.name
      AS governorate_name,

    governorate.slug
      AS governorate_slug,

    ST_X(
      dispatch.emergency_location
    ) AS emergency_longitude,

    ST_Y(
      dispatch.emergency_location
    ) AS emergency_latitude,

    ambulance.id::TEXT
      AS ambulance_id,

    ambulance.code
      AS ambulance_code,

    ambulance.status
      AS ambulance_status,

    ambulance.is_operational
      AS ambulance_is_operational,

    ST_X(
      dispatch.ambulance_start_location
    ) AS ambulance_start_longitude,

    ST_Y(
      dispatch.ambulance_start_location
    ) AS ambulance_start_latitude,

    confirmed_user.id::TEXT
      AS confirmed_by_user_id,

    confirmed_user.full_name
      AS confirmed_by_user_name

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
    AS confirmed_user
    ON confirmed_user.id =
       dispatch.confirmed_by_user_id
`;

export async function expirePendingRecommendations(
  client,
  resolvedByUserId,
) {
  const result =
    await client.query(
      `
        WITH expired_recommendations AS (
          UPDATE dispatch_recommendations
          SET
            status = 'EXPIRED',
            updated_at = NOW()

          WHERE
            status = 'PENDING'
            AND expires_at <= NOW()

          RETURNING
            id,
            emergency_case_id
        ),

        reset_emergencies AS (
          UPDATE emergency_cases
            AS emergency

          SET
            status = 'OPEN',
            updated_at = NOW()

          FROM expired_recommendations
            AS expired

          WHERE
            emergency.id =
              expired.emergency_case_id

            AND emergency.status =
              'AWAITING_MANAGER_CONFIRMATION'

            AND NOT EXISTS (
              SELECT 1

              FROM ambulance_dispatches
                AS dispatch

              WHERE
                dispatch.emergency_case_id =
                  emergency.id

                AND dispatch.status IN (
                  'ASSIGNED',
                  'EN_ROUTE',
                  'ARRIVED'
                )
            )

          RETURNING emergency.id
        ),

        resolved_alerts AS (
          UPDATE alerts
            AS alert

          SET
            status = 'RESOLVED',

            resolved_by_user_id =
              $1,

            resolved_at =
              NOW(),

            updated_at =
              NOW()

          FROM expired_recommendations
            AS expired

          WHERE
            alert.deduplication_key =
              'dispatch-confirmation:'
              ||
              expired.id::TEXT

            AND alert.status IN (
              'OPEN',
              'ACKNOWLEDGED'
            )

          RETURNING alert.id
        )

        SELECT
          (
            SELECT COUNT(*)::INTEGER
            FROM expired_recommendations
          ) AS expired_count,

          (
            SELECT COUNT(*)::INTEGER
            FROM reset_emergencies
          ) AS reset_emergency_count,

          (
            SELECT COUNT(*)::INTEGER
            FROM resolved_alerts
          ) AS resolved_alert_count;
      `,
      [
        resolvedByUserId,
      ],
    );

  return result.rows[0];
}

export async function lockEmergencyForRecommendation(
  client,
  emergencyId,
) {
  const result =
    await client.query(
      `
        SELECT
          emergency.id::TEXT
            AS id,

          emergency.event_id::TEXT
            AS event_id,

          emergency.case_number,

          emergency.summary,

          emergency.status,

          emergency.governorate_id::TEXT
            AS governorate_id,

          ST_X(
            emergency.location
          ) AS longitude,

          ST_Y(
            emergency.location
          ) AS latitude,

          emergency.reported_at,

          emergency.updated_at

        FROM emergency_cases
          AS emergency

        WHERE emergency.id =
          $1::BIGINT

        FOR UPDATE OF emergency;
      `,
      [
        emergencyId,
      ],
    );

  return result.rows[0] ?? null;
}

export async function findNearestEligibleAmbulance(
  client,
  {
    emergencyId,
    maxLocationAgeSeconds,
    maxDistanceMeters,
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

          ambulance.status
            AS ambulance_status,

          ambulance.is_operational,

          ST_X(
            ambulance.current_location
          ) AS ambulance_longitude,

          ST_Y(
            ambulance.current_location
          ) AS ambulance_latitude,

          ambulance.last_location_at,

          ST_X(
            emergency.location
          ) AS emergency_longitude,

          ST_Y(
            emergency.location
          ) AS emergency_latitude,

          ROUND(
            ST_Distance(
              ambulance.current_location::GEOGRAPHY,
              emergency.location::GEOGRAPHY
            )::NUMERIC,
            2
          )::DOUBLE PRECISION
            AS distance_meters,

          GREATEST(
            0,

            FLOOR(
              EXTRACT(
                EPOCH FROM (
                  NOW() -
                  ambulance.last_location_at
                )
              )
            )::INTEGER
          ) AS location_age_seconds

        FROM ambulances
          AS ambulance

        JOIN emergency_cases
          AS emergency
          ON emergency.id =
             $1::BIGINT

        WHERE
          ambulance.status =
            'AVAILABLE'

          AND ambulance.is_operational =
            TRUE

          AND ambulance.current_location
            IS NOT NULL

          AND ambulance.last_location_at
            IS NOT NULL

          AND ambulance.last_location_at >=
            NOW() -
            (
              $2::INTEGER
              *
              INTERVAL '1 second'
            )

          AND ST_DWithin(
            ambulance.current_location::GEOGRAPHY,
            emergency.location::GEOGRAPHY,
            $3::DOUBLE PRECISION
          )

          AND NOT EXISTS (
            SELECT 1

            FROM ambulance_dispatches
              AS active_dispatch

            WHERE
              active_dispatch.ambulance_id =
                ambulance.id

              AND active_dispatch.status IN (
                'ASSIGNED',
                'EN_ROUTE',
                'ARRIVED'
              )
          )

          AND NOT EXISTS (
            SELECT 1

            FROM dispatch_recommendations
              AS pending_recommendation

            WHERE
              pending_recommendation.ambulance_id =
                ambulance.id

              AND pending_recommendation.status =
                'PENDING'

              AND pending_recommendation.expires_at >
                NOW()
          )

        ORDER BY
          ST_Distance(
            ambulance.current_location::GEOGRAPHY,
            emergency.location::GEOGRAPHY
          ) ASC,

          ambulance.id ASC

        LIMIT 1

        FOR UPDATE OF ambulance
        SKIP LOCKED;
      `,
      [
        emergencyId,
        maxLocationAgeSeconds,
        maxDistanceMeters,
      ],
    );

  return result.rows[0] ?? null;
}

export async function insertDispatchRecommendation(
  client,
  {
    eventId,
    emergencyCaseId,
    ambulanceId,
    requestedByUserId,
    distanceMeters,
    emergencyLongitude,
    emergencyLatitude,
    ambulanceLongitude,
    ambulanceLatitude,
    ambulanceLocationRecordedAt,
    ambulanceLocationAgeSeconds,
    maxLocationAgeSeconds,
    recommendationTtlSeconds,
    payload,
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
          payload
        )
        VALUES (
          $1::UUID,
          $2::BIGINT,
          $3::BIGINT,
          $4::BIGINT,
          'PENDING',
          $5,

          ST_SetSRID(
            ST_MakePoint(
              $6,
              $7
            ),
            4326
          ),

          ST_SetSRID(
            ST_MakePoint(
              $8,
              $9
            ),
            4326
          ),

          $10::TIMESTAMPTZ,
          $11::INTEGER,
          $12::INTEGER,
          NOW(),

          NOW() +
          (
            $13::INTEGER
            *
            INTERVAL '1 second'
          ),

          $14::JSONB
        )

        ON CONFLICT (event_id)
        DO NOTHING

        RETURNING
          id::TEXT AS id;
      `,
      [
        eventId,
        emergencyCaseId,
        ambulanceId,
        requestedByUserId,
        distanceMeters,
        emergencyLongitude,
        emergencyLatitude,
        ambulanceLongitude,
        ambulanceLatitude,
        ambulanceLocationRecordedAt,
        ambulanceLocationAgeSeconds,
        maxLocationAgeSeconds,
        recommendationTtlSeconds,
        JSON.stringify(payload),
      ],
    );

  return result.rows[0] ?? null;
}

export async function findRecommendationByEventId(
  client,
  eventId,
) {
  const result =
    await client.query(
      `
        ${recommendationSelect}

        WHERE recommendation.event_id =
          $1::UUID

        LIMIT 1;
      `,
      [
        eventId,
      ],
    );

  return result.rows[0] ?? null;
}

export async function findRecommendationById(
  client,
  recommendationId,
) {
  const result =
    await client.query(
      `
        ${recommendationSelect}

        WHERE recommendation.id =
          $1::BIGINT

        LIMIT 1;
      `,
      [
        recommendationId,
      ],
    );

  return result.rows[0] ?? null;
}

export async function lockRecommendationById(
  client,
  recommendationId,
) {
  const result =
    await client.query(
      `
        ${recommendationSelect}

        WHERE recommendation.id =
          $1::BIGINT

        LIMIT 1

        FOR UPDATE OF recommendation;
      `,
      [
        recommendationId,
      ],
    );

  return result.rows[0] ?? null;
}

export async function findLatestRecommendationForEmergency(
  client,
  emergencyId,
) {
  const result =
    await client.query(
      `
        ${recommendationSelect}

        WHERE recommendation.emergency_case_id =
          $1::BIGINT

        ORDER BY
          recommendation.generated_at DESC

        LIMIT 1;
      `,
      [
        emergencyId,
      ],
    );

  return result.rows[0] ?? null;
}

export async function findActiveRecommendationForEmergency(
  client,
  emergencyId,
) {
  const result =
    await client.query(
      `
        ${recommendationSelect}

        WHERE
          recommendation.emergency_case_id =
            $1::BIGINT

          AND recommendation.status =
            'PENDING'

          AND recommendation.expires_at >
            NOW()

        ORDER BY
          recommendation.generated_at DESC

        LIMIT 1;
      `,
      [
        emergencyId,
      ],
    );

  return result.rows[0] ?? null;
}

export async function updateEmergencyStatus(
  client,
  {
    emergencyId,
    status,
  },
) {
  const result =
    await client.query(
      `
        UPDATE emergency_cases

        SET
          status = $2,
          updated_at = NOW()

        WHERE id =
          $1::BIGINT

        RETURNING
          id::TEXT AS id,
          status,
          updated_at;
      `,
      [
        emergencyId,
        status,
      ],
    );

  return result.rows[0] ?? null;
}

export async function findEmergencyById(
  client,
  emergencyId,
) {
  const result =
    await client.query(
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
            SELECT COUNT(*)::INTEGER

            FROM alerts
              AS alert

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

        WHERE emergency.id =
          $1::BIGINT

        LIMIT 1;
      `,
      [
        emergencyId,
      ],
    );

  return result.rows[0] ?? null;
}

export async function lockDispatchResources(
  client,
  {
    emergencyId,
    ambulanceId,
  },
) {
  const result =
    await client.query(
      `
        SELECT
          emergency.id::TEXT
            AS emergency_id,

          emergency.status
            AS emergency_status,

          ST_X(
            emergency.location
          ) AS emergency_longitude,

          ST_Y(
            emergency.location
          ) AS emergency_latitude,

          ambulance.id::TEXT
            AS ambulance_id,

          ambulance.code
            AS ambulance_code,

          ambulance.status
            AS ambulance_status,

          ambulance.is_operational,

          ST_X(
            ambulance.current_location
          ) AS ambulance_longitude,

          ST_Y(
            ambulance.current_location
          ) AS ambulance_latitude,

          ambulance.current_location
            IS NOT NULL
            AS has_current_location,

          ambulance.last_location_at,

          GREATEST(
            0,

            FLOOR(
              EXTRACT(
                EPOCH FROM (
                  NOW() -
                  ambulance.last_location_at
                )
              )
            )::INTEGER
          ) AS location_age_seconds,

          CASE
            WHEN
              ambulance.current_location
                IS NOT NULL
            THEN
              ROUND(
                ST_Distance(
                  ambulance.current_location::GEOGRAPHY,
                  emergency.location::GEOGRAPHY
                )::NUMERIC,
                2
              )::DOUBLE PRECISION
            ELSE NULL
          END AS current_distance_meters

        FROM emergency_cases
          AS emergency

        JOIN ambulances
          AS ambulance
          ON ambulance.id =
             $2::BIGINT

        WHERE emergency.id =
          $1::BIGINT

        FOR UPDATE OF
          emergency,
          ambulance;
      `,
      [
        emergencyId,
        ambulanceId,
      ],
    );

  return result.rows[0] ?? null;
}

export async function hasActiveDispatchForEmergency(
  client,
  emergencyId,
) {
  const result =
    await client.query(
      `
        SELECT EXISTS (
          SELECT 1

          FROM ambulance_dispatches

          WHERE
            emergency_case_id =
              $1::BIGINT

            AND status IN (
              'ASSIGNED',
              'EN_ROUTE',
              'ARRIVED'
            )
        ) AS exists;
      `,
      [
        emergencyId,
      ],
    );

  return result.rows[0].exists;
}

export async function hasActiveDispatchForAmbulance(
  client,
  ambulanceId,
) {
  const result =
    await client.query(
      `
        SELECT EXISTS (
          SELECT 1

          FROM ambulance_dispatches

          WHERE
            ambulance_id =
              $1::BIGINT

            AND status IN (
              'ASSIGNED',
              'EN_ROUTE',
              'ARRIVED'
            )
        ) AS exists;
      `,
      [
        ambulanceId,
      ],
    );

  return result.rows[0].exists;
}

export async function generateDispatchNumber(
  client,
) {
  const result =
    await client.query(
      `
        SELECT
          'DSP-'
          ||
          TO_CHAR(
            NOW() AT TIME ZONE 'UTC',
            'YYYYMMDD'
          )
          ||
          '-'
          ||
          LPAD(
            NEXTVAL(
              'ambulance_dispatch_number_seq'
            )::TEXT,
            8,
            '0'
          ) AS dispatch_number;
      `,
    );

  return result.rows[0]
    .dispatch_number;
}

export async function insertAmbulanceDispatch(
  client,
  {
    eventId,
    dispatchNumber,
    recommendationId,
    emergencyCaseId,
    ambulanceId,
    confirmedByUserId,
    emergencyLongitude,
    emergencyLatitude,
    ambulanceLongitude,
    ambulanceLatitude,
    assignedDistanceMeters,
    payload,
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
          payload
        )
        VALUES (
          $1::UUID,
          $2,
          $3::BIGINT,
          $4::BIGINT,
          $5::BIGINT,
          $6::BIGINT,
          'ASSIGNED',

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

          $11,
          NOW(),
          $12::JSONB
        )

        RETURNING
          id::TEXT AS id;
      `,
      [
        eventId,
        dispatchNumber,
        recommendationId,
        emergencyCaseId,
        ambulanceId,
        confirmedByUserId,
        emergencyLongitude,
        emergencyLatitude,
        ambulanceLongitude,
        ambulanceLatitude,
        assignedDistanceMeters,
        JSON.stringify(payload),
      ],
    );

  return result.rows[0];
}

export async function markRecommendationConfirmed(
  client,
  {
    recommendationId,
    userId,
  },
) {
  await client.query(
    `
      UPDATE dispatch_recommendations

      SET
        status = 'CONFIRMED',

        confirmed_by_user_id =
          $2::BIGINT,

        confirmed_at =
          NOW(),

        updated_at =
          NOW()

      WHERE id =
        $1::BIGINT

        AND status =
          'PENDING';
    `,
    [
      recommendationId,
      userId,
    ],
  );
}

export async function markRecommendationRejected(
  client,
  {
    recommendationId,
    userId,
    reason,
  },
) {
  await client.query(
    `
      UPDATE dispatch_recommendations

      SET
        status = 'REJECTED',

        rejected_by_user_id =
          $2::BIGINT,

        rejected_at =
          NOW(),

        rejection_reason =
          $3,

        updated_at =
          NOW()

      WHERE id =
        $1::BIGINT

        AND status =
          'PENDING';
    `,
    [
      recommendationId,
      userId,
      reason,
    ],
  );
}

export async function updateAmbulanceStatus(
  client,
  {
    ambulanceId,
    status,
  },
) {
  const result =
    await client.query(
      `
        UPDATE ambulances

        SET
          status = $2,
          updated_at = NOW()

        WHERE id =
          $1::BIGINT

        RETURNING
          id::TEXT AS id,
          code,
          status,
          is_operational,
          updated_at;
      `,
      [
        ambulanceId,
        status,
      ],
    );

  return result.rows[0] ?? null;
}

export async function insertDispatchStatusEvent(
  client,
  {
    eventId,
    dispatchId,
    status,
    changedByUserId,
    payload,
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
        NOW(),
        NOW(),
        $5::JSONB
      );
    `,
    [
      eventId,
      dispatchId,
      status,
      changedByUserId,
      JSON.stringify(payload),
    ],
  );
}

export async function resolveAlertByDeduplicationKey(
  client,
  {
    deduplicationKey,
    resolvedByUserId,
  },
) {
  const result =
    await client.query(
      `
        UPDATE alerts

        SET
          status = 'RESOLVED',

          resolved_by_user_id =
            $2::BIGINT,

          resolved_at =
            NOW(),

          updated_at =
            NOW()

        WHERE
          deduplication_key =
            $1

          AND status IN (
            'OPEN',
            'ACKNOWLEDGED'
          )

        RETURNING
          id::TEXT AS id;
      `,
      [
        deduplicationKey,
        resolvedByUserId,
      ],
    );

  return result.rows[0] ?? null;
}

export async function findDispatchByRecommendationId(
  client,
  recommendationId,
) {
  const result =
    await client.query(
      `
        ${dispatchSelect}

        WHERE dispatch.recommendation_id =
          $1::BIGINT

        LIMIT 1;
      `,
      [
        recommendationId,
      ],
    );

  return result.rows[0] ?? null;
}

export async function findDispatchById(
  client,
  dispatchId,
) {
  const result =
    await client.query(
      `
        ${dispatchSelect}

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

export async function listActiveDispatches(
  client,
  {
    governorateId = null,
    limit = 50,
  },
) {
  const result =
    await client.query(
      `
        ${dispatchSelect}

        WHERE
          dispatch.status IN (
            'ASSIGNED',
            'EN_ROUTE',
            'ARRIVED'
          )

          AND (
            $1::SMALLINT IS NULL
            OR emergency.governorate_id =
               $1::SMALLINT
          )

        ORDER BY
          dispatch.assigned_at DESC

        LIMIT $2;
      `,
      [
        governorateId,
        limit,
      ],
    );

  return result.rows;
}

/*
 * Finds a previously processed lifecycle command.
 *
 * dispatch_status_events.event_id is unique, so this provides
 * idempotency for Start, Arrive and Complete requests.
 */
export async function findDispatchStatusEventByEventId(
  client,
  eventId,
) {
  const result =
    await client.query(
      `
        SELECT
          status_event.id::TEXT
            AS id,

          status_event.event_id::TEXT
            AS event_id,

          status_event.dispatch_id::TEXT
            AS dispatch_id,

          status_event.status,

          status_event.changed_by_user_id::TEXT
            AS changed_by_user_id,

          status_event.occurred_at,

          status_event.received_at,

          status_event.payload

        FROM dispatch_status_events
          AS status_event

        WHERE status_event.event_id =
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
 * Locks the dispatch, emergency case and ambulance rows.
 *
 * They remain locked until COMMIT or ROLLBACK.
 */
export async function lockDispatchForTransition(
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

          dispatch.emergency_case_id::TEXT
            AS emergency_id,

          dispatch.ambulance_id::TEXT
            AS ambulance_id,

          dispatch.en_route_at,

          dispatch.arrived_at,

          dispatch.completed_at,

          emergency.case_number,

          emergency.status
            AS emergency_status,

          emergency.resolved_at,

          ambulance.code
            AS ambulance_code,

          ambulance.status
            AS ambulance_status,

          ambulance.is_operational
            AS ambulance_is_operational

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

        WHERE dispatch.id =
          $1::BIGINT

        FOR UPDATE OF
          dispatch,
          emergency,
          ambulance;
      `,
      [
        dispatchId,
      ],
    );

  return result.rows[0] ?? null;
}

const dispatchLifecycleUpdateQueries =
  Object.freeze({
    EN_ROUTE: `
      UPDATE ambulance_dispatches
      SET
        status = 'EN_ROUTE',

        en_route_at =
          COALESCE(
            en_route_at,
            NOW()
          ),

        updated_at = NOW()

      WHERE
        id = $1::BIGINT

        AND status = 'ASSIGNED'

      RETURNING
        id::TEXT AS id,
        status,
        assigned_at,
        en_route_at,
        arrived_at,
        completed_at,
        updated_at;
    `,

    ARRIVED: `
      UPDATE ambulance_dispatches
      SET
        status = 'ARRIVED',

        arrived_at =
          COALESCE(
            arrived_at,
            NOW()
          ),

        updated_at = NOW()

      WHERE
        id = $1::BIGINT

        AND status = 'EN_ROUTE'

      RETURNING
        id::TEXT AS id,
        status,
        assigned_at,
        en_route_at,
        arrived_at,
        completed_at,
        updated_at;
    `,

    COMPLETED: `
      UPDATE ambulance_dispatches
      SET
        status = 'COMPLETED',

        completed_at =
          COALESCE(
            completed_at,
            NOW()
          ),

        updated_at = NOW()

      WHERE
        id = $1::BIGINT

        AND status = 'ARRIVED'

      RETURNING
        id::TEXT AS id,
        status,
        assigned_at,
        en_route_at,
        arrived_at,
        completed_at,
        updated_at;
    `,
  });

/*
 * Performs one valid dispatch status transition.
 *
 * targetStatus is controlled internally by the Service and
 * cannot contain arbitrary SQL.
 */
export async function updateDispatchLifecycleStatus(
  client,
  {
    dispatchId,
    targetStatus,
  },
) {
  const query =
    dispatchLifecycleUpdateQueries[
      targetStatus
    ];

  if (!query) {
    throw new Error(
      `Unsupported dispatch target status: ${targetStatus}`,
    );
  }

  const result =
    await client.query(
      query,
      [
        dispatchId,
      ],
    );

  return result.rows[0] ?? null;
}

/*
 * Completes the emergency workflow.
 *
 * The table constraint requires resolved_at to exist whenever
 * the emergency status is RESOLVED.
 */
export async function resolveEmergencyCase(
  client,
  emergencyId,
) {
  const result =
    await client.query(
      `
        UPDATE emergency_cases
        SET
          status = 'RESOLVED',

          resolved_at =
            COALESCE(
              resolved_at,
              NOW()
            ),

          updated_at = NOW()

        WHERE
          id = $1::BIGINT

          AND status =
            'DISPATCHED'

        RETURNING
          id::TEXT AS id,
          status,
          resolved_at,
          updated_at;
      `,
      [
        emergencyId,
      ],
    );

  return result.rows[0] ?? null;
}

/*
 * Resolves alerts that belonged to the completed emergency.
 *
 * A new DISPATCH_STATUS_CHANGED alert for COMPLETED is created
 * after this operation so the completion itself remains visible.
 */
export async function resolveActiveAlertsForEmergency(
  client,
  {
    emergencyId,
    resolvedByUserId,
  },
) {
  const result =
    await client.query(
      `
        UPDATE alerts
        SET
          status = 'RESOLVED',

          resolved_by_user_id =
            $2::BIGINT,

          resolved_at = NOW(),

          updated_at = NOW()

        WHERE
          emergency_case_id =
            $1::BIGINT

          AND status IN (
            'OPEN',
            'ACKNOWLEDGED'
          )

        RETURNING
          id::TEXT AS id;
      `,
      [
        emergencyId,
        resolvedByUserId,
      ],
    );

  return result.rows;
}