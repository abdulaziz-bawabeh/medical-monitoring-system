import {
    mkdir,
    writeFile,
  } from "node:fs/promises";
  
  import {
    fileURLToPath,
  } from "node:url";
  
  /*
   * geoBoundaries API endpoint for:
   *
   * Country: Syria
   * ISO code: SYR
   * Release: gbOpen
   * Administrative level: ADM1
   */
  const GEOBoundariesMetadataUrl =
    "https://www.geoboundaries.org/api/current/gbOpen/SYR/ADM1/";
  
  /*
   * The output directory resolves to:
   *
   * backend/data/geoboundaries/
   */
  const outputDirectory =
    fileURLToPath(
      new URL(
        "../../data/geoboundaries/",
        import.meta.url,
      ),
    );
  
  const metadataOutputPath =
    fileURLToPath(
      new URL(
        "../../data/geoboundaries/syria-adm1-metadata.json",
        import.meta.url,
      ),
    );
  
  const geoJsonOutputPath =
    fileURLToPath(
      new URL(
        "../../data/geoboundaries/syria-adm1-simplified.geojson",
        import.meta.url,
      ),
    );
  
  async function fetchJson(
    url,
    description,
  ) {
    const response = await fetch(url, {
      headers: {
        Accept:
          "application/json, application/geo+json",
      },
    });
  
    if (!response.ok) {
      throw new Error(
        `${description} download failed with HTTP ${response.status}.`,
      );
    }
  
    try {
      return await response.json();
    } catch {
      throw new Error(
        `${description} did not return valid JSON.`,
      );
    }
  }
  
  function validateMetadata(metadata) {
    if (
      !metadata ||
      typeof metadata !== "object"
    ) {
      throw new Error(
        "geoBoundaries metadata is invalid.",
      );
    }
  
    if (metadata.boundaryISO !== "SYR") {
      throw new Error(
        `Expected boundary ISO SYR, but received ${metadata.boundaryISO}.`,
      );
    }
  
    if (metadata.boundaryType !== "ADM1") {
      throw new Error(
        `Expected ADM1 boundaries, but received ${metadata.boundaryType}.`,
      );
    }
  
    if (
      !metadata.simplifiedGeometryGeoJSON
    ) {
      throw new Error(
        "The metadata does not contain a simplified GeoJSON URL.",
      );
    }
  }
  
  function validateFeatureCollection(
    geoJson,
  ) {
    if (
      !geoJson ||
      geoJson.type !==
        "FeatureCollection"
    ) {
      throw new Error(
        "The downloaded document is not a GeoJSON FeatureCollection.",
      );
    }
  
    if (!Array.isArray(geoJson.features)) {
      throw new Error(
        "The GeoJSON document does not contain a features array.",
      );
    }
  
    if (geoJson.features.length !== 14) {
      throw new Error(
        `Expected 14 Syrian governorates, but received ${geoJson.features.length}.`,
      );
    }
  
    for (
      let index = 0;
      index <
      geoJson.features.length;
      index += 1
    ) {
      const feature =
        geoJson.features[index];
  
      if (feature?.type !== "Feature") {
        throw new Error(
          `GeoJSON item ${index + 1} is not a Feature.`,
        );
      }
  
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
          `Governorate feature ${
            index + 1
          } does not contain a Polygon or MultiPolygon geometry.`,
        );
      }
    }
  }
  
  function detectFeatureName(
    properties,
  ) {
    const possibleNameFields = [
      "shapeName",
      "name",
      "NAME_1",
      "ADM1_EN",
      "admin1Name",
    ];
  
    for (
      const fieldName of
      possibleNameFields
    ) {
      const value =
        properties?.[fieldName];
  
      if (
        typeof value === "string" &&
        value.trim()
      ) {
        return value.trim();
      }
    }
  
    return "Name field not detected";
  }
  
  function printFeatureInformation(
    geoJson,
  ) {
    console.log("");
    console.log(
      "Governorate features found:",
    );
    console.log(
      "----------------------------",
    );
  
    geoJson.features.forEach(
      (feature, index) => {
        const properties =
          feature.properties ?? {};
  
        const detectedName =
          detectFeatureName(
            properties,
          );
  
        console.log("");
        console.log(
          `${index + 1}. ${detectedName}`,
        );
  
        console.log(
          `   Geometry: ${feature.geometry.type}`,
        );
  
        console.log(
          `   Property keys: ${Object.keys(
            properties,
          ).join(", ")}`,
        );
  
        console.log(
          `   Properties: ${JSON.stringify(
            properties,
          )}`,
        );
      },
    );
  
    console.log("");
  }
  
  async function downloadBoundaries() {
    console.log("");
    console.log(
      "Downloading Syria ADM1 boundary metadata...",
    );
  
    const metadata =
      await fetchJson(
        GEOBoundariesMetadataUrl,
        "geoBoundaries metadata",
      );
  
    validateMetadata(metadata);
  
    console.log(
      `Boundary ID: ${metadata.boundaryID}`,
    );
  
    console.log(
      `Boundary type: ${metadata.boundaryType}`,
    );
  
    console.log(
      `Administrative units: ${metadata.admUnitCount}`,
    );
  
    console.log(
      `Represented year: ${metadata.boundaryYearRepresented}`,
    );
  
    console.log(
      `License: ${metadata.boundaryLicense}`,
    );
  
    console.log("");
    console.log(
      "Downloading simplified GeoJSON...",
    );
  
    const geoJson =
      await fetchJson(
        metadata.simplifiedGeometryGeoJSON,
        "Simplified Syria ADM1 GeoJSON",
      );
  
    validateFeatureCollection(
      geoJson,
    );
  
    await mkdir(
      outputDirectory,
      {
        recursive: true,
      },
    );
  
    await writeFile(
      metadataOutputPath,
      JSON.stringify(
        metadata,
        null,
        2,
      ),
      "utf8",
    );
  
    await writeFile(
      geoJsonOutputPath,
      JSON.stringify(
        geoJson,
        null,
        2,
      ),
      "utf8",
    );
  
    console.log("");
    console.log(
      "Files saved successfully:",
    );
  
    console.log(
      `Metadata: ${metadataOutputPath}`,
    );
  
    console.log(
      `GeoJSON: ${geoJsonOutputPath}`,
    );
  
    printFeatureInformation(
      geoJson,
    );
  
    console.log(
      `Feature count: ${geoJson.features.length}`,
    );
  
    console.log("");
    console.log(
      "Boundary download and validation completed successfully.",
    );
  
    console.log("");
  }
  
  downloadBoundaries().catch(
    (error) => {
      console.error("");
      console.error(
        "Boundary download failed:",
      );
  
      console.error(
        error.message,
      );
  
      console.error("");
  
      process.exitCode = 1;
    },
  );