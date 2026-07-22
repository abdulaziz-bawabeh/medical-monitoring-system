/**
 * Reads governorate boundaries from PostgreSQL/PostGIS
 * and converts every row into a valid GeoJSON Feature.
 */
export async function listGovernorateBoundaryFeatures(
    client,
    governorateId = null,
  ) {
    const result = await client.query(
      `
        SELECT
          JSONB_BUILD_OBJECT(
            'type',
            'Feature',
  
            'id',
            governorate.id::TEXT,
  
            'geometry',
            ST_AsGeoJSON(
              governorate.boundary,
              6,
              0
            )::JSONB,
  
            'properties',
            JSONB_BUILD_OBJECT(
              'id',
              governorate.id::TEXT,
  
              'name',
              governorate.name,
  
              'slug',
              governorate.slug,
  
              'isActive',
              governorate.is_active,
  
              'isSelected',
              CASE
                WHEN $1::SMALLINT IS NULL
                  THEN FALSE
  
                ELSE governorate.id =
                  $1::SMALLINT
              END
            )
          ) AS feature
  
        FROM governorates
          AS governorate
  
        WHERE
          governorate.is_active = TRUE
  
          AND governorate.boundary
            IS NOT NULL
  
          AND (
            $1::SMALLINT IS NULL
            OR governorate.id =
               $1::SMALLINT
          )
  
        ORDER BY
          governorate.name;
      `,
      [
        governorateId,
      ],
    );
  
    return result.rows.map(
      (row) => row.feature,
    );
  }