import {
    readFile,
  } from "node:fs/promises";
  
  import {
    fileURLToPath,
  } from "node:url";
  
  import {
    pool,
  } from "../config/databasePool.js";
  
  /*
   * Local files downloaded in the previous step.
   */
  const geoJsonFilePath =
    fileURLToPath(
      new URL(
        "../../data/geoboundaries/syria-adm1-simplified.geojson",
        import.meta.url,
      ),
    );
  
  const metadataFilePath =
    fileURLToPath(
      new URL(
        "../../data/geoboundaries/syria-adm1-metadata.json",
        import.meta.url,
      ),
    );
  
  /*
   * geoBoundaries uses several different English spellings
   * from the names already stored in our governorates table.
   *
   * We do not rename the database records.
   * We explicitly map each source name to its database slug.
   */
  const sourceNameToDatabaseSlug =
    new Map([
      [
        "Damascus",
        "damascus",
      ],
      [
        "Aleppo",
        "aleppo",
      ],
      [
        "Rural Damascus",
        "rif-dimashq",
      ],
      [
        "Homs",
        "homs",
      ],
      [
        "Hama",
        "hama",
      ],
      [
        "Lattakia",
        "latakia",
      ],
      [
        "Idleb",
        "idlib",
      ],
      [
        "Al-Hasakeh",
        "al-hasakah",
      ],
      [
        "Deir-ez-Zor",
        "deir-ez-zor",
      ],
      [
        "Tartous",
        "tartus",
      ],
      [
        "Ar-Raqqa",
        "raqqa",
      ],
      [
        "Dar'a",
        "daraa",
      ],
      [
        "As-Sweida",
        "as-suwayda",
      ],
      [
        "Quneitra",
        "quneitra",
      ],
    ]);
  
  async function readJsonFile(
    filePath,
    description,
  ) {
    let fileContent;
  
    try {
      fileContent =
        await readFile(
          filePath,
          "utf8",
        );
    } catch (error) {
      throw new Error(
        `${description} could not be read: ${error.message}`,
      );
    }
  
    try {
      return JSON.parse(
        fileContent,
      );
    } catch {
      throw new Error(
        `${description} does not contain valid JSON.`,
      );
    }
  }
  
  function validateMetadata(
    metadata,
  ) {
    if (
      !metadata ||
      typeof metadata !== "object"
    ) {
      throw new Error(
        "The boundary metadata is invalid.",
      );
    }
  
    if (
      metadata.boundaryISO !==
      "SYR"
    ) {
      throw new Error(
        `Expected metadata for SYR, but received ${metadata.boundaryISO}.`,
      );
    }
  
    if (
      metadata.boundaryType !==
      "ADM1"
    ) {
      throw new Error(
        `Expected ADM1 metadata, but received ${metadata.boundaryType}.`,
      );
    }
  }
  
  function validateGeoJson(
    geoJson,
  ) {
    if (
      !geoJson ||
      geoJson.type !==
        "FeatureCollection"
    ) {
      throw new Error(
        "The boundary file is not a GeoJSON FeatureCollection.",
      );
    }
  
    if (
      !Array.isArray(
        geoJson.features,
      )
    ) {
      throw new Error(
        "The GeoJSON file does not contain a features array.",
      );
    }
  
    if (
      geoJson.features.length !==
      14
    ) {
      throw new Error(
        `Expected 14 governorate features, but found ${geoJson.features.length}.`,
      );
    }
  
    const detectedNames =
      new Set();
  
    const detectedSlugs =
      new Set();
  
    for (
      const feature of
      geoJson.features
    ) {
      const sourceName =
        feature?.properties
          ?.shapeName;
  
      if (
        typeof sourceName !==
          "string" ||
        !sourceName.trim()
      ) {
        throw new Error(
          "A GeoJSON feature does not contain a valid shapeName.",
        );
      }
  
      if (
        detectedNames.has(
          sourceName,
        )
      ) {
        throw new Error(
          `Duplicate GeoJSON governorate name: ${sourceName}`,
        );
      }
  
      detectedNames.add(
        sourceName,
      );
  
      const databaseSlug =
        sourceNameToDatabaseSlug.get(
          sourceName,
        );
  
      if (!databaseSlug) {
        throw new Error(
          `No database mapping exists for GeoJSON governorate: ${sourceName}`,
        );
      }
  
      if (
        detectedSlugs.has(
          databaseSlug,
        )
      ) {
        throw new Error(
          `Multiple GeoJSON features map to the database slug: ${databaseSlug}`,
        );
      }
  
      detectedSlugs.add(
        databaseSlug,
      );
  
      if (
        !feature.geometry ||
        ![
          "Polygon",
          "MultiPolygon",
        ].includes(
          feature.geometry.type,
        )
      ) {
        throw new Error(
          `${sourceName} does not contain a Polygon or MultiPolygon geometry.`,
        );
      }
    }
  
    if (
      detectedSlugs.size !==
      14
    ) {
      throw new Error(
        `Expected 14 unique database mappings, but found ${detectedSlugs.size}.`,
      );
    }
  }
  
  async function verifyDatabaseGovernorates(
    client,
  ) {
    const result =
      await client.query(`
        SELECT
          id,
          name,
          slug
        FROM governorates
        WHERE is_active = TRUE
        ORDER BY id;
      `);
  
    if (
      result.rows.length !==
      14
    ) {
      throw new Error(
        `Expected 14 active governorates in PostgreSQL, but found ${result.rows.length}.`,
      );
    }
  
    const databaseSlugs =
      new Set(
        result.rows.map(
          (row) => row.slug,
        ),
      );
  
    for (
      const databaseSlug of
      sourceNameToDatabaseSlug.values()
    ) {
      if (
        !databaseSlugs.has(
          databaseSlug,
        )
      ) {
        throw new Error(
          `The mapped governorate slug does not exist in PostgreSQL: ${databaseSlug}`,
        );
      }
    }
  
    return result.rows;
  }
  
  async function importGovernorateBoundary(
    client,
    feature,
  ) {
    const sourceName =
      feature.properties.shapeName;
  
    const databaseSlug =
      sourceNameToDatabaseSlug.get(
        sourceName,
      );
  
    const geometryJson =
      JSON.stringify(
        feature.geometry,
      );
  
    const result =
      await client.query(
        `
          WITH parsed_geometry AS (
            SELECT
              ST_SetSRID(
                ST_Force2D(
                  ST_GeomFromGeoJSON(
                    $2::TEXT
                  )
                ),
                4326
              ) AS geometry
          ),
  
          repaired_geometry AS (
            SELECT
              ST_MakeValid(
                geometry
              ) AS geometry
            FROM parsed_geometry
          ),
  
          polygonal_geometry AS (
            SELECT
              ST_CollectionExtract(
                geometry,
                3
              ) AS geometry
            FROM repaired_geometry
          ),
  
          normalized_geometry AS (
            SELECT
              ST_Multi(
                ST_CollectionExtract(
                  ST_MakeValid(
                    geometry
                  ),
                  3
                )
              )::geometry(
                MultiPolygon,
                4326
              ) AS geometry
            FROM polygonal_geometry
          )
  
          UPDATE governorates
            AS governorate
  
          SET
            boundary =
              normalized_geometry.geometry,
  
            updated_at =
              NOW()
  
          FROM normalized_geometry
  
          WHERE
            governorate.slug = $1
  
            AND
            normalized_geometry.geometry
              IS NOT NULL
  
            AND NOT ST_IsEmpty(
              normalized_geometry.geometry
            )
  
            AND ST_IsValid(
              normalized_geometry.geometry
            )
  
          RETURNING
            governorate.id,
            governorate.name,
            governorate.slug,
  
            GeometryType(
              governorate.boundary
            ) AS geometry_type,
  
            ST_SRID(
              governorate.boundary
            ) AS srid,
  
            ST_IsValid(
              governorate.boundary
            ) AS is_valid,
  
            ST_NPoints(
              governorate.boundary
            ) AS point_count;
        `,
        [
          databaseSlug,
          geometryJson,
        ],
      );
  
    if (
      result.rowCount !== 1
    ) {
      throw new Error(
        `Boundary import failed for ${sourceName} → ${databaseSlug}.`,
      );
    }
  
    return {
      sourceName,
      ...result.rows[0],
    };
  }
  
  async function verifyImportedBoundaries(
    client,
  ) {
    const result =
      await client.query(`
        SELECT
          COUNT(*)::INTEGER
            AS total_governorates,
  
          COUNT(boundary)::INTEGER
            AS governorates_with_boundary,
  
          COUNT(*) FILTER (
            WHERE
              boundary IS NULL
          )::INTEGER
            AS missing_boundaries,
  
          COUNT(*) FILTER (
            WHERE
              boundary IS NOT NULL
              AND NOT ST_IsValid(
                boundary
              )
          )::INTEGER
            AS invalid_boundaries,
  
          COUNT(*) FILTER (
            WHERE
              boundary IS NOT NULL
              AND ST_SRID(
                boundary
              ) <> 4326
          )::INTEGER
            AS incorrect_srid,
  
          COUNT(*) FILTER (
            WHERE
              boundary IS NOT NULL
              AND GeometryType(
                boundary
              ) <> 'MULTIPOLYGON'
          )::INTEGER
            AS incorrect_geometry_type
  
        FROM governorates
        WHERE is_active = TRUE;
      `);
  
    const verification =
      result.rows[0];
  
    if (
      verification.total_governorates !==
        14 ||
      verification.governorates_with_boundary !==
        14 ||
      verification.missing_boundaries !==
        0 ||
      verification.invalid_boundaries !==
        0 ||
      verification.incorrect_srid !==
        0 ||
      verification.incorrect_geometry_type !==
        0
    ) {
      throw new Error(
        `Boundary verification failed: ${JSON.stringify(
          verification,
        )}`,
      );
    }
  
    return verification;
  }
  
  async function importSyriaGovernorateBoundaries() {
    console.log("");
    console.log(
      "Reading local Syria governorate boundary files...",
    );
  
    const [
      metadata,
      geoJson,
    ] = await Promise.all([
      readJsonFile(
        metadataFilePath,
        "Boundary metadata file",
      ),
  
      readJsonFile(
        geoJsonFilePath,
        "Syria ADM1 GeoJSON file",
      ),
    ]);
  
    validateMetadata(
      metadata,
    );
  
    validateGeoJson(
      geoJson,
    );
  
    console.log(
      `Boundary source: ${metadata.boundaryID}`,
    );
  
    console.log(
      `License: ${metadata.boundaryLicense}`,
    );
  
    console.log(
      `Features validated: ${geoJson.features.length}`,
    );
  
    const client =
      await pool.connect();
  
    try {
      await client.query(
        "BEGIN",
      );
  
      await verifyDatabaseGovernorates(
        client,
      );
  
      console.log("");
      console.log(
        "Importing governorate boundaries into PostGIS...",
      );
  
      for (
        const feature of
        geoJson.features
      ) {
        const importedBoundary =
          await importGovernorateBoundary(
            client,
            feature,
          );
  
        console.log(
          [
            "Imported:",
            importedBoundary.sourceName,
            "→",
            importedBoundary.name,
            `(${importedBoundary.slug})`,
            `type=${importedBoundary.geometry_type}`,
            `srid=${importedBoundary.srid}`,
            `valid=${importedBoundary.is_valid}`,
            `points=${importedBoundary.point_count}`,
          ].join(" "),
        );
      }
  
      const verification =
        await verifyImportedBoundaries(
          client,
        );
  
      await client.query(
        "COMMIT",
      );
  
      console.log("");
      console.log(
        "Governorate boundary import completed successfully.",
      );
  
      console.log(
        `Total governorates: ${verification.total_governorates}`,
      );
  
      console.log(
        `Governorates with boundary: ${verification.governorates_with_boundary}`,
      );
  
      console.log(
        `Missing boundaries: ${verification.missing_boundaries}`,
      );
  
      console.log(
        `Invalid boundaries: ${verification.invalid_boundaries}`,
      );
  
      console.log(
        `Incorrect SRID: ${verification.incorrect_srid}`,
      );
  
      console.log(
        `Incorrect geometry type: ${verification.incorrect_geometry_type}`,
      );
  
      console.log("");
    } catch (error) {
      await client.query(
        "ROLLBACK",
      );
  
      throw error;
    } finally {
      client.release();
    }
  }
  
  importSyriaGovernorateBoundaries()
    .catch((error) => {
      console.error("");
      console.error(
        "Governorate boundary import failed:",
      );
  
      console.error(
        error.message,
      );
  
      console.error("");
  
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });