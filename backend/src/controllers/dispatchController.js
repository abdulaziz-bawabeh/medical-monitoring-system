import {
    activeDispatchListQuerySchema,
    confirmRecommendationBodySchema,
    emergencyRecommendationParameterSchema,
    generateRecommendationBodySchema,
    recommendationParameterSchema,
    rejectRecommendationBodySchema,
    dispatchParameterSchema,
dispatchTransitionBodySchema,
  } from "../validators/dispatchSchemas.js";
  
  import {
    confirmDispatchRecommendation,
    generateDispatchRecommendation,
    getActiveDispatches,
    getLatestDispatchRecommendation,
    rejectDispatchRecommendation,
    transitionAmbulanceDispatch,
  } from "../services/dispatchService.js";
  
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
  
  export async function createRecommendation(
    req,
    res,
    next,
  ) {
    try {
      const parameterValidation =
        emergencyRecommendationParameterSchema
          .safeParse(
            req.params,
          );
  
      if (
        !parameterValidation.success
      ) {
        return validationErrorResponse(
          res,
          "The emergency identifier is invalid.",
          parameterValidation.error,
        );
      }

      console.log(
        "Recommendation request body:",
        req.body,
      );
      
      console.log(
        "Recommendation content type:",
        req.headers[
          "content-type"
        ],
      );
  
      const bodyValidation =
        generateRecommendationBodySchema
          .safeParse(
            req.body,
          );
  
          if (!bodyValidation.success) {
            console.error(
              "Recommendation validation issues:",
              bodyValidation
                .error
                .issues,
            );
          
            return validationErrorResponse(
              res,
              "The recommendation request is invalid.",
              bodyValidation.error,
            );
          }
  
      const result =
        await generateDispatchRecommendation(
          {
            emergencyId:
              parameterValidation
                .data
                .emergencyId,
  
            eventId:
              bodyValidation
                .data
                .eventId,
          },
  
          req.user,
        );
  
      return res
        .status(
          result.duplicate ||
          result.reused
            ? 200
            : 201,
        )
        .json({
          success: true,
  
          message:
            result.duplicate
              ? "The recommendation event was already processed."
              : result.reused
                ? "An active recommendation already exists for the emergency."
                : "The nearest eligible ambulance was recommended successfully.",
  
          data:
            result,
        });
    } catch (error) {
      return next(error);
    }
  }
  
  export async function getRecommendation(
    req,
    res,
    next,
  ) {
    try {
      const validationResult =
        emergencyRecommendationParameterSchema
          .safeParse(
            req.params,
          );
  
      if (
        !validationResult.success
      ) {
        return validationErrorResponse(
          res,
          "The emergency identifier is invalid.",
          validationResult.error,
        );
      }
  
      const recommendation =
        await getLatestDispatchRecommendation(
          validationResult
            .data
            .emergencyId,
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
            recommendation,
          },
        });
    } catch (error) {
      return next(error);
    }
  }
  
  export async function confirmRecommendation(
    req,
    res,
    next,
  ) {
    try {
      const parameterValidation =
        recommendationParameterSchema
          .safeParse(
            req.params,
          );
  
      if (
        !parameterValidation.success
      ) {
        return validationErrorResponse(
          res,
          "The recommendation identifier is invalid.",
          parameterValidation.error,
        );
      }
  
      const bodyValidation =
        confirmRecommendationBodySchema
          .safeParse(
            req.body,
          );
  
      if (!bodyValidation.success) {
        return validationErrorResponse(
          res,
          "The recommendation confirmation data is invalid.",
          bodyValidation.error,
        );
      }
  
      const result =
        await confirmDispatchRecommendation(
          {
            recommendationId:
              parameterValidation
                .data
                .recommendationId,
  
            dispatchEventId:
              bodyValidation
                .data
                .eventId,
          },
  
          req.user,
        );
  
      return res
        .status(200)
        .json({
          success: true,
  
          message:
            result.duplicate
              ? "The recommendation had already been confirmed."
              : "The ambulance dispatch was created successfully.",
  
          data:
            result,
        });
    } catch (error) {
      return next(error);
    }
  }
  
  export async function rejectRecommendation(
    req,
    res,
    next,
  ) {
    try {
      const parameterValidation =
        recommendationParameterSchema
          .safeParse(
            req.params,
          );
  
      if (
        !parameterValidation.success
      ) {
        return validationErrorResponse(
          res,
          "The recommendation identifier is invalid.",
          parameterValidation.error,
        );
      }
  
      const bodyValidation =
        rejectRecommendationBodySchema
          .safeParse(
            req.body,
          );
  
      if (!bodyValidation.success) {
        return validationErrorResponse(
          res,
          "The recommendation rejection data is invalid.",
          bodyValidation.error,
        );
      }
  
      const result =
        await rejectDispatchRecommendation(
          {
            recommendationId:
              parameterValidation
                .data
                .recommendationId,
  
            reason:
              bodyValidation
                .data
                .reason,
          },
  
          req.user,
        );
  
      return res
        .status(200)
        .json({
          success: true,
  
          message:
            result.duplicate
              ? "The recommendation had already been rejected."
              : "The recommendation was rejected successfully.",
  
          data:
            result,
        });
    } catch (error) {
      return next(error);
    }
  }
  
  export async function listActiveOperationalDispatches(
    req,
    res,
    next,
  ) {
    try {
      const validationResult =
        activeDispatchListQuerySchema
          .safeParse(
            req.query,
          );
  
      if (
        !validationResult.success
      ) {
        return validationErrorResponse(
          res,
          "The active dispatch query parameters are invalid.",
          validationResult.error,
        );
      }
  
      const dispatches =
        await getActiveDispatches(
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
              dispatches.length,
  
            dispatches,
          },
        });
    } catch (error) {
      return next(error);
    }
  }
  async function applyDispatchTransition(
    req,
    res,
    next,
    targetStatus,
  ) {
    try {
      const parameterValidation =
        dispatchParameterSchema
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
  
      const bodyValidation =
        dispatchTransitionBodySchema
          .safeParse(
            req.body,
          );
  
      if (!bodyValidation.success) {
        return validationErrorResponse(
          res,
          "The dispatch transition data is invalid.",
          bodyValidation.error,
        );
      }
  
      const result =
        await transitionAmbulanceDispatch(
          {
            dispatchId:
              parameterValidation
                .data
                .dispatchId,
  
            eventId:
              bodyValidation
                .data
                .eventId,
  
            targetStatus,
          },
  
          req.user,
        );
  
      const messages = {
        EN_ROUTE:
          "The ambulance dispatch started successfully.",
  
        ARRIVED:
          "The ambulance arrived at the emergency successfully.",
  
        COMPLETED:
          "The ambulance dispatch was completed successfully.",
      };
  
      return res
        .status(200)
        .json({
          success: true,
  
          message:
            result.duplicate
              ? "The dispatch transition had already been applied."
              : messages[
                  targetStatus
                ],
  
          data:
            result,
        });
    } catch (error) {
      return next(error);
    }
  }
  
  export async function startDispatch(
    req,
    res,
    next,
  ) {
    return applyDispatchTransition(
      req,
      res,
      next,
      "EN_ROUTE",
    );
  }
  
  export async function arriveDispatch(
    req,
    res,
    next,
  ) {
    return applyDispatchTransition(
      req,
      res,
      next,
      "ARRIVED",
    );
  }
  
  export async function completeDispatch(
    req,
    res,
    next,
  ) {
    return applyDispatchTransition(
      req,
      res,
      next,
      "COMPLETED",
    );
  }