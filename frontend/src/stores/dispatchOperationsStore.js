import {
  create,
} from "zustand";

import {
  arriveDispatchRequest,
  completeDispatchRequest,
  confirmRecommendationRequest,
  fetchActiveDispatches,
  fetchLatestRecommendation,
  generateRecommendationRequest,
  rejectRecommendationRequest,
  startDispatchRequest,
} from "../services/dispatchService.js";

import {
  useEmergencyOperationsStore,
} from "./emergencyOperationsStore.js";

import {
  useLiveOperationsStore,
} from "./liveOperationsStore.js";

const initialState = {
  status:
    "idle",

  error:
    null,

  requestId:
    null,

  requestedGovernorateId:
    null,

  recommendationIds:
    [],

  recommendationsById:
    {},

  recommendationIdByEmergencyId:
    {},

  dispatchIds:
    [],

  dispatchesById:
    {},

  generatingEmergencyId:
    null,

  confirmingRecommendationId:
    null,

  rejectingRecommendationId:
    null,

  /*
   * Example:
   *
   * {
   *   "12": "start",
   *   "15": "complete"
   * }
   */
  lifecycleActionsByDispatchId:
    {},

  actionError:
    null,
};

function createRequestId() {
  return (
    globalThis.crypto
      ?.randomUUID?.() ??
    `${Date.now()}-${Math.random()}`
  );
}

function sortRecommendations(
  recommendationsById,
) {
  return Object.values(
    recommendationsById,
  )
    .sort(
      (
        first,
        second,
      ) =>
        new Date(
          second.generatedAt,
        ).getTime() -
        new Date(
          first.generatedAt,
        ).getTime(),
    )
    .map(
      (recommendation) =>
        recommendation.id,
    );
}

function sortDispatches(
  dispatchesById,
) {
  return Object.values(
    dispatchesById,
  )
    .sort(
      (
        first,
        second,
      ) =>
        new Date(
          second.assignedAt,
        ).getTime() -
        new Date(
          first.assignedAt,
        ).getTime(),
    )
    .map(
      (dispatch) =>
        dispatch.id,
    );
}

function isTerminalDispatch(
  dispatch,
) {
  return (
    dispatch.status ===
      "COMPLETED" ||
    dispatch.status ===
      "CANCELLED"
  );
}

function applyEmergencyResult(
  emergencyCase,
) {
  if (!emergencyCase) {
    return;
  }

  useEmergencyOperationsStore
    .getState()
    .applyEmergencyUpdated(
      emergencyCase,
    );
}

function applyAlertResult(
  alert,
) {
  if (!alert) {
    return;
  }

  const emergencyStore =
    useEmergencyOperationsStore
      .getState();

  if (
    alert.status ===
    "OPEN"
  ) {
    emergencyStore
      .applyAlertCreated(
        alert,
      );

    return;
  }

  emergencyStore
    .applyAlertUpdated(
      alert,
    );
}

function applyAmbulanceStatusResult(
  ambulanceStatus,
  dispatch,
) {
  if (
    !ambulanceStatus &&
    !dispatch
  ) {
    return;
  }

  const ambulanceId =
    ambulanceStatus
      ?.ambulanceId ??
    ambulanceStatus
      ?.id ??
    dispatch
      ?.ambulance
      ?.id;

  if (!ambulanceId) {
    return;
  }

  useLiveOperationsStore
    .getState()
    .applyAmbulanceStatusUpdated({
      ambulanceId:
        String(
          ambulanceId,
        ),

      code:
        ambulanceStatus
          ?.code ??
        dispatch
          ?.ambulance
          ?.code,

      status:
        ambulanceStatus
          ?.status ??
        dispatch
          ?.ambulance
          ?.status,

      isOperational:
        ambulanceStatus
          ?.isOperational ??
        dispatch
          ?.ambulance
          ?.isOperational ??
        true,

      dispatchId:
        ambulanceStatus
          ?.dispatchId ??
        dispatch?.id,

      updatedAt:
        ambulanceStatus
          ?.updatedAt ??
        dispatch
          ?.updatedAt ??
        new Date()
          .toISOString(),
    });
}

function applyLifecycleSideEffects(
  result,
) {
  applyEmergencyResult(
    result.emergencyCase,
  );

  applyAmbulanceStatusResult(
    result.ambulanceStatus,
    result.dispatch,
  );

  applyAlertResult(
    result.alert,
  );

  for (
    const alert of
    result.alerts ?? []
  ) {
    applyAlertResult(
      alert,
    );
  }
}

async function executeLifecycleAction({
  dispatchId,
  action,
  request,
  fallbackErrorMessage,
  set,
  get,
}) {
  const normalizedDispatchId =
    String(
      dispatchId,
    );

  set((state) => ({
    lifecycleActionsByDispatchId: {
      ...state
        .lifecycleActionsByDispatchId,

      [normalizedDispatchId]:
        action,
    },

    actionError:
      null,
  }));

  try {
    const result =
      await request(
        normalizedDispatchId,
      );

    /*
     * COMPLETED and CANCELLED dispatches are automatically
     * removed from the active dispatch collection.
     */
    get()
      .applyDispatch(
        result.dispatch,
      );

    applyLifecycleSideEffects(
      result,
    );

    set((state) => {
      const nextActions = {
        ...state
          .lifecycleActionsByDispatchId,
      };

      delete nextActions[
        normalizedDispatchId
      ];

      return {
        lifecycleActionsByDispatchId:
          nextActions,

        actionError:
          null,
      };
    });

    return result;
  } catch (error) {
    set((state) => {
      const nextActions = {
        ...state
          .lifecycleActionsByDispatchId,
      };

      delete nextActions[
        normalizedDispatchId
      ];

      return {
        lifecycleActionsByDispatchId:
          nextActions,

        actionError:
          error instanceof Error
            ? error.message
            : fallbackErrorMessage,
      };
    });

    throw error;
  }
}

export const useDispatchOperationsStore =
  create(
    (
      set,
      get,
    ) => ({
      ...initialState,

      loadDispatchOperations:
        async ({
          governorateId = null,
          emergencyIds = [],
          force = false,
        } = {}) => {
          const normalizedGovernorateId =
            governorateId
              ? String(
                  governorateId,
                )
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

          const requestId =
            createRequestId();

          set({
            status:
              "loading",

            error:
              null,

            requestId,

            requestedGovernorateId:
              normalizedGovernorateId,
          });

          try {
            const [
              activeDispatchResult,
              recommendations,
            ] = await Promise.all([
              fetchActiveDispatches({
                governorateId:
                  normalizedGovernorateId,

                limit:
                  100,
              }),

              Promise.all(
                emergencyIds.map(
                  (emergencyId) =>
                    fetchLatestRecommendation(
                      emergencyId,
                    ),
                ),
              ),
            ]);

            if (
              get().requestId !==
              requestId
            ) {
              return;
            }

            const validRecommendations =
              recommendations.filter(
                Boolean,
              );

            const recommendationsById =
              Object.fromEntries(
                validRecommendations.map(
                  (recommendation) => [
                    recommendation.id,
                    recommendation,
                  ],
                ),
              );

            const recommendationIdByEmergencyId =
              Object.fromEntries(
                validRecommendations.map(
                  (recommendation) => [
                    recommendation
                      .emergencyCase
                      .id,

                    recommendation.id,
                  ],
                ),
              );

            const dispatchesById =
              Object.fromEntries(
                activeDispatchResult
                  .dispatches
                  .map(
                    (dispatch) => [
                      dispatch.id,
                      dispatch,
                    ],
                  ),
              );

            set({
              status:
                "ready",

              error:
                null,

              recommendationIds:
                sortRecommendations(
                  recommendationsById,
                ),

              recommendationsById,

              recommendationIdByEmergencyId,

              dispatchIds:
                sortDispatches(
                  dispatchesById,
                ),

              dispatchesById,
            });
          } catch (error) {
            if (
              get().requestId !==
              requestId
            ) {
              return;
            }

            set({
              status:
                "error",

              error:
                error instanceof Error
                  ? error.message
                  : "Dispatch operations could not be loaded.",
            });
          }
        },

      generateRecommendation:
        async (
          emergencyId,
        ) => {
          set({
            generatingEmergencyId:
              String(
                emergencyId,
              ),

            actionError:
              null,
          });

          try {
            const result =
              await generateRecommendationRequest(
                emergencyId,
              );

            get()
              .applyRecommendation(
                result.recommendation,
              );

            applyEmergencyResult(
              result.emergencyCase,
            );

            applyAlertResult(
              result.alert,
            );

            set({
              generatingEmergencyId:
                null,
            });

            return result;
          } catch (error) {
            set({
              generatingEmergencyId:
                null,

              actionError:
                error instanceof Error
                  ? error.message
                  : "The recommendation could not be generated.",
            });

            throw error;
          }
        },

      confirmRecommendation:
        async (
          recommendationId,
        ) => {
          set({
            confirmingRecommendationId:
              String(
                recommendationId,
              ),

            actionError:
              null,
          });

          try {
            const result =
              await confirmRecommendationRequest(
                recommendationId,
              );

            get()
              .applyRecommendation(
                result.recommendation,
              );

            get()
              .applyDispatch(
                result.dispatch,
              );

            applyEmergencyResult(
              result.emergencyCase,
            );

            applyAmbulanceStatusResult(
              result.ambulanceStatus,
              result.dispatch,
            );

            applyAlertResult(
              result.alert,
            );

            set({
              confirmingRecommendationId:
                null,
            });

            return result;
          } catch (error) {
            set({
              confirmingRecommendationId:
                null,

              actionError:
                error instanceof Error
                  ? error.message
                  : "The dispatch recommendation could not be confirmed.",
            });

            throw error;
          }
        },

      rejectRecommendation:
        async (
          recommendationId,
          reason,
        ) => {
          set({
            rejectingRecommendationId:
              String(
                recommendationId,
              ),

            actionError:
              null,
          });

          try {
            const result =
              await rejectRecommendationRequest(
                recommendationId,
                reason,
              );

            get()
              .applyRecommendation(
                result.recommendation,
              );

            applyEmergencyResult(
              result.emergencyCase,
            );

            applyAlertResult(
              result.alert,
            );

            set({
              rejectingRecommendationId:
                null,
            });

            return result;
          } catch (error) {
            set({
              rejectingRecommendationId:
                null,

              actionError:
                error instanceof Error
                  ? error.message
                  : "The dispatch recommendation could not be rejected.",
            });

            throw error;
          }
        },

      startDispatch:
        async (
          dispatchId,
        ) => {
          return executeLifecycleAction({
            dispatchId,

            action:
              "start",

            request:
              startDispatchRequest,

            fallbackErrorMessage:
              "The dispatch could not be started.",

            set,
            get,
          });
        },

      markDispatchArrived:
        async (
          dispatchId,
        ) => {
          return executeLifecycleAction({
            dispatchId,

            action:
              "arrive",

            request:
              arriveDispatchRequest,

            fallbackErrorMessage:
              "The ambulance arrival could not be recorded.",

            set,
            get,
          });
        },

      completeDispatch:
        async (
          dispatchId,
        ) => {
          return executeLifecycleAction({
            dispatchId,

            action:
              "complete",

            request:
              completeDispatchRequest,

            fallbackErrorMessage:
              "The dispatch could not be completed.",

            set,
            get,
          });
        },

      applyDispatchRouteProgress:
        ({
          dispatchId,
          sequenceNumber,
          recordedAt,
        }) => {
          set((state) => {
            const normalizedDispatchId =
              String(
                dispatchId,
              );

            const existingDispatch =
              state
                .dispatchesById[
                normalizedDispatchId
              ];

            if (!existingDispatch) {
              return {};
            }

            if (
              Number(
                existingDispatch
                  .lastRouteSequenceNumber,
              ) >=
              Number(
                sequenceNumber,
              )
            ) {
              return {};
            }

            return {
              dispatchesById: {
                ...state
                  .dispatchesById,

                [normalizedDispatchId]: {
                  ...existingDispatch,

                  lastRouteSequenceNumber:
                    Number(
                      sequenceNumber,
                    ),

                  lastRoutePointAt:
                    recordedAt,
                },
              },
            };
          });
        },

      applyRecommendation:
        (recommendation) => {
          set((state) => {
            const recommendationsById = {
              ...state
                .recommendationsById,

              [recommendation.id]:
                recommendation,
            };

            return {
              recommendationsById,

              recommendationIds:
                sortRecommendations(
                  recommendationsById,
                ),

              recommendationIdByEmergencyId: {
                ...state
                  .recommendationIdByEmergencyId,

                [recommendation
                  .emergencyCase
                  .id]:
                  recommendation.id,
              },
            };
          });
        },

      applyDispatch:
        (dispatch) => {
          set((state) => {
            const dispatchId =
              String(
                dispatch.id,
              );

            if (
              isTerminalDispatch(
                dispatch,
              )
            ) {
              const dispatchesById = {
                ...state
                  .dispatchesById,
              };

              delete dispatchesById[
                dispatchId
              ];

              return {
                dispatchesById,

                dispatchIds:
                  sortDispatches(
                    dispatchesById,
                  ),
              };
            }

            const dispatchesById = {
              ...state
                .dispatchesById,

              [dispatchId]:
                dispatch,
            };

            return {
              dispatchesById,

              dispatchIds:
                sortDispatches(
                  dispatchesById,
                ),
            };
          });
        },

      resetDispatchOperations:
        () => {
          set({
            ...initialState,
          });
        },
    }),
  );