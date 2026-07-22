import {
    apiRequest,
  } from "./apiClient.js";
  
  import {
    simulationApiResponseSchema,
    simulationResetRequestSchema,
    simulationResetResponseSchema,
    simulationStartSettingsSchema,
    simulationStopRequestSchema,
  } from "../schemas/simulationSchemas.js";
  function parseSimulationResponse(
    response,
  ) {
    const validationResult =
      simulationApiResponseSchema
        .safeParse(
          response,
        );
  
    if (
      !validationResult.success
    ) {
      console.error(
        "Invalid simulation API response:",
        validationResult
          .error
          .issues,
      );
  
      throw new Error(
        "The simulation server response has an invalid structure.",
      );
    }
  
    return validationResult
      .data
      .data;
  }
  
  export async function fetchSimulationStatus({
    signal,
  } = {}) {
    const response =
      await apiRequest(
        "/api/simulation/status",
        {
          signal,
        },
      );
  
    return parseSimulationResponse(
      response,
    );
  }
  
  export async function startSimulationRuntime(
    settings,
  ) {
    const validatedSettings =
      simulationStartSettingsSchema
        .parse(
          settings,
        );
  
    const response =
      await apiRequest(
        "/api/simulation/start",
        {
          method:
            "POST",
  
          json:
            validatedSettings,
        },
      );
  
    return parseSimulationResponse(
      response,
    );
  }
  
  export async function stopSimulationRuntime(
    {
      reason,
    },
  ) {
    const validatedRequest =
      simulationStopRequestSchema
        .parse({
          reason,
        });
  
    const response =
      await apiRequest(
        "/api/simulation/stop",
        {
          method:
            "POST",
  
          json:
            validatedRequest,
        },
      );
  
    return parseSimulationResponse(
      response,
    );
  }
  export async function resetSimulationOperations() {
    const requestBody =
      simulationResetRequestSchema
        .parse({
          confirmation:
            "RESET_SIMULATION_OPERATIONS",
        });
  
    const response =
      await apiRequest(
        "/api/simulation/reset",
        {
          method:
            "POST",
  
          json:
            requestBody,
        },
      );
  
    const validationResult =
      simulationResetResponseSchema
        .safeParse(
          response,
        );
  
    if (
      !validationResult.success
    ) {
      console.error(
        "Invalid simulation reset response:",
        validationResult
          .error
          .issues,
      );
  
      throw new Error(
        "The simulation reset response has an invalid structure.",
      );
    }
  
    return validationResult
      .data
      .data;
  }