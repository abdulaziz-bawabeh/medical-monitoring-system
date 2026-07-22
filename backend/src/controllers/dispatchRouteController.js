import {
    dispatchRouteParameterSchema,
    dispatchRoutePointBodySchema,
    dispatchRouteQuerySchema,
  } from "../validators/dispatchRouteSchemas.js";
  
  import {
    getDispatchRoute,
    recordDispatchRoutePoint,
  } from "../services/dispatchRouteService.js";
  
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
  
  function validationErrorResponse(
    res,
    message,
    zodError,
  ) {
    return res
      .status(400)
      .json({
        success: false,
  
        code:
          "VALIDATION_ERROR",
  
        message,
  
        errors:
          mapValidationErrors(
            zodError,
          ),
      });
  }
  
  export async function createDispatchRoutePoint(
    req,
    res,
    next,
  ) {
    try {
      const validationResult =
        dispatchRoutePointBodySchema
          .safeParse(
            req.body,
          );
  
      if (
        !validationResult.success
      ) {
        return validationErrorResponse(
          res,
          "The dispatch route point is invalid.",
          validationResult.error,
        );
      }
  
      const result =
        await recordDispatchRoutePoint(
          validationResult.data,
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
              ? "The route point had already been processed."
              : "The dispatch route point was recorded successfully.",
  
          data:
            result,
        });
    } catch (error) {
      return next(error);
    }
  }
  
  export async function readDispatchRoute(
    req,
    res,
    next,
  ) {
    try {
      const parameterValidation =
        dispatchRouteParameterSchema
          .safeParse(
            req.params,
          );
  
      if (
        !parameterValidation.success
      ) {
        return validationErrorResponse(
          res,
          "The dispatch identifier is invalid.",
          parameterValidation.error,
        );
      }
  
      const queryValidation =
        dispatchRouteQuerySchema
          .safeParse(
            req.query,
          );
  
      if (
        !queryValidation.success
      ) {
        return validationErrorResponse(
          res,
          "The dispatch route query is invalid.",
          queryValidation.error,
        );
      }
  
      const result =
        await getDispatchRoute({
          dispatchId:
            parameterValidation
              .data
              .dispatchId,
  
          afterSequence:
            queryValidation
              .data
              .afterSequence,
  
          limit:
            queryValidation
              .data
              .limit,
        });
  
      res.setHeader(
        "Cache-Control",
        "no-store",
      );
  
      return res
        .status(200)
        .json({
          success: true,
  
          data:
            result,
        });
    } catch (error) {
      return next(error);
    }
  }