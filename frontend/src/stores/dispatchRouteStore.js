import {
    create,
  } from "zustand";
  
  import {
    createDispatchRoutePointRequest,
    fetchDispatchRoute,
  } from "../services/dispatchRouteService.js";
  
  import {
    useDispatchOperationsStore,
  } from "./dispatchOperationsStore.js";
  
  import {
    useLiveOperationsStore,
  } from "./liveOperationsStore.js";
  
  function createEmptyRouteState() {
    return {
      status:
        "idle",
  
      error:
        null,
  
      loaded:
        false,
  
      isRecovering:
        false,
  
      sendStatus:
        "idle",
  
      sendError:
        null,
  
      dispatch:
        null,
  
      pointsBySequence:
        {},
  
      sequenceNumbers:
        [],
  
      lastSequence:
        0,
  
      lastRecoveredAt:
        null,
    };
  }
  
  function normalizeDispatchId(
    dispatchId,
  ) {
    return String(
      dispatchId,
    );
  }
  
  function mergeRoutePoints(
    routeState,
    incomingPoints,
  ) {
    const pointsBySequence = {
      ...routeState
        .pointsBySequence,
    };
  
    for (
      const point of
      incomingPoints
    ) {
      const sequenceNumber =
        Number(
          point.sequenceNumber,
        );
  
      const existingPoint =
        pointsBySequence[
          sequenceNumber
        ];
  
      if (
        existingPoint &&
        existingPoint.eventId !==
          point.eventId
      ) {
        console.warn(
          "A different route event already exists for sequence:",
          sequenceNumber,
        );
  
        continue;
      }
  
      pointsBySequence[
        sequenceNumber
      ] = point;
    }
  
    const sequenceNumbers =
      Object.keys(
        pointsBySequence,
      )
        .map(Number)
        .sort(
          (first, second) =>
            first - second,
        );
  
    return {
      ...routeState,
  
      pointsBySequence,
  
      sequenceNumbers,
  
      lastSequence:
        sequenceNumbers.length > 0
          ? sequenceNumbers[
              sequenceNumbers.length -
                1
            ]
          : 0,
    };
  }
  
  function synchronizeDependentStores(
    routePoint,
  ) {
    useLiveOperationsStore
      .getState()
      .applyAmbulanceRoutePoint(
        routePoint,
      );
  
    useDispatchOperationsStore
      .getState()
      .applyDispatchRouteProgress({
        dispatchId:
          routePoint.dispatchId,
  
        sequenceNumber:
          routePoint
            .sequenceNumber,
  
        recordedAt:
          routePoint
            .recordedAt,
      });
  }
  
  async function fetchAllRoutePages({
    dispatchId,
    afterSequence,
    onPage,
  }) {
    let nextSequence =
      afterSequence;
  
    let pageNumber = 0;
  
    while (true) {
      pageNumber += 1;
  
      /*
       * Prevent an accidental infinite pagination loop.
       *
       * 500 pages × 500 points = 250,000 route points.
       */
      if (pageNumber > 500) {
        throw new Error(
          "The route contains too many pages to load safely.",
        );
      }
  
      const page =
        await fetchDispatchRoute({
          dispatchId,
  
          afterSequence:
            nextSequence,
  
          limit: 500,
        });
  
      await onPage(
        page,
      );
  
      if (!page.hasMore) {
        return;
      }
  
      if (
        page.nextAfterSequence <=
        nextSequence
      ) {
        throw new Error(
          "The route pagination cursor did not advance.",
        );
      }
  
      nextSequence =
        page.nextAfterSequence;
    }
  }
  
  const initialState = {
    routesByDispatchId:
      {},
  };
  
  export const useDispatchRouteStore =
    create((set, get) => ({
      ...initialState,
  
      loadDispatchRoute:
        async (
          dispatchId,
          {
            force = false,
          } = {},
        ) => {
          const normalizedDispatchId =
            normalizeDispatchId(
              dispatchId,
            );
  
          const existingRoute =
            get()
              .routesByDispatchId[
              normalizedDispatchId
            ];
  
          if (
            !force &&
            existingRoute?.loaded
          ) {
            return;
          }
  
          if (
            existingRoute?.status ===
            "loading"
          ) {
            return;
          }
  
          set((state) => ({
            routesByDispatchId: {
              ...state
                .routesByDispatchId,
  
              [normalizedDispatchId]: {
                ...(
                  state
                    .routesByDispatchId[
                    normalizedDispatchId
                  ] ??
                  createEmptyRouteState()
                ),
  
                status:
                  "loading",
  
                error:
                  null,
              },
            },
          }));
  
          const receivedPoints = [];
  
          let dispatchMetadata =
            null;
  
          try {
            await fetchAllRoutePages({
              dispatchId:
                normalizedDispatchId,
  
              afterSequence:
                0,
  
              onPage:
                async (page) => {
                  dispatchMetadata =
                    page.dispatch;
  
                  receivedPoints.push(
                    ...page.points,
                  );
                },
            });
  
            set((state) => {
              const currentRoute =
                state
                  .routesByDispatchId[
                  normalizedDispatchId
                ] ??
                createEmptyRouteState();
  
              const mergedRoute =
                mergeRoutePoints(
                  currentRoute,
                  receivedPoints,
                );
  
              return {
                routesByDispatchId: {
                  ...state
                    .routesByDispatchId,
  
                  [normalizedDispatchId]: {
                    ...mergedRoute,
  
                    status:
                      "ready",
  
                    error:
                      null,
  
                    loaded:
                      true,
  
                    dispatch:
                      dispatchMetadata,
                  },
                },
              };
            });
  
            const latestPoint =
              receivedPoints.length > 0
                ? receivedPoints[
                    receivedPoints.length -
                      1
                  ]
                : null;
  
            if (latestPoint) {
              synchronizeDependentStores(
                latestPoint,
              );
            }
  
            return get()
              .routesByDispatchId[
              normalizedDispatchId
            ];
          } catch (error) {
            set((state) => ({
              routesByDispatchId: {
                ...state
                  .routesByDispatchId,
  
                [normalizedDispatchId]: {
                  ...(
                    state
                      .routesByDispatchId[
                      normalizedDispatchId
                    ] ??
                    createEmptyRouteState()
                  ),
  
                  status:
                    "error",
  
                  error:
                    error instanceof Error
                      ? error.message
                      : "The dispatch route could not be loaded.",
                },
              },
            }));
  
            throw error;
          }
        },
  
      recoverDispatchRoute:
        async (
          dispatchId,
          {
            fromSequence =
              null,
          } = {},
        ) => {
          const normalizedDispatchId =
            normalizeDispatchId(
              dispatchId,
            );
  
          const currentRoute =
            get()
              .routesByDispatchId[
              normalizedDispatchId
            ] ??
            createEmptyRouteState();
  
          if (
            currentRoute
              .isRecovering
          ) {
            return;
          }
  
          const startingSequence =
            fromSequence === null
              ? currentRoute
                  .lastSequence
              : Number(
                  fromSequence,
                );
  
          set((state) => ({
            routesByDispatchId: {
              ...state
                .routesByDispatchId,
  
              [normalizedDispatchId]: {
                ...(
                  state
                    .routesByDispatchId[
                    normalizedDispatchId
                  ] ??
                  createEmptyRouteState()
                ),
  
                isRecovering:
                  true,
  
                error:
                  null,
              },
            },
          }));
  
          try {
            await fetchAllRoutePages({
              dispatchId:
                normalizedDispatchId,
  
              afterSequence:
                startingSequence,
  
              onPage:
                async (page) => {
                  set((state) => {
                    const route =
                      state
                        .routesByDispatchId[
                        normalizedDispatchId
                      ] ??
                      createEmptyRouteState();
  
                    const merged =
                      mergeRoutePoints(
                        route,
                        page.points,
                      );
  
                    return {
                      routesByDispatchId: {
                        ...state
                          .routesByDispatchId,
  
                        [normalizedDispatchId]: {
                          ...merged,
  
                          dispatch:
                            page.dispatch,
  
                          loaded:
                            true,
                        },
                      },
                    };
                  });
  
                  for (
                    const point of
                    page.points
                  ) {
                    synchronizeDependentStores(
                      point,
                    );
                  }
                },
            });
  
            set((state) => ({
              routesByDispatchId: {
                ...state
                  .routesByDispatchId,
  
                [normalizedDispatchId]: {
                  ...(
                    state
                      .routesByDispatchId[
                      normalizedDispatchId
                    ] ??
                    createEmptyRouteState()
                  ),
  
                  isRecovering:
                    false,
  
                  status:
                    "ready",
  
                  error:
                    null,
  
                  loaded:
                    true,
  
                  lastRecoveredAt:
                    new Date()
                      .toISOString(),
                },
              },
            }));
          } catch (error) {
            set((state) => ({
              routesByDispatchId: {
                ...state
                  .routesByDispatchId,
  
                [normalizedDispatchId]: {
                  ...(
                    state
                      .routesByDispatchId[
                      normalizedDispatchId
                    ] ??
                    createEmptyRouteState()
                  ),
  
                  isRecovering:
                    false,
  
                  error:
                    error instanceof Error
                      ? error.message
                      : "Missed route points could not be recovered.",
                },
              },
            }));
          }
        },
  
      applySocketRoutePoint:
        (routePoint) => {
          const dispatchId =
            normalizeDispatchId(
              routePoint.dispatchId,
            );
  
          const currentRoute =
            get()
              .routesByDispatchId[
              dispatchId
            ] ??
            createEmptyRouteState();
  
          const previousLastSequence =
            currentRoute
              .lastSequence;
  
          set((state) => {
            const route =
              state
                .routesByDispatchId[
                dispatchId
              ] ??
              createEmptyRouteState();
  
            const merged =
              mergeRoutePoints(
                route,
                [
                  routePoint,
                ],
              );
  
            return {
              routesByDispatchId: {
                ...state
                  .routesByDispatchId,
  
                [dispatchId]: {
                  ...merged,
  
                  status:
                    "ready",
  
                  error:
                    null,
                },
              },
            };
          });
  
          synchronizeDependentStores(
            routePoint,
          );
  
          /*
           * Example:
           *
           * Last received sequence = 10
           * New Socket point       = 13
           *
           * Points 11 and 12 were missed.
           * Recover starting after sequence 10.
           */
          const hasSequenceGap =
            routePoint.sequenceNumber >
            previousLastSequence + 1;
  
          if (hasSequenceGap) {
            queueMicrotask(() => {
              get()
                .recoverDispatchRoute(
                  dispatchId,
                  {
                    fromSequence:
                      previousLastSequence,
                  },
                );
            });
          }
        },
  
      sendRoutePoint:
        async (
          dispatchId,
          routePointData,
        ) => {
          const normalizedDispatchId =
            normalizeDispatchId(
              dispatchId,
            );
  
          set((state) => ({
            routesByDispatchId: {
              ...state
                .routesByDispatchId,
  
              [normalizedDispatchId]: {
                ...(
                  state
                    .routesByDispatchId[
                    normalizedDispatchId
                  ] ??
                  createEmptyRouteState()
                ),
  
                sendStatus:
                  "sending",
  
                sendError:
                  null,
              },
            },
          }));
  
          try {
            const result =
              await createDispatchRoutePointRequest(
                routePointData,
              );
  
            get()
              .applySocketRoutePoint(
                result.routePoint,
              );
  
            set((state) => ({
              routesByDispatchId: {
                ...state
                  .routesByDispatchId,
  
                [normalizedDispatchId]: {
                  ...(
                    state
                      .routesByDispatchId[
                      normalizedDispatchId
                    ] ??
                    createEmptyRouteState()
                  ),
  
                  sendStatus:
                    "idle",
  
                  sendError:
                    null,
                },
              },
            }));
  
            return result;
          } catch (error) {
            set((state) => ({
              routesByDispatchId: {
                ...state
                  .routesByDispatchId,
  
                [normalizedDispatchId]: {
                  ...(
                    state
                      .routesByDispatchId[
                      normalizedDispatchId
                    ] ??
                    createEmptyRouteState()
                  ),
  
                  sendStatus:
                    "error",
  
                  sendError:
                    error instanceof Error
                      ? error.message
                      : "The route point could not be sent.",
                },
              },
            }));
  
            throw error;
          }
        },
  
      resetDispatchRoutes:
        () => {
          set({
            ...initialState,
          });
        },
    }));