import {
    ApiError,
    apiRequest,
  } from "./apiClient.js";
  
  import {
    dashboardSnapshotResponseSchema,
  } from "../schemas/dashboardSchemas.js";
  
  export async function fetchDashboardSnapshot({
    governorateId = null,
  } = {}) {
    const queryParameters =
      new URLSearchParams();
  
    if (governorateId) {
      queryParameters.set(
        "governorateId",
        governorateId,
      );
    }
  
    const queryString =
      queryParameters.toString();
  
    const endpoint = queryString
      ? `/api/dashboard/snapshot?${queryString}`
      : "/api/dashboard/snapshot";
  
    const response =
      await apiRequest(endpoint);
  
    const validationResult =
      dashboardSnapshotResponseSchema
        .safeParse(response);
  
    if (!validationResult.success) {
      console.error(
        "Invalid Dashboard Snapshot response:",
        validationResult.error.issues,
      );
  
      throw new ApiError(
        "The Dashboard server returned an unexpected response.",
        {
          code:
            "INVALID_DASHBOARD_RESPONSE",
  
          data:
            validationResult.error.issues,
        },
      );
    }
  
    return validationResult.data.data;
  }