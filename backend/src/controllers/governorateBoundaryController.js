import {
    dashboardSnapshotQuerySchema,
  } from "../validators/liveMonitoringSchemas.js";
  
  import {
    getGovernorateBoundaryFeatureCollection,
  } from "../services/governorateBoundaryService.js";
  
  function mapValidationErrors(
    zodError,
  ) {
    return zodError.issues.map(
      (issue) => ({
        field:
          issue.path.join("."),
  
        message:
          issue.message,
      }),
    );
  }
  
  export async function getGovernorateBoundaries(
    req,
    res,
    next,
  ) {
    try {
      /*
       * We reuse the existing Dashboard query schema because
       * it already validates the optional governorateId.
       */
      const validationResult =
        dashboardSnapshotQuerySchema
          .safeParse(
            req.query,
          );
  
      if (
        !validationResult.success
      ) {
        return res
          .status(400)
          .json({
            success: false,
  
            code:
              "VALIDATION_ERROR",
  
            message:
              "The governorate boundary query parameters are invalid.",
  
            errors:
              mapValidationErrors(
                validationResult.error,
              ),
          });
      }
  
      const featureCollection =
        await getGovernorateBoundaryFeatureCollection(
          validationResult.data,
        );
  
      /*
       * Boundaries rarely change, but no-store keeps local
       * development and testing easy during this stage.
       *
       * We can introduce ETag and private caching later.
       */
      res.setHeader(
        "Cache-Control",
        "no-store",
      );
  
      return res
        .status(200)
        .json({
          success: true,
  
          data:
            featureCollection,
        });
    } catch (error) {
      return next(error);
    }
  }