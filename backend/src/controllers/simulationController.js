import {
    resetSimulationBodySchema,
    startSimulationBodySchema,
    stopSimulationBodySchema,
  } from "../validators/simulationSchemas.js";
  import {
    getSimulationStatus,
    startSimulation,
    stopSimulation,
  } from "../services/simulationService.js";
  
  import {
    HttpError,
  } from "../utils/httpError.js";

  import {
    resetSimulationOperations,
  } from "../services/simulationResetService.js";
  function getAuthenticatedUserId(
    req,
  ) {
    /*
     * The authentication middleware may expose the authenticated
     * user through authenticatedUser. The remaining alternatives
     * preserve compatibility with other middleware shapes.
     */
    const userId =
      req.authenticatedUser
        ?.id ??
      req.user
        ?.id ??
      req.auth
        ?.userId ??
      req.auth
        ?.id ??
      req.auth
        ?.user
        ?.id ??
      null;
  
    if (!userId) {
      throw new HttpError(
        401,
        "SIMULATION_USER_NOT_AVAILABLE",
        "The authenticated simulation starter could not be determined.",
      );
    }
  
    return String(
      userId,
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
          error.issues.map(
            (issue) => ({
              field:
                issue.path.join(
                  ".",
                ),
  
              message:
                issue.message,
            }),
          ),
      });
  }
  
  export async function readSimulationStatus(
    req,
    res,
    next,
  ) {
    try {
      const result =
        await getSimulationStatus();
  
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
  
  export async function startSimulationRuntime(
    req,
    res,
    next,
  ) {
    try {
      const validationResult =
        startSimulationBodySchema
          .safeParse(
            req.body ??
            {},
          );
  
      if (
        !validationResult.success
      ) {
        return sendValidationError(
          res,
          "The simulation settings are invalid.",
          validationResult.error,
        );
      }
  
      const result =
        await startSimulation({
          userId:
            getAuthenticatedUserId(
              req,
            ),
  
          settings:
            validationResult.data,
        });
  
      return res
        .status(200)
        .json({
          success:
            true,
  
          message:
            "The simulation was started.",
  
          data:
            result,
        });
    } catch (error) {
      return next(error);
    }
  }
  
  export async function stopSimulationRuntime(
    req,
    res,
    next,
  ) {
    try {
      const validationResult =
        stopSimulationBodySchema
          .safeParse(
            req.body ??
            {},
          );
  
      if (
        !validationResult.success
      ) {
        return sendValidationError(
          res,
          "The simulation stop request is invalid.",
          validationResult.error,
        );
      }
  
      const result =
        await stopSimulation({
          userId:
            getAuthenticatedUserId(
              req,
            ),
  
          reason:
            validationResult
              .data
              .reason ??
            null,
        });
  
      return res
        .status(200)
        .json({
          success:
            true,
  
          message:
            "The simulation was stopped.",
  
          data:
            result,
        });
    } catch (error) {
      return next(error);
    }
  }

  export async function resetSimulationRuntime(
    req,
    res,
    next,
  ) {
    try {
      const validationResult =
        resetSimulationBodySchema
          .safeParse(
            req.body ?? {},
          );
  
      if (
        !validationResult.success
      ) {
        return sendValidationError(
          res,
          "The simulation reset request is invalid.",
          validationResult.error,
        );
      }
  
      const result =
        await resetSimulationOperations({
          userId:
            getAuthenticatedUserId(
              req,
            ),
        });
  
      return res
        .status(200)
        .json({
          success: true,
  
          message:
            "The simulation operational data was reset successfully.",
  
          data:
            result,
        });
    } catch (error) {
      return next(error);
    }
  }