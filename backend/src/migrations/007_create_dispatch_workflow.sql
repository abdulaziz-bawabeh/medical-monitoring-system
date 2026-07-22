/*
 * ============================================================
 * Ambulance dispatch number sequence
 * ============================================================
 *
 * Generates human-readable dispatch references.
 *
 * Example:
 * DSP-20260721-00000001
 */
CREATE SEQUENCE ambulance_dispatch_number_seq
    AS BIGINT
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    NO MAXVALUE
    CACHE 20;


/*
 * ============================================================
 * Dispatch recommendations
 * ============================================================
 *
 * Stores the ambulance recommended by the system for an
 * emergency case.
 *
 * The recommendation is not a real dispatch until the
 * health manager confirms it.
 */
CREATE TABLE dispatch_recommendations (
    id BIGINT
        GENERATED ALWAYS AS IDENTITY
        PRIMARY KEY,

    /*
     * Idempotency identifier for recommendation generation.
     */
    event_id UUID NOT NULL,

    emergency_case_id BIGINT NOT NULL,

    ambulance_id BIGINT NOT NULL,

    /*
     * The health manager who requested or generated
     * the recommendation.
     */
    requested_by_user_id BIGINT NOT NULL,

    /*
     * Recommendation lifecycle:
     *
     * PENDING
     *   Waiting for manager confirmation.
     *
     * CONFIRMED
     *   Manager accepted the recommendation.
     *
     * REJECTED
     *   Manager rejected the recommendation.
     *
     * EXPIRED
     *   Recommendation exceeded its allowed lifetime.
     *
     * SUPERSEDED
     *   Replaced by a newer recommendation.
     */
    status TEXT NOT NULL
        DEFAULT 'PENDING',

    /*
     * Straight-line geodesic distance calculated by PostGIS.
     *
     * This is stored in meters.
     */
    distance_meters NUMERIC(12, 2)
        NOT NULL,

    /*
     * The locations are copied at recommendation time.
     *
     * This creates an auditable snapshot even when the
     * ambulance moves later.
     */
    emergency_location
        geometry(Point, 4326)
        NOT NULL,

    ambulance_location
        geometry(Point, 4326)
        NOT NULL,

    /*
     * Time of the ambulance reading used for the recommendation.
     */
    ambulance_location_recorded_at
        TIMESTAMPTZ
        NOT NULL,

    /*
     * Age of the ambulance location at recommendation time.
     */
    ambulance_location_age_seconds
        INTEGER
        NOT NULL,

    /*
     * Maximum location age accepted by the recommendation
     * algorithm at that time.
     */
    max_location_age_seconds
        INTEGER
        NOT NULL,

    generated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    /*
     * The manager must confirm before this time.
     */
    expires_at TIMESTAMPTZ
        NOT NULL,

    confirmed_by_user_id BIGINT,

    confirmed_at TIMESTAMPTZ,

    rejected_by_user_id BIGINT,

    rejected_at TIMESTAMPTZ,

    rejection_reason TEXT,

    payload JSONB
        NOT NULL
        DEFAULT '{}'::JSONB,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    CONSTRAINT dispatch_recommendations_event_unique
        UNIQUE (event_id),

    CONSTRAINT dispatch_recommendations_emergency_fk
        FOREIGN KEY (emergency_case_id)
        REFERENCES emergency_cases (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT dispatch_recommendations_ambulance_fk
        FOREIGN KEY (ambulance_id)
        REFERENCES ambulances (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT dispatch_recommendations_requested_by_fk
        FOREIGN KEY (requested_by_user_id)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT dispatch_recommendations_confirmed_by_fk
        FOREIGN KEY (confirmed_by_user_id)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT dispatch_recommendations_rejected_by_fk
        FOREIGN KEY (rejected_by_user_id)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT dispatch_recommendations_status_check
        CHECK (
            status IN (
                'PENDING',
                'CONFIRMED',
                'REJECTED',
                'EXPIRED',
                'SUPERSEDED'
            )
        ),

    CONSTRAINT dispatch_recommendations_distance_check
        CHECK (
            distance_meters >= 0
        ),

    CONSTRAINT dispatch_recommendations_location_age_check
        CHECK (
            ambulance_location_age_seconds >= 0
            AND max_location_age_seconds > 0
            AND ambulance_location_age_seconds
                <= max_location_age_seconds
        ),

    CONSTRAINT dispatch_recommendations_expiration_check
        CHECK (
            expires_at > generated_at
        ),

    CONSTRAINT dispatch_recommendations_emergency_location_valid
        CHECK (
            ST_IsValid(
                emergency_location
            )
        ),

    CONSTRAINT dispatch_recommendations_ambulance_location_valid
        CHECK (
            ST_IsValid(
                ambulance_location
            )
        ),

    CONSTRAINT dispatch_recommendations_payload_object
        CHECK (
            JSONB_TYPEOF(payload) =
                'object'
        ),

    /*
     * Confirmation fields must exist together.
     */
    CONSTRAINT dispatch_recommendations_confirmation_pair
        CHECK (
            (
                confirmed_by_user_id IS NULL
                AND confirmed_at IS NULL
            )
            OR
            (
                confirmed_by_user_id IS NOT NULL
                AND confirmed_at IS NOT NULL
            )
        ),

    /*
     * Rejection fields must exist together.
     */
    CONSTRAINT dispatch_recommendations_rejection_pair
        CHECK (
            (
                rejected_by_user_id IS NULL
                AND rejected_at IS NULL
            )
            OR
            (
                rejected_by_user_id IS NOT NULL
                AND rejected_at IS NOT NULL
            )
        ),

    /*
     * Decision fields must agree with the status.
     */
    CONSTRAINT dispatch_recommendations_decision_state
        CHECK (
            (
                status = 'PENDING'
                AND confirmed_by_user_id IS NULL
                AND confirmed_at IS NULL
                AND rejected_by_user_id IS NULL
                AND rejected_at IS NULL
            )
            OR
            (
                status = 'CONFIRMED'
                AND confirmed_by_user_id IS NOT NULL
                AND confirmed_at IS NOT NULL
                AND rejected_by_user_id IS NULL
                AND rejected_at IS NULL
            )
            OR
            (
                status = 'REJECTED'
                AND rejected_by_user_id IS NOT NULL
                AND rejected_at IS NOT NULL
                AND confirmed_by_user_id IS NULL
                AND confirmed_at IS NULL
            )
            OR
            (
                status IN (
                    'EXPIRED',
                    'SUPERSEDED'
                )
                AND confirmed_by_user_id IS NULL
                AND confirmed_at IS NULL
                AND rejected_by_user_id IS NULL
                AND rejected_at IS NULL
            )
        )
);

/*
 * One emergency case may have only one currently pending
 * recommendation.
 *
 * Older CONFIRMED, REJECTED, EXPIRED or SUPERSEDED records
 * remain available for audit.
 */
CREATE UNIQUE INDEX
    dispatch_recommendations_one_pending_per_emergency_uidx

    ON dispatch_recommendations (
        emergency_case_id
    )

    WHERE status = 'PENDING';

CREATE INDEX
    dispatch_recommendations_status_generated_idx

    ON dispatch_recommendations (
        status,
        generated_at DESC
    );

CREATE INDEX
    dispatch_recommendations_ambulance_status_idx

    ON dispatch_recommendations (
        ambulance_id,
        status
    );

CREATE INDEX
    dispatch_recommendations_expiration_idx

    ON dispatch_recommendations (
        expires_at
    )

    WHERE status = 'PENDING';

CREATE INDEX
    dispatch_recommendations_emergency_location_gix

    ON dispatch_recommendations
    USING GIST (
        emergency_location
    );

CREATE INDEX
    dispatch_recommendations_ambulance_location_gix

    ON dispatch_recommendations
    USING GIST (
        ambulance_location
    );


/*
 * ============================================================
 * Ambulance dispatches
 * ============================================================
 *
 * A dispatch is created only after the health manager confirms
 * a recommendation.
 */
CREATE TABLE ambulance_dispatches (
    id BIGINT
        GENERATED ALWAYS AS IDENTITY
        PRIMARY KEY,

    event_id UUID NOT NULL,

    dispatch_number TEXT NOT NULL,

    recommendation_id BIGINT NOT NULL,

    emergency_case_id BIGINT NOT NULL,

    ambulance_id BIGINT NOT NULL,

    confirmed_by_user_id BIGINT NOT NULL,

    /*
     * Dispatch lifecycle:
     *
     * ASSIGNED
     *   Manager confirmed the ambulance.
     *
     * EN_ROUTE
     *   Ambulance started moving to the emergency.
     *
     * ARRIVED
     *   Ambulance reached the emergency.
     *
     * COMPLETED
     *   Emergency response finished.
     *
     * CANCELLED
     *   Dispatch was cancelled.
     */
    status TEXT NOT NULL
        DEFAULT 'ASSIGNED',

    /*
     * Location snapshots at assignment time.
     */
    emergency_location
        geometry(Point, 4326)
        NOT NULL,

    ambulance_start_location
        geometry(Point, 4326)
        NOT NULL,

    assigned_distance_meters
        NUMERIC(12, 2)
        NOT NULL,

    assigned_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    en_route_at TIMESTAMPTZ,

    arrived_at TIMESTAMPTZ,

    completed_at TIMESTAMPTZ,

    cancelled_at TIMESTAMPTZ,

    cancellation_reason TEXT,

    /*
     * Tracks the last accepted point of the dispatch route.
     */
    last_route_sequence_number BIGINT
        NOT NULL
        DEFAULT 0,

    last_route_point_at TIMESTAMPTZ,

    payload JSONB
        NOT NULL
        DEFAULT '{}'::JSONB,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    CONSTRAINT ambulance_dispatches_event_unique
        UNIQUE (event_id),

    CONSTRAINT ambulance_dispatches_number_unique
        UNIQUE (dispatch_number),

    CONSTRAINT ambulance_dispatches_recommendation_unique
        UNIQUE (recommendation_id),

    CONSTRAINT ambulance_dispatches_recommendation_fk
        FOREIGN KEY (recommendation_id)
        REFERENCES dispatch_recommendations (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT ambulance_dispatches_emergency_fk
        FOREIGN KEY (emergency_case_id)
        REFERENCES emergency_cases (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT ambulance_dispatches_ambulance_fk
        FOREIGN KEY (ambulance_id)
        REFERENCES ambulances (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT ambulance_dispatches_confirmed_by_fk
        FOREIGN KEY (confirmed_by_user_id)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT ambulance_dispatches_number_not_blank
        CHECK (
            LENGTH(
                BTRIM(
                    dispatch_number
                )
            ) > 0
        ),

    CONSTRAINT ambulance_dispatches_status_check
        CHECK (
            status IN (
                'ASSIGNED',
                'EN_ROUTE',
                'ARRIVED',
                'COMPLETED',
                'CANCELLED'
            )
        ),

    CONSTRAINT ambulance_dispatches_distance_check
        CHECK (
            assigned_distance_meters >= 0
        ),

    CONSTRAINT ambulance_dispatches_route_sequence_check
        CHECK (
            last_route_sequence_number >= 0
        ),

    CONSTRAINT ambulance_dispatches_emergency_location_valid
        CHECK (
            ST_IsValid(
                emergency_location
            )
        ),

    CONSTRAINT ambulance_dispatches_start_location_valid
        CHECK (
            ST_IsValid(
                ambulance_start_location
            )
        ),

    CONSTRAINT ambulance_dispatches_payload_object
        CHECK (
            JSONB_TYPEOF(payload) =
                'object'
        ),

    CONSTRAINT ambulance_dispatches_status_timestamps
        CHECK (
            (
                status = 'ASSIGNED'
                AND en_route_at IS NULL
                AND arrived_at IS NULL
                AND completed_at IS NULL
                AND cancelled_at IS NULL
            )
            OR
            (
                status = 'EN_ROUTE'
                AND en_route_at IS NOT NULL
                AND arrived_at IS NULL
                AND completed_at IS NULL
                AND cancelled_at IS NULL
            )
            OR
            (
                status = 'ARRIVED'
                AND en_route_at IS NOT NULL
                AND arrived_at IS NOT NULL
                AND completed_at IS NULL
                AND cancelled_at IS NULL
            )
            OR
            (
                status = 'COMPLETED'
                AND en_route_at IS NOT NULL
                AND arrived_at IS NOT NULL
                AND completed_at IS NOT NULL
                AND cancelled_at IS NULL
            )
            OR
            (
                status = 'CANCELLED'
                AND completed_at IS NULL
                AND cancelled_at IS NOT NULL
            )
        ),

    CONSTRAINT ambulance_dispatches_time_order
        CHECK (
            (
                en_route_at IS NULL
                OR en_route_at >= assigned_at
            )
            AND
            (
                arrived_at IS NULL
                OR (
                    en_route_at IS NOT NULL
                    AND arrived_at >= en_route_at
                )
            )
            AND
            (
                completed_at IS NULL
                OR (
                    arrived_at IS NOT NULL
                    AND completed_at >= arrived_at
                )
            )
            AND
            (
                cancelled_at IS NULL
                OR cancelled_at >= assigned_at
            )
        )
);

/*
 * Prevent two active dispatches for the same emergency.
 */
CREATE UNIQUE INDEX
    ambulance_dispatches_one_active_per_emergency_uidx

    ON ambulance_dispatches (
        emergency_case_id
    )

    WHERE status IN (
        'ASSIGNED',
        'EN_ROUTE',
        'ARRIVED'
    );

/*
 * Prevent one ambulance from being assigned to two active
 * emergency cases.
 */
CREATE UNIQUE INDEX
    ambulance_dispatches_one_active_per_ambulance_uidx

    ON ambulance_dispatches (
        ambulance_id
    )

    WHERE status IN (
        'ASSIGNED',
        'EN_ROUTE',
        'ARRIVED'
    );

CREATE INDEX
    ambulance_dispatches_status_assigned_idx

    ON ambulance_dispatches (
        status,
        assigned_at DESC
    );

CREATE INDEX
    ambulance_dispatches_emergency_idx

    ON ambulance_dispatches (
        emergency_case_id,
        created_at DESC
    );

CREATE INDEX
    ambulance_dispatches_ambulance_idx

    ON ambulance_dispatches (
        ambulance_id,
        created_at DESC
    );

CREATE INDEX
    ambulance_dispatches_emergency_location_gix

    ON ambulance_dispatches
    USING GIST (
        emergency_location
    );

CREATE INDEX
    ambulance_dispatches_start_location_gix

    ON ambulance_dispatches
    USING GIST (
        ambulance_start_location
    );


/*
 * ============================================================
 * Dispatch status events
 * ============================================================
 *
 * Immutable history of dispatch status transitions.
 */
CREATE TABLE dispatch_status_events (
    id BIGINT
        GENERATED ALWAYS AS IDENTITY
        PRIMARY KEY,

    event_id UUID NOT NULL,

    dispatch_id BIGINT NOT NULL,

    status TEXT NOT NULL,

    /*
     * NULL means the transition was generated automatically
     * by the system.
     */
    changed_by_user_id BIGINT,

    occurred_at TIMESTAMPTZ
        NOT NULL,

    received_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    payload JSONB
        NOT NULL
        DEFAULT '{}'::JSONB,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    CONSTRAINT dispatch_status_events_event_unique
        UNIQUE (event_id),

    CONSTRAINT dispatch_status_events_dispatch_fk
        FOREIGN KEY (dispatch_id)
        REFERENCES ambulance_dispatches (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT dispatch_status_events_changed_by_fk
        FOREIGN KEY (changed_by_user_id)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT dispatch_status_events_status_check
        CHECK (
            status IN (
                'ASSIGNED',
                'EN_ROUTE',
                'ARRIVED',
                'COMPLETED',
                'CANCELLED'
            )
        ),

    CONSTRAINT dispatch_status_events_received_time
        CHECK (
            received_at >= occurred_at
        ),

    CONSTRAINT dispatch_status_events_payload_object
        CHECK (
            JSONB_TYPEOF(payload) =
                'object'
        )
);

CREATE INDEX
    dispatch_status_events_dispatch_time_idx

    ON dispatch_status_events (
        dispatch_id,
        occurred_at ASC
    );

CREATE INDEX
    dispatch_status_events_status_time_idx

    ON dispatch_status_events (
        status,
        occurred_at DESC
    );


/*
 * ============================================================
 * Dispatch route points
 * ============================================================
 *
 * Stores one-second ambulance route readings during an active
 * dispatch.
 *
 * These points can later be combined with ST_MakeLine to draw
 * the actual travelled path.
 */
CREATE TABLE dispatch_route_points (
    id BIGINT
        GENERATED ALWAYS AS IDENTITY
        PRIMARY KEY,

    event_id UUID NOT NULL,

    dispatch_id BIGINT NOT NULL,

    ambulance_id BIGINT NOT NULL,

    sequence_number BIGINT NOT NULL,

    location geometry(Point, 4326)
        NOT NULL,

    speed_kmh NUMERIC(7, 2),

    heading_degrees NUMERIC(6, 2),

    recorded_at TIMESTAMPTZ
        NOT NULL,

    received_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    /*
     * TRUE when this event was restored from PostgreSQL after
     * a client or Socket.IO disconnection.
     */
    is_recovered BOOLEAN
        NOT NULL
        DEFAULT FALSE,

    source TEXT
        NOT NULL
        DEFAULT 'AMBULANCE_DEVICE',

    payload JSONB
        NOT NULL
        DEFAULT '{}'::JSONB,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    CONSTRAINT dispatch_route_points_event_unique
        UNIQUE (event_id),

    CONSTRAINT dispatch_route_points_sequence_unique
        UNIQUE (
            dispatch_id,
            sequence_number
        ),

    CONSTRAINT dispatch_route_points_dispatch_fk
        FOREIGN KEY (dispatch_id)
        REFERENCES ambulance_dispatches (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT dispatch_route_points_ambulance_fk
        FOREIGN KEY (ambulance_id)
        REFERENCES ambulances (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT dispatch_route_points_sequence_check
        CHECK (
            sequence_number > 0
        ),

    CONSTRAINT dispatch_route_points_speed_check
        CHECK (
            speed_kmh IS NULL
            OR speed_kmh >= 0
        ),

    CONSTRAINT dispatch_route_points_heading_check
        CHECK (
            heading_degrees IS NULL
            OR (
                heading_degrees >= 0
                AND heading_degrees < 360
            )
        ),

    CONSTRAINT dispatch_route_points_location_valid
        CHECK (
            ST_IsValid(
                location
            )
        ),

    CONSTRAINT dispatch_route_points_received_time
        CHECK (
            received_at >= recorded_at
        ),

    CONSTRAINT dispatch_route_points_source_not_blank
        CHECK (
            LENGTH(
                BTRIM(source)
            ) > 0
        ),

    CONSTRAINT dispatch_route_points_payload_object
        CHECK (
            JSONB_TYPEOF(payload) =
                'object'
        )
);

CREATE INDEX
    dispatch_route_points_dispatch_sequence_idx

    ON dispatch_route_points (
        dispatch_id,
        sequence_number ASC
    );

CREATE INDEX
    dispatch_route_points_dispatch_recorded_idx

    ON dispatch_route_points (
        dispatch_id,
        recorded_at ASC
    );

CREATE INDEX
    dispatch_route_points_ambulance_recorded_idx

    ON dispatch_route_points (
        ambulance_id,
        recorded_at DESC
    );

CREATE INDEX
    dispatch_route_points_recorded_at_idx

    ON dispatch_route_points (
        recorded_at
    );

CREATE INDEX
    dispatch_route_points_location_gix

    ON dispatch_route_points
    USING GIST (
        location
    );


/*
 * ============================================================
 * Two-day route history cleanup
 * ============================================================
 *
 * Dispatch records and status history remain available.
 *
 * Only high-frequency route telemetry is deleted after
 * the required two-day retention period.
 */
CREATE OR REPLACE FUNCTION
    cleanup_dispatch_route_history()

RETURNS INTEGER

LANGUAGE plpgsql

AS $$
DECLARE
    deleted_route_point_count INTEGER;
BEGIN
    DELETE FROM dispatch_route_points
    WHERE recorded_at <
        NOW() - INTERVAL '2 days';

    GET DIAGNOSTICS
        deleted_route_point_count =
            ROW_COUNT;

    RETURN deleted_route_point_count;
END;
$$;