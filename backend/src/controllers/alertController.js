import {
    alertIdParameterSchema,
    alertListQuerySchema,
  } from "../validators/emergencyAlertSchemas.js";
  
  import {
    acknowledgeAlert,
    getAlerts,
  } from "../services/emergencyAlertService.js";
  
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
  
  export async function listOperationalAlerts(
    req,
    res,
    next,
  ) {
    try {
      const validationResult =
        alertListQuerySchema
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
              "The alert query parameters are invalid.",
  
            errors:
              mapValidationErrors(
                validationResult.error,
              ),
          });
      }
  
      const alerts =
        await getAlerts(
          validationResult.data,
        );
  
      res.setHeader(
        "Cache-Control",
        "no-store",
      );
  
      return res
        .status(200)
        .json({
          success: true,
  
          data: {
            count:
              alerts.length,
  
            alerts,
          },
        });
    } catch (error) {
      return next(error);
    }
  }
  
  export async function acknowledgeOperationalAlert(
    req,
    res,
    next,
  ) {
    try {
      const validationResult =
        alertIdParameterSchema
          .safeParse(
            req.params,
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
              "The alert identifier is invalid.",
  
            errors:
              mapValidationErrors(
                validationResult.error,
              ),
          });
      }
  
      const result =
        await acknowledgeAlert(
          validationResult
            .data
            .alertId,
  
          req.user,
        );
  
      return res
        .status(200)
        .json({
          success: true,
  
          message:
            result.changed
              ? "The alert was acknowledged successfully."
              : "The alert had already been processed.",
  
          data:
            result,
        });
    } catch (error) {
      return next(error);
    }
  }