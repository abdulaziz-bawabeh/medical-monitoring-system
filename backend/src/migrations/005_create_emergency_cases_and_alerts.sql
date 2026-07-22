/*
 * ============================================================
 * Emergency cases
 * ============================================================
 *
 * Stores emergency incidents reported to the medical
 * operations system.
 *
 * Each case has a geographical location that will later be
 * used to find the nearest eligible ambulance with PostGIS.
 */
CREATE TABLE emergency_cases (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    /*
     * Unique event identifier used for idempotency.
     *
     * Repeating the same event_id must not create another case.
     */
    event_id UUID NOT NULL,

    /*
     * Human-readable case reference displayed in the UI.
     *
     * Example:
     * EMR-20260721-0001
     */
    case_number TEXT NOT NULL,

    /*
     * The manager who created or registered the emergency case.
     *
     * Device-originated cases can be supported later through
     * a dedicated device-authentication flow.
     */
    created_by_user_id BIGINT NOT NULL,

    /*
     * Governorate containing the emergency location.
     *
     * The Backend service will determine this value using
     * ST_Covers(governorates.boundary, emergency.location).
     */
    governorate_id SMALLINT NOT NULL,

    /*
     * A concise description visible to the health manager.
     */
    summary TEXT NOT NULL,

    /*
     * Workflow:
     *
     * OPEN
     *   Newly created case.
     *
     * AWAITING_MANAGER_CONFIRMATION
     *   The system produced an ambulance recommendation and
     *   is waiting for the manager.
     *
     * DISPATCHED
     *   A dispatch was confirmed and created.
     *
     * RESOLVED
     *   Emergency response completed.
     *
     * CANCELLED
     *   Case cancelled before completion.
     */
    status TEXT NOT NULL DEFAULT 'OPEN',

    /*
     * Emergency geographical location.
     *
     * Coordinate order in PostGIS:
     * POINT(longitude latitude)
     */
    location geometry(Point, 4326) NOT NULL,

    reported_at TIMESTAMPTZ NOT NULL,

    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    resolved_at TIMESTAMPTZ,

    /*
     * Optional additional details that do not require dedicated
     * columns in the MVP.
     */
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT emergency_cases_event_unique
        UNIQUE (event_id),

    CONSTRAINT emergency_cases_number_unique
        UNIQUE (case_number),

    CONSTRAINT emergency_cases_created_by_user_fk
        FOREIGN KEY (created_by_user_id)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT emergency_cases_governorate_fk
        FOREIGN KEY (governorate_id)
        REFERENCES governorates (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT emergency_cases_number_not_blank
        CHECK (
            LENGTH(
                BTRIM(case_number)
            ) > 0
        ),

    CONSTRAINT emergency_cases_summary_not_blank
        CHECK (
            LENGTH(
                BTRIM(summary)
            ) > 0
        ),

    CONSTRAINT emergency_cases_status_check
        CHECK (
            status IN (
                'OPEN',
                'AWAITING_MANAGER_CONFIRMATION',
                'DISPATCHED',
                'RESOLVED',
                'CANCELLED'
            )
        ),

    CONSTRAINT emergency_cases_location_valid
        CHECK (
            ST_IsValid(location)
        ),

    CONSTRAINT emergency_cases_longitude_range
        CHECK (
            ST_X(location)
            BETWEEN -180 AND 180
        ),

    CONSTRAINT emergency_cases_latitude_range
        CHECK (
            ST_Y(location)
            BETWEEN -90 AND 90
        ),

    CONSTRAINT emergency_cases_received_after_reported
        CHECK (
            received_at >= reported_at
        ),

    CONSTRAINT emergency_cases_resolved_time_check
        CHECK (
            (
                status = 'RESOLVED'
                AND resolved_at IS NOT NULL
                AND resolved_at >= reported_at
            )
            OR
            (
                status <> 'RESOLVED'
                AND resolved_at IS NULL
            )
        ),

    CONSTRAINT emergency_cases_payload_object
        CHECK (
            JSONB_TYPEOF(payload) = 'object'
        )
);

CREATE INDEX emergency_cases_governorate_idx
    ON emergency_cases (governorate_id);

CREATE INDEX emergency_cases_status_idx
    ON emergency_cases (status);

CREATE INDEX emergency_cases_status_reported_idx
    ON emergency_cases (
        status,
        reported_at DESC
    );

CREATE INDEX emergency_cases_reported_at_idx
    ON emergency_cases (
        reported_at DESC
    );

CREATE INDEX emergency_cases_location_gix
    ON emergency_cases
    USING GIST (location);


/*
 * ============================================================
 * Alerts
 * ============================================================
 *
 * Stores operational alerts displayed to the health manager.
 *
 * Alerts may originate from:
 * - High facility occupancy.
 * - A newly created emergency case.
 * - A dispatch requiring manager confirmation.
 * - An ambulance becoming offline.
 * - A dispatch status change.
 */
CREATE TABLE alerts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    /*
     * Unique alert event identifier.
     */
    event_id UUID NOT NULL,

    /*
     * Stable duplicate-prevention value.
     *
     * Examples:
     * facility-red:<occupancy-event-id>
     * emergency-created:<emergency-event-id>
     * dispatch-confirmation:<emergency-case-id>
     */
    deduplication_key TEXT NOT NULL,

    emergency_case_id BIGINT,

    facility_id BIGINT,

    ambulance_id BIGINT,

    alert_type TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'OPEN',

    title TEXT NOT NULL,

    message TEXT NOT NULL,

    /*
     * The user who acknowledged the alert.
     */
    acknowledged_by_user_id BIGINT,

    acknowledged_at TIMESTAMPTZ,

    /*
     * The user who resolved the alert.
     */
    resolved_by_user_id BIGINT,

    resolved_at TIMESTAMPTZ,

    payload JSONB NOT NULL DEFAULT '{}'::JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT alerts_event_unique
        UNIQUE (event_id),

    CONSTRAINT alerts_deduplication_key_unique
        UNIQUE (deduplication_key),

    CONSTRAINT alerts_emergency_case_fk
        FOREIGN KEY (emergency_case_id)
        REFERENCES emergency_cases (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT alerts_facility_fk
        FOREIGN KEY (facility_id)
        REFERENCES medical_facilities (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT alerts_ambulance_fk
        FOREIGN KEY (ambulance_id)
        REFERENCES ambulances (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT alerts_acknowledged_by_user_fk
        FOREIGN KEY (acknowledged_by_user_id)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT alerts_resolved_by_user_fk
        FOREIGN KEY (resolved_by_user_id)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT alerts_deduplication_key_not_blank
        CHECK (
            LENGTH(
                BTRIM(deduplication_key)
            ) > 0
        ),

    CONSTRAINT alerts_title_not_blank
        CHECK (
            LENGTH(
                BTRIM(title)
            ) > 0
        ),

    CONSTRAINT alerts_message_not_blank
        CHECK (
            LENGTH(
                BTRIM(message)
            ) > 0
        ),

    CONSTRAINT alerts_type_check
        CHECK (
            alert_type IN (
                'FACILITY_HIGH_OCCUPANCY',
                'EMERGENCY_CASE_CREATED',
                'DISPATCH_CONFIRMATION_REQUIRED',
                'AMBULANCE_OFFLINE',
                'DISPATCH_STATUS_CHANGED'
            )
        ),

    CONSTRAINT alerts_status_check
        CHECK (
            status IN (
                'OPEN',
                'ACKNOWLEDGED',
                'RESOLVED'
            )
        ),

    /*
     * Every alert must be associated with at least one
     * operational resource or emergency case.
     */
    CONSTRAINT alerts_source_required
        CHECK (
            NUM_NONNULLS(
                emergency_case_id,
                facility_id,
                ambulance_id
            ) >= 1
        ),

    /*
     * The user and timestamp must either both exist or both
     * be NULL.
     */
    CONSTRAINT alerts_acknowledgement_pair_check
        CHECK (
            (
                acknowledged_by_user_id IS NULL
                AND acknowledged_at IS NULL
            )
            OR
            (
                acknowledged_by_user_id IS NOT NULL
                AND acknowledged_at IS NOT NULL
            )
        ),

    CONSTRAINT alerts_resolution_pair_check
        CHECK (
            (
                resolved_by_user_id IS NULL
                AND resolved_at IS NULL
            )
            OR
            (
                resolved_by_user_id IS NOT NULL
                AND resolved_at IS NOT NULL
            )
        ),

    CONSTRAINT alerts_status_timestamps_check
        CHECK (
            (
                status = 'OPEN'
                AND acknowledged_at IS NULL
                AND resolved_at IS NULL
            )
            OR
            (
                status = 'ACKNOWLEDGED'
                AND acknowledged_at IS NOT NULL
                AND resolved_at IS NULL
            )
            OR
            (
                status = 'RESOLVED'
                AND resolved_at IS NOT NULL
            )
        ),

    CONSTRAINT alerts_acknowledged_time_check
        CHECK (
            acknowledged_at IS NULL
            OR acknowledged_at >= created_at
        ),

    CONSTRAINT alerts_resolved_time_check
        CHECK (
            resolved_at IS NULL
            OR resolved_at >= created_at
        ),

    CONSTRAINT alerts_payload_object
        CHECK (
            JSONB_TYPEOF(payload) = 'object'
        )
);

CREATE INDEX alerts_status_created_idx
    ON alerts (
        status,
        created_at DESC
    );

CREATE INDEX alerts_type_created_idx
    ON alerts (
        alert_type,
        created_at DESC
    );

CREATE INDEX alerts_open_idx
    ON alerts (
        created_at DESC
    )
    WHERE status = 'OPEN';

CREATE INDEX alerts_emergency_case_idx
    ON alerts (emergency_case_id)
    WHERE emergency_case_id IS NOT NULL;

CREATE INDEX alerts_facility_idx
    ON alerts (facility_id)
    WHERE facility_id IS NOT NULL;

CREATE INDEX alerts_ambulance_idx
    ON alerts (ambulance_id)
    WHERE ambulance_id IS NOT NULL;