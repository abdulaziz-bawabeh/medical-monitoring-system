import {
    ApiError,
    apiRequest,
  } from "./apiClient.js";
  
  import {
    ambulanceLocationHistoryResponseSchema,
    dispatchHistoryResponseSchema,
    dispatchRouteHistoryResponseSchema,
    emergencyHistoryResponseSchema,
    facilityOccupancyHistoryResponseSchema,
    historyOverviewResponseSchema,
    historySnapshotResponseSchema,
  } from "../schemas/historySchemas.js";
  
  function validateResponse(
    schema,
    response,
    code,
    message,
  ) {
    const result =
      schema.safeParse(
        response,
      );
  
    if (!result.success) {
      console.error(
        code,
        result.error.issues,
      );
  
      throw new ApiError(
        message,
        {
          code,
          data:
            result.error.issues,
        },
      );
    }
  
    return result.data.data;
  }
  
  function normalizeQueryValue(
    value,
  ) {
    if (
      value instanceof Date
    ) {
      return value.toISOString();
    }
  
    return String(value);
  }
  
  function createQuery(
    parameters,
  ) {
    const query =
      new URLSearchParams();
  
    for (
      const [
        key,
        value,
      ] of Object.entries(
        parameters,
      )
    ) {
      if (
        value === null ||
        value === undefined ||
        value === ""
      ) {
        continue;
      }
  
      query.set(
        key,
        normalizeQueryValue(
          value,
        ),
      );
    }
  
    const value =
      query.toString();
  
    return value
      ? `?${value}`
      : "";
  }
  
  export async function fetchHistoryOverview({
    from,
    to,
    governorateId = null,
  } = {}) {
    const response =
      await apiRequest(
        `/api/history/overview${createQuery({
          from,
          to,
          governorateId,
        })}`,
      );
  
    return validateResponse(
      historyOverviewResponseSchema,
      response,
      "INVALID_HISTORY_OVERVIEW_RESPONSE",
      "The server returned an unexpected historical overview response.",
    );
  }
  
  export async function fetchHistorySnapshot({
    at,
    governorateId = null,
  } = {}) {
    const response =
      await apiRequest(
        `/api/history/snapshot${createQuery({
          at,
          governorateId,
        })}`,
      );
  
    return validateResponse(
      historySnapshotResponseSchema,
      response,
      "INVALID_HISTORY_SNAPSHOT_RESPONSE",
      "The server returned an unexpected historical snapshot response.",
    );
  }
  
  export async function fetchFacilityOccupancyHistory({
    from,
    to,
    governorateId = null,
    facilityId = null,
    limit = 5000,
  } = {}) {
    const response =
      await apiRequest(
        `/api/history/facility-occupancy${createQuery({
          from,
          to,
          governorateId,
          facilityId,
          limit,
        })}`,
      );
  
    return validateResponse(
      facilityOccupancyHistoryResponseSchema,
      response,
      "INVALID_FACILITY_HISTORY_RESPONSE",
      "The server returned an unexpected facility occupancy history response.",
    );
  }
  
  export async function fetchAmbulanceLocationHistory({
    from,
    to,
    governorateId = null,
    ambulanceId = null,
    limit = 5000,
  } = {}) {
    const response =
      await apiRequest(
        `/api/history/ambulance-locations${createQuery({
          from,
          to,
          governorateId,
          ambulanceId,
          limit,
        })}`,
      );
  
    return validateResponse(
      ambulanceLocationHistoryResponseSchema,
      response,
      "INVALID_AMBULANCE_HISTORY_RESPONSE",
      "The server returned an unexpected ambulance location history response.",
    );
  }
  
  export async function fetchEmergencyHistory({
    from,
    to,
    governorateId = null,
    status = null,
    limit = 1000,
  } = {}) {
    const response =
      await apiRequest(
        `/api/history/emergencies${createQuery({
          from,
          to,
          governorateId,
          status,
          limit,
        })}`,
      );
  
    return validateResponse(
      emergencyHistoryResponseSchema,
      response,
      "INVALID_EMERGENCY_HISTORY_RESPONSE",
      "The server returned an unexpected emergency history response.",
    );
  }
  
  export async function fetchDispatchHistory({
    from,
    to,
    governorateId = null,
    ambulanceId = null,
    status = null,
    limit = 1000,
  } = {}) {
    const response =
      await apiRequest(
        `/api/history/dispatches${createQuery({
          from,
          to,
          governorateId,
          ambulanceId,
          status,
          limit,
        })}`,
      );
  
    return validateResponse(
      dispatchHistoryResponseSchema,
      response,
      "INVALID_DISPATCH_HISTORY_RESPONSE",
      "The server returned an unexpected dispatch history response.",
    );
  }
  
  export async function fetchDispatchRouteHistory({
    dispatchId,
    from,
    to,
    afterSequence = 0,
    limit = 500,
  }) {
    const response =
      await apiRequest(
        `/api/history/dispatches/${dispatchId}/route${createQuery({
          from,
          to,
          afterSequence,
          limit,
        })}`,
      );
  
    return validateResponse(
      dispatchRouteHistoryResponseSchema,
      response,
      "INVALID_DISPATCH_ROUTE_HISTORY_RESPONSE",
      "The server returned an unexpected historical dispatch route response.",
    );
  }