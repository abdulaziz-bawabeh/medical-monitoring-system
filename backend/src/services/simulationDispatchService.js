import {
    randomUUID,
  } from "node:crypto";
  
  import {
    confirmDispatchRecommendation,
    generateDispatchRecommendation,
  } from "./dispatchService.js";
  
  /*
   * These errors represent normal operational outcomes during
   * simulation and must not stop the simulation clock.
   */
  const EXPECTED_RECOMMENDATION_SKIP_CODES =
    new Set([
      "NO_ELIGIBLE_AMBULANCE",
      "EMERGENCY_NOT_ELIGIBLE_FOR_RECOMMENDATION",
      "DISPATCH_RESOURCE_CONFLICT",
    ]);
  
  const EXPECTED_CONFIRMATION_SKIP_CODES =
    new Set([
      "RECOMMENDATION_EXPIRED",
      "RECOMMENDATION_NOT_PENDING",
      "DISPATCH_RESOURCES_NOT_FOUND",
      "EMERGENCY_STATE_CHANGED",
      "AMBULANCE_NOT_AVAILABLE",
      "AMBULANCE_LOCATION_UNAVAILABLE",
      "AMBULANCE_LOCATION_STALE",
      "EMERGENCY_ALREADY_DISPATCHED",
      "AMBULANCE_ALREADY_DISPATCHED",
      "DISPATCH_RESOURCE_CONFLICT",
    ]);
  
  function getErrorCode(
    error,
  ) {
    return (
      error?.code ??
      "UNKNOWN_DISPATCH_ERROR"
    );
  }
  
  /*
   * Generates a nearest-ambulance recommendation for one
   * emergency created by the simulation.
   *
   * When autoConfirmDispatch is true, the same recommendation
   * is immediately confirmed and an ASSIGNED dispatch is created.
   */
  export async function automateSimulationEmergencyDispatch({
    emergencyCase,
    startedByUserId,
    autoConfirmDispatch,
    simulationRunId,
    tickCount,
  }) {
    if (!emergencyCase?.id) {
      throw new Error(
        "The simulation dispatch automation requires a valid emergency case.",
      );
    }
  
    if (!startedByUserId) {
      throw new Error(
        "The simulation dispatch automation requires the simulation starter user.",
      );
    }
  
    const authenticatedUser = {
      id:
        String(
          startedByUserId,
        ),
    };
  
    let recommendationResult;
  
    try {
      recommendationResult =
        await generateDispatchRecommendation(
          {
            emergencyId:
              emergencyCase.id,
  
            eventId:
              randomUUID(),
          },
  
          authenticatedUser,
        );
    } catch (error) {
      const errorCode =
        getErrorCode(
          error,
        );
  
      if (
        EXPECTED_RECOMMENDATION_SKIP_CODES
          .has(
            errorCode,
          )
      ) {
        return {
          status:
            "RECOMMENDATION_SKIPPED",
  
          simulationRunId:
            String(
              simulationRunId,
            ),
  
          tickCount:
            Number(
              tickCount,
            ),
  
          emergencyCase,
  
          recommendation:
            null,
  
          dispatch:
            null,
  
          autoConfirmed:
            false,
  
          reason:
            errorCode,
  
          message:
            error.message,
        };
      }
  
      throw error;
    }
  
    const recommendation =
      recommendationResult
        ?.recommendation ??
      null;
  
    if (!recommendation) {
      return {
        status:
          "RECOMMENDATION_SKIPPED",
  
        simulationRunId:
          String(
            simulationRunId,
          ),
  
        tickCount:
          Number(
            tickCount,
          ),
  
        emergencyCase,
  
        recommendation:
          null,
  
        dispatch:
          null,
  
        autoConfirmed:
          false,
  
        reason:
          "RECOMMENDATION_NOT_RETURNED",
  
        message:
          "The dispatch service did not return a recommendation.",
      };
    }
  
    /*
     * Manual-confirmation mode.
     *
     * The manager will see the pending recommendation and can
     * confirm or reject it from the Dashboard.
     */
    if (!autoConfirmDispatch) {
      return {
        status:
          "RECOMMENDATION_READY",
  
        simulationRunId:
          String(
            simulationRunId,
          ),
  
        tickCount:
          Number(
            tickCount,
          ),
  
        emergencyCase:
          recommendationResult
            .emergencyCase ??
          emergencyCase,
  
        recommendation,
  
        dispatch:
          null,
  
        autoConfirmed:
          false,
  
        duplicate:
          Boolean(
            recommendationResult
              .duplicate,
          ),
  
        reused:
          Boolean(
            recommendationResult
              .reused,
          ),
  
        reason:
          null,
      };
    }
  
    /*
     * Automatic-confirmation mode.
     *
     * Confirming creates:
     * - ASSIGNED dispatch
     * - BUSY ambulance
     * - DISPATCHED emergency
     */
    try {
      const confirmationResult =
        await confirmDispatchRecommendation(
          {
            recommendationId:
              recommendation.id,
  
            dispatchEventId:
              randomUUID(),
          },
  
          authenticatedUser,
        );
  
      return {
        status:
          "DISPATCH_ASSIGNED",
  
        simulationRunId:
          String(
            simulationRunId,
          ),
  
        tickCount:
          Number(
            tickCount,
          ),
  
        emergencyCase:
          confirmationResult
            .emergencyCase ??
          emergencyCase,
  
        recommendation:
          confirmationResult
            .recommendation ??
          recommendation,
  
        dispatch:
          confirmationResult
            .dispatch ??
          null,
  
        ambulanceStatus:
          confirmationResult
            .ambulanceStatus ??
          null,
  
        autoConfirmed:
          true,
  
        duplicate:
          Boolean(
            confirmationResult
              .duplicate,
          ),
  
        reused:
          Boolean(
            recommendationResult
              .reused,
          ),
  
        reason:
          null,
      };
    } catch (error) {
      const errorCode =
        getErrorCode(
          error,
        );
  
      if (
        EXPECTED_CONFIRMATION_SKIP_CODES
          .has(
            errorCode,
          )
      ) {
        return {
          status:
            "CONFIRMATION_SKIPPED",
  
          simulationRunId:
            String(
              simulationRunId,
            ),
  
          tickCount:
            Number(
              tickCount,
            ),
  
          emergencyCase,
  
          recommendation,
  
          dispatch:
            null,
  
          autoConfirmed:
            false,
  
          reason:
            errorCode,
  
          message:
            error.message,
        };
      }
  
      throw error;
    }
  }