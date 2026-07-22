import {
    historySnapshotQuerySchema,
  } from "../validators/historySchemas.js";
  
  import {
    getHistorySnapshot,
  } from "../services/historySnapshotService.js";
  
  export async function readHistorySnapshot(
    req,
    res,
    next,
  ) {
    try {
      const validationResult =
        historySnapshotQuerySchema
          .safeParse(
            req.query,
          );
  
      if (
        !validationResult.success
      ) {
        return res
          .status(400)
          .json({
            success:
              false,
  
            code:
              "VALIDATION_ERROR",
  
            message:
              "The historical snapshot query is invalid.",
  
            errors:
              validationResult
                .error
                .issues
                .map(
                  (issue) => ({
                    field:
                      issue.path
                        .join("."),
  
                    message:
                      issue.message,
                  }),
                ),
          });
      }
  
      const result =
        await getHistorySnapshot(
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