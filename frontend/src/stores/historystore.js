import {
    create,
  } from "zustand";
  
  import {
    fetchAmbulanceLocationHistory,
    fetchDispatchHistory,
    fetchDispatchRouteHistory,
    fetchEmergencyHistory,
    fetchFacilityOccupancyHistory,
    fetchHistoryOverview,
    fetchHistorySnapshot,
  } from "../services/historyService.js";
  
  const DEFAULT_RANGE_HOURS =
    24;
  
  function createDefaultFilters() {
    const to =
      new Date();
  
    const from =
      new Date(
        to.getTime() -
          DEFAULT_RANGE_HOURS *
            60 *
            60 *
            1000,
      );
  
    return {
      from:
        from.toISOString(),
  
      to:
        to.toISOString(),
  
      snapshotAt:
        to.toISOString(),
  
      governorateId:
        null,
    };
  }
  
  const initialState = {
    status:
      "idle",
  
    error:
      null,
  
    requestId:
      null,
  
    filters:
      createDefaultFilters(),
  
    overview:
      null,
  
    snapshot:
      null,
  
    facilityHistory:
      null,
  
    ambulanceHistory:
      null,
  
    emergencyHistory:
      null,
  
    dispatchHistory:
      null,
  
    routesByDispatchId:
      {},
  
    selectedDispatchId:
      null,
  };
  
  function createRequestId() {
    return (
      globalThis.crypto
        ?.randomUUID?.() ??
      `${Date.now()}-${Math.random()}`
    );
  }
  
  export const useHistoryStore =
    create(
      (
        set,
        get,
      ) => ({
        ...initialState,
  
        setHistoryFilters:
  (partialFilters) => {
    set((state) => ({
      filters: {
        ...state.filters,
        ...partialFilters,

        governorateId:
          partialFilters
            .governorateId ===
            undefined
            ? state.filters
                .governorateId
            : (
                partialFilters
                  .governorateId
                  ? String(
                      partialFilters
                        .governorateId,
                    )
                  : null
              ),
      },

      /*
       * Historical route data depends on the selected
       * from/to range. Clear the cache whenever filters change.
       */
      routesByDispatchId:
        {},

      selectedDispatchId:
        null,
    }));
  },
  
  resetHistoryFilters:
  () => {
    set({
      filters:
        createDefaultFilters(),

      routesByDispatchId:
        {},

      selectedDispatchId:
        null,
    });
  },
  
        loadHistoricalData:
          async ({
            force = false,
          } = {}) => {
            const current =
              get();
  
            if (
              !force &&
              current.status ===
                "loading"
            ) {
              return;
            }
  
            const requestId =
              createRequestId();
  
            const filters = {
              ...current.filters,
            };
  
            set({
              status:
                "loading",
  
              error:
                null,
  
              requestId,
            });
  
            try {
              const [
                overview,
                snapshot,
                facilityHistory,
                ambulanceHistory,
                emergencyHistory,
                dispatchHistory,
              ] = await Promise.all([
                fetchHistoryOverview({
                  from:
                    filters.from,
  
                  to:
                    filters.to,
  
                  governorateId:
                    filters.governorateId,
                }),
  
                fetchHistorySnapshot({
                  at:
                    filters.snapshotAt,
  
                  governorateId:
                    filters.governorateId,
                }),
  
                fetchFacilityOccupancyHistory({
                  from:
                    filters.from,
  
                  to:
                    filters.to,
  
                  governorateId:
                    filters.governorateId,
  
                  limit:
                    5000,
                }),
  
                fetchAmbulanceLocationHistory({
                  from:
                    filters.from,
  
                  to:
                    filters.to,
  
                  governorateId:
                    filters.governorateId,
  
                  limit:
                    5000,
                }),
  
                fetchEmergencyHistory({
                  from:
                    filters.from,
  
                  to:
                    filters.to,
  
                  governorateId:
                    filters.governorateId,
  
                  limit:
                    1000,
                }),
  
                fetchDispatchHistory({
                  from:
                    filters.from,
  
                  to:
                    filters.to,
  
                  governorateId:
                    filters.governorateId,
  
                  limit:
                    1000,
                }),
              ]);
  
              if (
                get().requestId !==
                requestId
              ) {
                return;
              }
  
              set({
                status:
                  "ready",
  
                error:
                  null,
  
                overview,
  
                snapshot,
  
                facilityHistory,
  
                ambulanceHistory,
  
                emergencyHistory,
  
                dispatchHistory,
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
                    : "Historical monitoring data could not be loaded.",
              });
            }
          },
  
        loadHistoricalDispatchRoute:
          async (
            dispatchId,
            {
              force = false,
            } = {},
          ) => {
            const normalizedDispatchId =
              String(
                dispatchId,
              );
  
            const currentRoute =
              get()
                .routesByDispatchId[
                normalizedDispatchId
              ];
  
            if (
              !force &&
              (
                currentRoute
                  ?.status ===
                  "loading" ||
                currentRoute
                  ?.status ===
                  "ready"
              )
            ) {
              set({
                selectedDispatchId:
                  normalizedDispatchId,
              });
  
              return;
            }
  
            const {
              from,
              to,
            } = get().filters;
  
            set((state) => ({
              selectedDispatchId:
                normalizedDispatchId,
  
              routesByDispatchId: {
                ...state
                  .routesByDispatchId,
  
                [normalizedDispatchId]: {
                  status:
                    "loading",
  
                  error:
                    null,
  
                  data:
                    currentRoute
                      ?.data ??
                    null,
                },
              },
            }));
  
            try {
              let afterSequence =
                0;
  
              let metadata =
                null;
  
              let statusEvents =
                [];
  
              const points = [];
  
              while (true) {
                const page =
                  await fetchDispatchRouteHistory({
                    dispatchId:
                      normalizedDispatchId,
  
                    from,
  
                    to,
  
                    afterSequence,
  
                    limit:
                      500,
                  });
  
                metadata =
                  page.dispatch;
  
                statusEvents =
                  page.statusEvents;
  
                points.push(
                  ...page.points,
                );
  
                if (!page.hasMore) {
                  break;
                }
  
                if (
                  page.nextAfterSequence <=
                  afterSequence
                ) {
                  throw new Error(
                    "Historical route pagination did not advance.",
                  );
                }
  
                afterSequence =
                  page.nextAfterSequence;
              }
  
              set((state) => ({
                routesByDispatchId: {
                  ...state
                    .routesByDispatchId,
  
                  [normalizedDispatchId]: {
                    status:
                      "ready",
  
                    error:
                      null,
  
                    data: {
                      dispatch:
                        metadata,
  
                      points,
  
                      statusEvents,
                    },
                  },
                },
              }));
            } catch (error) {
              set((state) => ({
                routesByDispatchId: {
                  ...state
                    .routesByDispatchId,
  
                  [normalizedDispatchId]: {
                    status:
                      "error",
  
                    error:
                      error instanceof Error
                        ? error.message
                        : "The historical dispatch route could not be loaded.",
  
                    data:
                      null,
                  },
                },
              }));
            }
          },
  
        selectHistoricalDispatch:
          (dispatchId) => {
            set({
              selectedDispatchId:
                dispatchId
                  ? String(
                      dispatchId,
                    )
                  : null,
            });
          },
  
        resetHistory:
          () => {
            set({
              ...initialState,
  
              filters:
                createDefaultFilters(),
  
              routesByDispatchId:
                {},
            });
          },
      }),
    );