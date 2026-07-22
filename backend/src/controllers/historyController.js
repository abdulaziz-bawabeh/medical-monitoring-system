import {
    facilityOccupancyHistoryQuerySchema,
    historyOverviewQuerySchema,
  } from "../validators/historySchemas.js";
  
  import {
    getFacilityOccupancyHistory,
    getHistoryOverview,
  } from "../services/historyService.js";
  
  function mapValidationErrors(
    error,
  ) {
    return error.issues.map(
      (issue) => ({
        field:
          issue.path.join("."),
  
        message:
          issue.message,
      }),
    );
  }
  
  function sendValidationError(
    res,
    message,
    error,
  ) {
    return res
      .status(400)
      .json({
        success:
          false,
  
        code:
          "VALIDATION_ERROR",
  
        message,
  
        errors:
          mapValidationErrors(
            error,
          ),
      });
  }
  
  export async function readHistoryOverview(
    req,
    res,
    next,
  ) {
    try {
      const validationResult =
        historyOverviewQuerySchema
          .safeParse(
            req.query,
          );
  
      if (
        !validationResult.success
      ) {
        return sendValidationError(
          res,
          "The history overview query is invalid.",
          validationResult.error,
        );
      }
  
      const result =
        await getHistoryOverview(
          validationResult.data,
        );
  
      res.setHeader(
        "Cache-Control",
        "no-store",
      );
  
      return res
        .status(200)
        .json({
          success:
            true,
  
          data:
            result,
        });
    } catch (error) {
      return next(error);
    }
  }
  
  export async function readFacilityOccupancyHistory(
    req,
    res,
    next,
  ) {
    try {
      const validationResult =
        facilityOccupancyHistoryQuerySchema
          .safeParse(
            req.query,
          );
  
      if (
        !validationResult.success
      ) {
        return sendValidationError(
          res,
          "The facility occupancy history query is invalid.",
          validationResult.error,
        );
      }
  
      const result =
        await getFacilityOccupancyHistory(
          validationResult.data,
        );
  
      res.setHeader(
        "Cache-Control",
        "no-store",
      );
  
      return res
        .status(200)
        .json({
          success:
            true,
  
          data:
            result,
        });
    } catch (error) {
      return next(error);
    }
  }