import {
    dashboardSnapshotQuerySchema,
  } from "../validators/liveMonitoringSchemas.js";
  
  import {
    getDashboardSnapshot,
  } from "../services/dashboardService.js";
  
  export async function dashboardSnapshot(
    req,
    res,
    next,
  ) {
    try {
      const validationResult =
        dashboardSnapshotQuerySchema
          .safeParse(req.query);
  
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          code:
            "VALIDATION_ERROR",
          message:
            "The Dashboard query parameters are invalid.",
          errors:
            validationResult
              .error
              .issues
              .map(
                (issue) => ({
                  field:
                    issue.path.join("."),
                  message:
                    issue.message,
                }),
              ),
        });
      }
  
      const snapshot =
        await getDashboardSnapshot(
          validationResult.data,
        );
  
      res.setHeader(
        "Cache-Control",
        "no-store",
      );
  
      return res.status(200).json({
        success: true,
        data: snapshot,
      });
    } catch (error) {
      return next(error);
    }
  }