/*
 * ============================================================
 * Medical facilities
 * ============================================================
 *
 * Stores the fixed information for:
 * - Central hospitals
 * - Clinics
 * - Field medical points
 *
 * Live occupancy readings will be stored in separate tables
 * because occupied beds can change every second.
 */
CREATE TABLE medical_facilities (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    governorate_id SMALLINT NOT NULL,

    /*
     * Stable operational identifier.
     *
     * Examples:
     * DAM-HOSP-001
     * ALE-CLINIC-001
     * HMS-FIELD-001
     */
    code TEXT NOT NULL,

    name TEXT NOT NULL,

    facility_type TEXT NOT NULL,

    address TEXT,

    phone TEXT,

    /*
     * The permanent or configured bed capacity.
     *
     * occupied_beds will not be stored here because it changes
     * frequently and requires current-state and historical tables.
     */
    total_beds INTEGER NOT NULL DEFAULT 0,

    is_operational BOOLEAN NOT NULL DEFAULT TRUE,

    /*
     * Fixed geographical location of the facility.
     *
     * PostGIS uses:
     * POINT(longitude latitude)
     *
     * SRID 4326 is the standard longitude/latitude coordinate system.
     */
    location geometry(Point, 4326) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT medical_facilities_governorate_fk
        FOREIGN KEY (governorate_id)
        REFERENCES governorates (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT medical_facilities_code_not_blank_check
        CHECK (LENGTH(BTRIM(code)) > 0),

    CONSTRAINT medical_facilities_code_format_check
        CHECK (
            code ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)*$'
        ),

    CONSTRAINT medical_facilities_name_not_blank_check
        CHECK (LENGTH(BTRIM(name)) > 0),

    CONSTRAINT medical_facilities_type_check
        CHECK (
            facility_type IN (
                'CENTRAL_HOSPITAL',
                'CLINIC',
                'FIELD_MEDICAL_POINT'
            )
        ),

    CONSTRAINT medical_facilities_total_beds_nonnegative_check
        CHECK (total_beds >= 0),

    CONSTRAINT medical_facilities_location_valid_check
        CHECK (ST_IsValid(location)),

    CONSTRAINT medical_facilities_longitude_check
        CHECK (
            ST_X(location) BETWEEN -180 AND 180
        ),

    CONSTRAINT medical_facilities_latitude_check
        CHECK (
            ST_Y(location) BETWEEN -90 AND 90
        )
);

CREATE UNIQUE INDEX medical_facilities_code_unique_idx
    ON medical_facilities (code);

CREATE INDEX medical_facilities_governorate_idx
    ON medical_facilities (governorate_id);

CREATE INDEX medical_facilities_type_idx
    ON medical_facilities (facility_type);

CREATE INDEX medical_facilities_governorate_type_idx
    ON medical_facilities (
        governorate_id,
        facility_type
    );

CREATE INDEX medical_facilities_operational_idx
    ON medical_facilities (is_operational);

CREATE INDEX medical_facilities_location_gix
    ON medical_facilities
    USING GIST (location);


/*
 * ============================================================
 * Ambulances
 * ============================================================
 *
 * Stores the ambulance identity, current status and latest
 * known geographical position.
 *
 * Full location history will be stored in a separate event table.
 */
CREATE TABLE ambulances (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    /*
     * Administrative assignment of the ambulance.
     *
     * The ambulance's actual current governorate may later be
     * calculated spatially from current_location.
     */
    assigned_governorate_id SMALLINT NOT NULL,

    /*
     * Optional facility from which the ambulance normally operates.
     */
    base_facility_id BIGINT,

    /*
     * Human-readable operational identifier.
     *
     * Example:
     * A-101
     * A-205
     */
    code TEXT NOT NULL,

    /*
     * Unique identifier for the device or telemetry source
     * sending live locations.
     *
     * Example:
     * ambulance-device-101
     */
    device_id TEXT NOT NULL,

    /*
     * Minimal operational statuses required by the MVP.
     *
     * AVAILABLE:
     * ready for a new dispatch.
     *
     * BUSY:
     * already assigned to an active mission.
     *
     * OFFLINE:
     * no trusted live connection or recent location.
     *
     * MAINTENANCE:
     * operationally unavailable.
     */
    status TEXT NOT NULL DEFAULT 'OFFLINE',

    /*
     * Indicates whether the ambulance is technically and medically
     * capable of being considered for a mission.
     *
     * Nearest-ambulance selection will require:
     * status = 'AVAILABLE'
     * and is_operational = TRUE
     */
    is_operational BOOLEAN NOT NULL DEFAULT TRUE,

    /*
     * Latest known geographical position.
     *
     * It is nullable because a newly registered ambulance may not
     * have sent its first location yet.
     */
    current_location geometry(Point, 4326),

    last_location_at TIMESTAMPTZ,

    /*
     * Latest accepted sequence number for the current snapshot.
     *
     * The complete event history and duplicate-prevention constraint
     * will be added later in ambulance_location_events.
     */
    last_sequence_number BIGINT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ambulances_assigned_governorate_fk
        FOREIGN KEY (assigned_governorate_id)
        REFERENCES governorates (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT ambulances_base_facility_fk
        FOREIGN KEY (base_facility_id)
        REFERENCES medical_facilities (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT ambulances_code_not_blank_check
        CHECK (LENGTH(BTRIM(code)) > 0),

    CONSTRAINT ambulances_code_format_check
        CHECK (
            code ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)*$'
        ),

    CONSTRAINT ambulances_device_id_not_blank_check
        CHECK (LENGTH(BTRIM(device_id)) > 0),

    CONSTRAINT ambulances_status_check
        CHECK (
            status IN (
                'AVAILABLE',
                'BUSY',
                'OFFLINE',
                'MAINTENANCE'
            )
        ),

    CONSTRAINT ambulances_last_sequence_nonnegative_check
        CHECK (last_sequence_number >= 0),

    CONSTRAINT ambulances_location_time_check
        CHECK (
            current_location IS NULL
            OR last_location_at IS NOT NULL
        ),

    CONSTRAINT ambulances_location_valid_check
        CHECK (
            current_location IS NULL
            OR ST_IsValid(current_location)
        ),

    CONSTRAINT ambulances_longitude_check
        CHECK (
            current_location IS NULL
            OR ST_X(current_location) BETWEEN -180 AND 180
        ),

    CONSTRAINT ambulances_latitude_check
        CHECK (
            current_location IS NULL
            OR ST_Y(current_location) BETWEEN -90 AND 90
        )
);

CREATE UNIQUE INDEX ambulances_code_unique_idx
    ON ambulances (code);

CREATE UNIQUE INDEX ambulances_device_id_unique_idx
    ON ambulances (device_id);

CREATE INDEX ambulances_assigned_governorate_idx
    ON ambulances (assigned_governorate_id);

CREATE INDEX ambulances_base_facility_idx
    ON ambulances (base_facility_id)
    WHERE base_facility_id IS NOT NULL;

CREATE INDEX ambulances_status_idx
    ON ambulances (status);

CREATE INDEX ambulances_dispatch_eligibility_idx
    ON ambulances (
        status,
        is_operational
    );

CREATE INDEX ambulances_last_location_at_idx
    ON ambulances (last_location_at)
    WHERE last_location_at IS NOT NULL;

CREATE INDEX ambulances_current_location_gix
    ON ambulances
    USING GIST (current_location)
    WHERE current_location IS NOT NULL;