import {
    ambulanceLocationHistoryQuerySchema,
    dispatchHistoryQuerySchema,
    dispatchRouteHistoryParameterSchema,
    dispatchRouteHistoryQuerySchema,
    emergencyHistoryQuerySchema,
  } from "../validators/historySchemas.js";
  
  import {
    getAmbulanceLocationHistory,
    getDispatchHistory,
    getDispatchRouteHistory,
    getEmergencyHistory,
  } from "../services/historyOperationsService.js";
  
  function validationErrors(
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
          validationErrors(
            error,
          ),
      });
  }
  
  export async function readAmbulanceLocationHistory(
    req,
    res,
    next,
  ) {
    try {
      const result =
        ambulanceLocationHistoryQuerySchema
          .safeParse(
            req.query,
          );
  
      if (!result.success) {
        return sendValidationError(
          res,
          "The ambulance location history query is invalid.",
          result.error,
        );
      }
  
      const data =
        await getAmbulanceLocationHistory(
          result.data,
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
  
          data,
        });
    } catch (error) {
      return next(error);
    }
  }
  
  export async function readEmergencyHistory(
    req,
    res,
    next,
  ) {
    try {
      const result =
        emergencyHistoryQuerySchema
          .safeParse(
            req.query,
          );
  
      if (!result.success) {
        return sendValidationError(
          res,
          "The emergency history query is invalid.",
          result.error,
        );
      }
  
      const data =
        await getEmergencyHistory(
          result.data,
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
  
          data,
        });
    } catch (error) {
      return next(error);
    }
  }
  
  export async function readDispatchHistory(
    req,
    res,
    next,
  ) {
    try {
      const result =
        dispatchHistoryQuerySchema
          .safeParse(
            req.query,
          );
  
      if (!result.success) {
        return sendValidationError(
          res,
          "The dispatch history query is invalid.",
          result.error,
        );
      }
  
      const data =
        await getDispatchHistory(
          result.data,
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
  
          data,
        });
    } catch (error) {
      return next(error);
    }
  }
  
  export async function readDispatchRouteHistory(
    req,
    res,
    next,
  ) {
    try {
      const parameterResult =
        dispatchRouteHistoryParameterSchema
          .safeParse(
            req.params,
          );
  
      if (
        !parameterResult.success
      ) {
        return sendValidationError(
          res,
          "The dispatch identifier is invalid.",
          parameterResult.error,
        );
      }
  
      const queryResult =
        dispatchRouteHistoryQuerySchema
          .safeParse(
            req.query,
          );
  
      if (
        !queryResult.success
      ) {
        return sendValidationError(
          res,
          "The dispatch route history query is invalid.",
          queryResult.error,
        );
      }
  
      const data =
        await getDispatchRouteHistory(
          parameterResult
            .data
            .dispatchId,
  
          queryResult.data,
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
  
          data,
        });
    } catch (error) {
      return next(error);
    }
  }