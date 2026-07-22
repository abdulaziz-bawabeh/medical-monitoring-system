import {
    ApiError,
    apiRequest,
  } from "./apiClient.js";
  
  import {
    acknowledgeAlertResponseSchema,
    alertsResponseSchema,
    createEmergencyResponseSchema,
    openEmergenciesResponseSchema,
  } from "../schemas/emergencyAlertSchemas.js";
  
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
          code: errorCode,
  
          data:
            validationResult
              .error
              .issues,
        },
      );
    }
  
    return validationResult.data;
  }
  
  export async function fetchOpenEmergencyCases({
    governorateId = null,
    limit = 50,
  } = {}) {
    const query =
      new URLSearchParams();
  
    if (governorateId) {
      query.set(
        "governorateId",
        String(governorateId),
      );
    }
  
    query.set(
      "limit",
      String(limit),
    );
  
    const response =
      await apiRequest(
        `/api/emergencies/open?${query.toString()}`,
      );
  
    const validated =
      validateResponse(
        openEmergenciesResponseSchema,
        response,
        "INVALID_EMERGENCY_LIST_RESPONSE",
        "The emergency server returned an unexpected response.",
      );
  
    return validated.data;
  }
  
  export async function fetchOperationalAlerts({
    status = null,
    alertType = null,
    limit = 50,
  } = {}) {
    const query =
      new URLSearchParams();
  
    if (status) {
      query.set(
        "status",
        status,
      );
    }
  
    if (alertType) {
      query.set(
        "alertType",
        alertType,
      );
    }
  
    query.set(
      "limit",
      String(limit),
    );
  
    const response =
      await apiRequest(
        `/api/alerts?${query.toString()}`,
      );
  
    const validated =
      validateResponse(
        alertsResponseSchema,
        response,
        "INVALID_ALERT_LIST_RESPONSE",
        "The alert server returned an unexpected response.",
      );
  
    return validated.data;
  }
  
  export async function createEmergencyCaseRequest(
    emergencyData,
  ) {
    const response =
  await apiRequest(
    "/api/emergencies",
    {
      method: "POST",

      json: emergencyData,
    },
  );
  
    const validated =
      validateResponse(
        createEmergencyResponseSchema,
        response,
        "INVALID_CREATE_EMERGENCY_RESPONSE",
        "The emergency server returned an unexpected creation response.",
      );
  
    return validated.data;
  }
  
  export async function acknowledgeAlertRequest(
    alertId,
  ) {
    const response =
      await apiRequest(
        `/api/alerts/${alertId}/acknowledge`,
        {
          method: "PATCH",
        },
      );
  
    const validated =
      validateResponse(
        acknowledgeAlertResponseSchema,
        response,
        "INVALID_ACKNOWLEDGE_ALERT_RESPONSE",
        "The alert server returned an unexpected acknowledgement response.",
      );
  
    return validated.data;
  }