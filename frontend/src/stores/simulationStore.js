import {
    create,
  } from "zustand";
  
  import {
    fetchSimulationStatus,
    resetSimulationOperations,
    startSimulationRuntime,
    stopSimulationRuntime,
  } from "../services/simulationService.js";
  const DEFAULT_SETTINGS = {
    tickIntervalMs:
      1000,
  
    occupancyEveryTicks:
      3,
  
    emergencyEveryTicks:
      5,
  
    ambulanceMovementEveryTicks:
      1,
  
    maxActiveEmergencies:
      20,
  
    autoConfirmDispatch:
      true,
  };
  
  function normalizeError(
    error,
  ) {
    const validationErrors =
      error?.data?.errors;
  
    if (
      Array.isArray(
        validationErrors,
      ) &&
      validationErrors.length > 0
    ) {
      return validationErrors
        .map((item) => {
          const field =
            item.field
              ? `${item.field}: `
              : "";
  
          return `${field}${item.message}`;
        })
        .join(" | ");
    }
  
    return (
      error?.message ??
      "The simulation request failed."
    );
  }
  
  export const useSimulationStore =
    create((set, get) => ({
      status:
        "idle",
  
      actionStatus:
        "idle",
  
      error:
        null,
  
      generatedAt:
        null,
  
      simulation:
        null,
        
      lastResetResult:
        null,
  
      settings: {
        ...DEFAULT_SETTINGS,
      },
  
      setSetting:
        (
          settingName,
          value,
        ) => {
          set((state) => ({
            settings: {
              ...state.settings,
  
              [settingName]:
                value,
            },
          }));
        },
  
      resetSettings:
        () => {
          set({
            settings: {
              ...DEFAULT_SETTINGS,
            },
  
            error:
              null,
          });
        },
  
      loadStatus:
        async ({
          silent = false,
          signal,
        } = {}) => {
          if (!silent) {
            set({
              status:
                "loading",
  
              error:
                null,
            });
          }
  
          try {
            const result =
              await fetchSimulationStatus({
                signal,
              });
  
            set({
              status:
                "ready",
  
              generatedAt:
                result.generatedAt,
  
              simulation:
                result.simulation,
  
              error:
                null,
            });
  
            return result;
          } catch (error) {
            if (
              error?.name ===
              "AbortError"
            ) {
              return null;
            }
  
            set({
              status:
                "error",
  
              error:
                normalizeError(
                  error,
                ),
            });
  
            throw error;
          }
        },
  
      start:
        async () => {
          const currentState =
            get();
  
          if (
            currentState
              .actionStatus !==
            "idle"
          ) {
            return null;
          }
  
          set({
            actionStatus:
              "starting",
  
            error:
              null,
          });
  
          try {
            const result =
              await startSimulationRuntime(
                currentState.settings,
              );
  
            set({
              actionStatus:
                "idle",
  
              status:
                "ready",
  
              generatedAt:
                result.generatedAt,
  
              simulation:
                result.simulation,
  
              error:
                null,
            });
  
            return result;
          } catch (error) {
            set({
              actionStatus:
                "idle",
  
              error:
                normalizeError(
                  error,
                ),
            });
  
            throw error;
          }
        },
  
      stop:
        async (
          reason =
            "Simulation stopped from the live operations dashboard.",
        ) => {
          const currentState =
            get();
  
          if (
            currentState
              .actionStatus !==
            "idle"
          ) {
            return null;
          }
  
          set({
            actionStatus:
              "stopping",
  
            error:
              null,
          });
  
          try {
            const result =
              await stopSimulationRuntime({
                reason,
              });
  
            set({
              actionStatus:
                "idle",
  
              status:
                "ready",
  
              generatedAt:
                result.generatedAt,
  
              simulation:
                result.simulation,
  
              error:
                null,
            });
  
            return result;
          } catch (error) {
            set({
              actionStatus:
                "idle",
  
              error:
                normalizeError(
                  error,
                ),
            });
  
            throw error;
          }
        },

        resetOperations:
  async () => {
    const currentState =
      get();

    if (
      currentState
        .actionStatus !==
      "idle"
    ) {
      return null;
    }

    if (
      currentState
        .simulation
        ?.isRunning
    ) {
      set({
        error:
          "Stop the simulation before resetting its operational data.",
      });

      return null;
    }

    set({
      actionStatus:
        "resetting",

      error:
        null,
    });

    try {
      const resetResult =
        await resetSimulationOperations();

      const statusResult =
        await fetchSimulationStatus();

      set({
        actionStatus:
          "idle",

        status:
          "ready",

        generatedAt:
          statusResult.generatedAt,

        simulation:
          statusResult.simulation,

        lastResetResult:
          resetResult,

        error:
          null,
      });

      return resetResult;
    } catch (error) {
      set({
        actionStatus:
          "idle",

        error:
          normalizeError(
            error,
          ),
      });

      throw error;
    }
  },
  
      reset:
        () => {
          set({
            status:
              "idle",
  
            actionStatus:
              "idle",
  
            error:
              null,
  
            generatedAt:
              null,
  
            simulation:
              null,
            
            lastResetResult:
              null,
  
            settings: {
              ...DEFAULT_SETTINGS,
            },
          });
        },
    }));