import {
    createEmergencyCaseSchema,
    emergencyCaseListQuerySchema,
  } from "../validators/emergencyAlertSchemas.js";
  
  import {
    createEmergencyCase,
    getActiveEmergencyCases,
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
  
  export async function createEmergency(
    req,
    res,
    next,
  ) {
    try {
      const validationResult =
        createEmergencyCaseSchema
          .safeParse(
            req.body,
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
              "The emergency case data is invalid.",
  
            errors:
              mapValidationErrors(
                validationResult.error,
              ),
          });
      }
  
      const result =
        await createEmergencyCase(
          validationResult.data,
          req.user,
        );
  
      return res
        .status(
          result.duplicate
            ? 200
            : 201,
        )
        .json({
          success: true,
  
          message:
            result.duplicate
              ? "The emergency case was already registered."
              : "The emergency case was created successfully.",
  
          data:
            result,
        });
    } catch (error) {
      return next(error);
    }
  }
  
  export async function listOpenEmergencies(
    req,
    res,
    next,
  ) {
    try {
      const validationResult =
        emergencyCaseListQuerySchema
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
              "The emergency query parameters are invalid.",
  
            errors:
              mapValidationErrors(
                validationResult.error,
              ),
          });
      }
  
      const emergencies =
        await getActiveEmergencyCases(
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
              emergencies.length,
  
            emergencies,
          },
        });
    } catch (error) {
      return next(error);
    }
  }