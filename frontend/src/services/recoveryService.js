import {
    apiRequest,
  } from "./apiClient.js";
  
  import {
    liveOperationsRecoveryResponseSchema,
  } from "../schemas/recoverySchemas.js";
  
  export async function fetchLiveOperationsRecovery({
    facilityCheckpoints,
    ambulanceCheckpoints,
    limitPerResource = 500,
  }) {
    const response =
      await apiRequest(
        "/api/recovery/live-operations",
        {
          method:
            "POST",
  
          json: {
            facilityCheckpoints,
  
            ambulanceCheckpoints,
  
            limitPerResource,
          },
        },
      );
  
    const validationResult =
      liveOperationsRecoveryResponseSchema
        .safeParse(
          response,
        );
  
    if (
      !validationResult.success
    ) {
      console.error(
        "Invalid live operations recovery response:",
        validationResult
          .error
          .issues,
      );
  
      throw new Error(
        "The live recovery response has an invalid structure.",
      );
    }
  
    return validationResult
      .data
      .data;
  }