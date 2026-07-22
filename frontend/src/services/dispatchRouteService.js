import {
    ApiError,
    apiRequest,
  } from "./apiClient.js";
  
  import {
    createDispatchRoutePointResponseSchema,
    dispatchRouteResponseSchema,
  } from "../schemas/dispatchRouteSchemas.js";
  
  function validateResponse(
    schema,
    response,
    errorCode,
    errorMessage,
  ) {
    const validationResult =
      schema.safeParse(
        response,
      );
  
    if (!validationResult.success) {
      console.error(
        errorCode,
        validationResult
          .error
          .issues,
      );
  
      throw new ApiError(
        errorMessage,
        {
          code:
            errorCode,
  
          data:
            validationResult
              .error
              .issues,
        },
      );
    }
  
    return validationResult.data;
  }
  
  export async function fetchDispatchRoute({
    dispatchId,
    afterSequence = 0,
    limit = 500,
  }) {
    const query =
      new URLSearchParams({
        afterSequence:
          String(afterSequence),
  
        limit:
          String(limit),
      });
  
    const response =
      await apiRequest(
        `/api/dispatches/${dispatchId}/route?${query.toString()}`,
      );
  
    const validated =
      validateResponse(
        dispatchRouteResponseSchema,
        response,
        "INVALID_DISPATCH_ROUTE_RESPONSE",
        "The server returned an unexpected dispatch route response.",
      );
  
    return validated.data;
  }
  
  export async function createDispatchRoutePointRequest(
    routePointData,
  ) {
    const response =
      await apiRequest(
        "/api/feed/dispatch-route-point",
        {
          method: "POST",
  
          /*
           * apiClient uses json, not body.
           */
          json:
            routePointData,
        },
      );
  
    const validated =
      validateResponse(
        createDispatchRoutePointResponseSchema,
        response,
        "INVALID_ROUTE_POINT_RESPONSE",
        "The server returned an unexpected route point response.",
      );
  
    return validated.data;
  }