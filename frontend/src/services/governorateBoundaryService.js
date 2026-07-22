import {
    ApiError,
    apiRequest,
  } from "./apiClient.js";
  
  import {
    governorateBoundaryResponseSchema,
  } from "../schemas/governorateBoundarySchemas.js";
  
  export async function fetchGovernorateBoundaries() {
    const response =
      await apiRequest(
        "/api/dashboard/governorate-boundaries",
      );
  
    const validationResult =
      governorateBoundaryResponseSchema
        .safeParse(response);
  
    if (!validationResult.success) {
      console.error(
        "Invalid governorate boundary response:",
        validationResult
          .error
          .issues,
      );
  
      throw new ApiError(
        "The governorate boundary server returned an unexpected response.",
        {
          code:
            "INVALID_GOVERNORATE_BOUNDARY_RESPONSE",
  
          data:
            validationResult
              .error
              .issues,
        },
      );
    }
  
    return validationResult.data.data;
  }