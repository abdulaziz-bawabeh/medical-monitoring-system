import {
    create,
  } from "zustand";
  
  import {
    acknowledgeAlertRequest,
    createEmergencyCaseRequest,
    fetchOpenEmergencyCases,
    fetchOperationalAlerts,
  } from "../services/emergencyAlertService.js";
  
  const initialState = {
    status: "idle",
  
    error: null,
  
    requestedGovernorateId: null,
  
    requestId: null,
  
    emergencyIds: [],
  
    emergenciesById: {},
  
    alertIds: [],
  
    alertsById: {},
  
    createStatus: "idle",
  
    createError: null,
  
    acknowledgingAlertId: null,
  
    acknowledgeError: null,
  };
  
  function createRequestId() {
    return globalThis.crypto
      ?.randomUUID?.() ??
      `${Date.now()}-${Math.random()}`;
  }
  
  function indexItemsById(
    items,
  ) {
    return Object.fromEntries(
      items.map((item) => [
        item.id,
        item,
      ]),
    );
  }
  
  function sortEmergencyIds(
    emergenciesById,
  ) {
    return Object.values(
      emergenciesById,
    )
      .sort(
        (first, second) =>
          new Date(
            second.reportedAt,
          ).getTime() -
          new Date(
            first.reportedAt,
          ).getTime(),
      )
      .map(
        (emergency) =>
          emergency.id,
      );
  }
  
  function sortAlertIds(
    alertsById,
  ) {
    const statusPriority = {
      OPEN: 0,
      ACKNOWLEDGED: 1,
      RESOLVED: 2,
    };
  
    return Object.values(
      alertsById,
    )
      .sort((first, second) => {
        const statusDifference =
          statusPriority[
            first.status
          ] -
          statusPriority[
            second.status
          ];
  
        if (statusDifference !== 0) {
          return statusDifference;
        }
  
        return (
          new Date(
            second.createdAt,
          ).getTime() -
          new Date(
            first.createdAt,
          ).getTime()
        );
      })
      .map(
        (alert) =>
          alert.id,
      );
  }
  
  function matchesGovernorate(
    emergency,
    governorateId,
  ) {
    if (!governorateId) {
      return true;
    }
  
    return (
      String(
        emergency
          .governorate
          .id,
      ) ===
      String(governorateId)
    );
  }
  
  export const useEmergencyOperationsStore =
    create((set, get) => ({
      ...initialState,
  
      loadOperationalData: async ({
        governorateId = null,
        force = false,
      } = {}) => {
        const normalizedGovernorateId =
          governorateId
            ? String(governorateId)
            : null;
  
        const currentState =
          get();
  
        if (
          !force &&
          currentState.status ===
            "loading" &&
          currentState
            .requestedGovernorateId ===
            normalizedGovernorateId
        ) {
          return;
        }
  
        if (
          !force &&
          currentState.status ===
            "ready" &&
          currentState
            .requestedGovernorateId ===
            normalizedGovernorateId
        ) {
          return;
        }
  
        const requestId =
          createRequestId();
  
        set({
          status: "loading",
  
          error: null,
  
          requestedGovernorateId:
            normalizedGovernorateId,
  
          requestId,
        });
  
        try {
          const [
            emergencyResult,
            alertResult,
          ] = await Promise.all([
            fetchOpenEmergencyCases({
              governorateId:
                normalizedGovernorateId,
  
              limit: 100,
            }),
  
            fetchOperationalAlerts({
              limit: 100,
            }),
          ]);
  
          if (
            get().requestId !==
            requestId
          ) {
            return;
          }
  
          const emergenciesById =
            indexItemsById(
              emergencyResult.emergencies,
            );
  
          const alertsById =
            indexItemsById(
              alertResult.alerts,
            );
  
          set({
            status: "ready",
  
            error: null,
  
            emergencyIds:
              sortEmergencyIds(
                emergenciesById,
              ),
  
            emergenciesById,
  
            alertIds:
              sortAlertIds(
                alertsById,
              ),
  
            alertsById,
          });
        } catch (error) {
          if (
            get().requestId !==
            requestId
          ) {
            return;
          }
  
          set({
            status: "error",
  
            error:
              error instanceof Error
                ? error.message
                : "Emergency operations could not be loaded.",
          });
        }
      },
  
      createEmergency:
        async (input) => {
          set({
            createStatus:
              "submitting",
  
            createError: null,
          });
  
          try {
            const result =
              await createEmergencyCaseRequest(
                input,
              );
  
            get()
              .applyEmergencyCreated(
                result.emergencyCase,
              );
  
            if (result.alert) {
              get()
                .applyAlertCreated(
                  result.alert,
                );
            }
  
            set({
              createStatus:
                "success",
  
              createError: null,
            });
  
            return result;
          } catch (error) {
            set({
              createStatus:
                "error",
  
              createError:
                error instanceof Error
                  ? error.message
                  : "The emergency case could not be created.",
            });
  
            throw error;
          }
        },
  
      acknowledgeAlert:
        async (alertId) => {
          set({
            acknowledgingAlertId:
              String(alertId),
  
            acknowledgeError:
              null,
          });
  
          try {
            const result =
              await acknowledgeAlertRequest(
                alertId,
              );
  
            get()
              .applyAlertUpdated(
                result.alert,
              );
  
            set({
              acknowledgingAlertId:
                null,
  
              acknowledgeError:
                null,
            });
  
            return result;
          } catch (error) {
            set({
              acknowledgingAlertId:
                null,
  
              acknowledgeError:
                error instanceof Error
                  ? error.message
                  : "The alert could not be acknowledged.",
            });
  
            throw error;
          }
        },
  
      applyEmergencyCreated:
        (emergency) => {
          set((state) => {
            if (
              !matchesGovernorate(
                emergency,
                state
                  .requestedGovernorateId,
              )
            ) {
              return state;
            }
  
            const emergenciesById = {
              ...state
                .emergenciesById,
  
              [emergency.id]:
                emergency,
            };
  
            return {
              emergenciesById,
  
              emergencyIds:
                sortEmergencyIds(
                  emergenciesById,
                ),
            };
          });
        },
        applyEmergencyUpdated:
        (emergency) => {
          set((state) => {
            const activeStatuses =
              new Set([
                "OPEN",
                "AWAITING_MANAGER_CONFIRMATION",
                "DISPATCHED",
              ]);
      
            const shouldRemainVisible =
              matchesGovernorate(
                emergency,
                state
                  .requestedGovernorateId,
              ) &&
              activeStatuses.has(
                emergency.status,
              );
      
            if (!shouldRemainVisible) {
              if (
                !state.emergenciesById[
                  emergency.id
                ]
              ) {
                return {};
              }
      
              const emergenciesById = {
                ...state.emergenciesById,
              };
      
              delete emergenciesById[
                emergency.id
              ];
      
              return {
                emergenciesById,
      
                emergencyIds:
                  sortEmergencyIds(
                    emergenciesById,
                  ),
              };
            }
      
            const emergenciesById = {
              ...state.emergenciesById,
      
              [emergency.id]:
                emergency,
            };
      
            return {
              emergenciesById,
      
              emergencyIds:
                sortEmergencyIds(
                  emergenciesById,
                ),
            };
          });
        },
  
      applyAlertCreated:
        (alert) => {
          set((state) => {
            const alertsById = {
              ...state.alertsById,
  
              [alert.id]:
                alert,
            };
  
            return {
              alertsById,
  
              alertIds:
                sortAlertIds(
                  alertsById,
                ),
            };
          });
        },
  
      applyAlertUpdated:
        (alert) => {
          set((state) => {
            const alertsById = {
              ...state.alertsById,
  
              [alert.id]:
                alert,
            };
  
            return {
              alertsById,
  
              alertIds:
                sortAlertIds(
                  alertsById,
                ),
            };
          });
        },
  
      resetEmergencyOperations:
        () => {
          set({
            ...initialState,
          });
        },
    }));