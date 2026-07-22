import {
    pool,
  } from "../config/databasePool.js";
  
  import {
    listGovernorateBoundaryFeatures,
  } from "../repositories/governorateBoundaryRepository.js";
  
  import {
    HttpError,
  } from "../utils/httpError.js";
  
  /*
   * Metadata describing the boundary dataset imported
   * into PostgreSQL in the previous stage.
   */
  const boundarySource = {
    provider: "geoBoundaries",
  
    countryCode: "SYR",
  
    administrativeLevel: "ADM1",
  
    boundaryId:
      "SYR-ADM1-8384693",
  
    representedYear: "2017",
  
    license:
      "CC BY 3.0 IGO",
  
    attribution:
      "Governorate boundaries provided by geoBoundaries.",
  };
  
  export async function getGovernorateBoundaryFeatureCollection({
    governorateId = null,
  } = {}) {
    const client =
      await pool.connect();
  
    try {
      const features =
        await listGovernorateBoundaryFeatures(
          client,
          governorateId,
        );
  
      /*
       * When the client explicitly requests one governorate,
       * returning an empty FeatureCollection would hide the fact
       * that the requested record does not exist.
       */
      if (
        governorateId !== null &&
        features.length === 0
      ) {
        throw new HttpError(
          404,
          "GOVERNORATE_BOUNDARY_NOT_FOUND",
          "The requested governorate boundary was not found.",
        );
      }
  
      /*
       * Without a filter, all 14 imported Syrian governorates
       * must be present.
       */
      if (
        governorateId === null &&
        features.length !== 14
      ) {
        throw new HttpError(
          500,
          "INCOMPLETE_GOVERNORATE_BOUNDARIES",
          "The governorate boundary dataset is incomplete.",
          {
            expectedFeatures: 14,
            actualFeatures:
              features.length,
          },
        );
      }
  
      return {
        type: "FeatureCollection",
  
        features,
  
        metadata: {
          generatedAt:
            new Date().toISOString(),
  
          featureCount:
            features.length,
  
          filteredGovernorateId:
            governorateId === null
              ? null
              : String(
                  governorateId,
                ),
  
          source:
            boundarySource,
        },
      };
    } finally {
      client.release();
    }
  }