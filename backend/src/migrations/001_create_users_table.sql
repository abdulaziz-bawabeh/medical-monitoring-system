CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    email TEXT NOT NULL,

    full_name TEXT NOT NULL,

    password_hash TEXT NOT NULL,

    role TEXT NOT NULL DEFAULT 'health_manager',

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    token_version INTEGER NOT NULL DEFAULT 0,

    failed_login_attempts INTEGER NOT NULL DEFAULT 0,

    locked_until TIMESTAMPTZ,

    last_login_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_email_normalized_check
        CHECK (email = LOWER(BTRIM(email))),

    CONSTRAINT users_email_not_blank_check
        CHECK (LENGTH(BTRIM(email)) > 0),

    CONSTRAINT users_email_length_check
        CHECK (LENGTH(email) <= 320),

    CONSTRAINT users_email_basic_format_check
        CHECK (POSITION('@' IN email) > 1),

    CONSTRAINT users_full_name_not_blank_check
        CHECK (LENGTH(BTRIM(full_name)) >= 2),

    CONSTRAINT users_password_hash_not_blank_check
        CHECK (LENGTH(BTRIM(password_hash)) > 0),

    CONSTRAINT users_role_check
        CHECK (role IN ('health_manager')),

    CONSTRAINT users_token_version_nonnegative_check
        CHECK (token_version >= 0),

    CONSTRAINT users_failed_login_attempts_nonnegative_check
        CHECK (failed_login_attempts >= 0)
);

CREATE UNIQUE INDEX users_email_unique_idx
    ON users (email);

CREATE INDEX users_role_active_idx
    ON users (role, is_active);

CREATE INDEX users_locked_until_idx
    ON users (locked_until)
    WHERE locked_until IS NOT NULL;