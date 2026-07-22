import {
    liveOperationsRecoveryBodySchema,
  } from "../validators/recoverySchemas.js";
  
  import {
    recoverLiveOperationsReadings,
  } from "../services/recoveryService.js";
  
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
  
  export async function recoverLiveOperations(
    req,
    res,
    next,
  ) {
    try {
      const validationResult =
        liveOperationsRecoveryBodySchema
          .safeParse(
            req.body ?? {},
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
              "The live operations recovery request is invalid.",
  
            errors:
              mapValidationErrors(
                validationResult.error,
              ),
          });
      }
  
      const result =
        await recoverLiveOperationsReadings(
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
  
          message:
            "Missed live readings were recovered successfully.",
  
          data:
            result,
        });
    } catch (error) {
      return next(error);
    }
  }