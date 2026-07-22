CREATE TABLE governorates (
    id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name TEXT NOT NULL,

    slug TEXT NOT NULL,

    /*
     * Stores the geographical boundary of a governorate.
     *
     * MultiPolygon is used because one administrative area may
     * consist of multiple separate polygon parts.
     *
     * SRID 4326 represents standard longitude/latitude coordinates.
     *
     * The value is temporarily nullable because we have not imported
     * a verified Syria governorates GeoJSON file yet.
     */
    boundary geometry(MultiPolygon, 4326),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT governorates_name_not_blank_check
        CHECK (LENGTH(BTRIM(name)) > 0),

    CONSTRAINT governorates_slug_not_blank_check
        CHECK (LENGTH(BTRIM(slug)) > 0),

    CONSTRAINT governorates_slug_format_check
        CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),

    CONSTRAINT governorates_boundary_valid_check
        CHECK (
            boundary IS NULL
            OR ST_IsValid(boundary)
        )
);

CREATE UNIQUE INDEX governorates_name_unique_idx
    ON governorates (LOWER(name));

CREATE UNIQUE INDEX governorates_slug_unique_idx
    ON governorates (slug);

CREATE INDEX governorates_active_idx
    ON governorates (is_active);

CREATE INDEX governorates_boundary_gix
    ON governorates
    USING GIST (boundary)
    WHERE boundary IS NOT NULL;


/*
 * Initial Syrian governorates.
 *
 * The boundaries remain NULL until a verified GeoJSON dataset
 * is imported in a later step.
 */
INSERT INTO governorates (
    name,
    slug
)
VALUES
    ('Damascus', 'damascus'),
    ('Rif Dimashq', 'rif-dimashq'),
    ('Aleppo', 'aleppo'),
    ('Homs', 'homs'),
    ('Hama', 'hama'),
    ('Latakia', 'latakia'),
    ('Tartus', 'tartus'),
    ('Idlib', 'idlib'),
    ('Al-Hasakah', 'al-hasakah'),
    ('Deir ez-Zor', 'deir-ez-zor'),
    ('Raqqa', 'raqqa'),
    ('Daraa', 'daraa'),
    ('As-Suwayda', 'as-suwayda'),
    ('Quneitra', 'quneitra')
ON CONFLICT DO NOTHING;