import { create } from "zustand";

import {
  fetchDashboardSnapshot,
} from "../services/dashboardService.js";

import {
  fetchLiveOperationsRecovery,
} from "../services/recoveryService.js";

let activeRecoveryPromise =
  null;

const MAXIMUM_RECOVERY_PAGES =
  20;

const emptySummary = {
  facilities: {
    total: 0,
    green: 0,
    red: 0,
    withoutOccupancyData: 0,
  },

  ambulances: {
    total: 0,
    available: 0,
    busy: 0,
    offline: 0,
    maintenance: 0,
  },
};

const initialSocketState = {
  connectionStatus: "idle",

  socketId: null,

  socketUser: null,

  connectionMessage:
    "The live connection has not started.",

  recovered: false,

  lastConnectedAt: null,

  lastDisconnectedAt: null,

  disconnectReason: null,

  connectionError: null,
};

const initialDashboardState = {
  snapshotStatus: "idle",

  snapshotError: null,

  generatedAt: null,

  requestedGovernorateId: null,

  snapshotRequestId: null,

  governorates: [],

  facilityIds: [],

  facilitiesById: {},

  ambulanceIds: [],

  ambulancesById: {},

  summary: emptySummary,
};

const initialRecoveryState = {
  recoveryStatus:
    "idle",

  recoveryError:
    null,

  recoveredFacilityEvents:
    0,

  recoveredAmbulanceEvents:
    0,

  lastRecoveryAt:
    null,
};

function indexItemsById(items) {
  return Object.fromEntries(
    items.map((item) => [
      item.id,
      item,
    ]),
  );
}

function calculateSummary(
  facilitiesById,
  ambulancesById,
) {
  const facilities =
    Object.values(
      facilitiesById,
    );

  const ambulances =
    Object.values(
      ambulancesById,
    );

  return {
    facilities: {
      total:
        facilities.length,

      green:
        facilities.filter(
          (facility) =>
            facility.occupancy
              ?.status === "GREEN",
        ).length,

      red:
        facilities.filter(
          (facility) =>
            facility.occupancy
              ?.status === "RED",
        ).length,

      withoutOccupancyData:
        facilities.filter(
          (facility) =>
            facility.occupancy ===
            null,
        ).length,
    },

    ambulances: {
      total:
        ambulances.length,

      available:
        ambulances.filter(
          (ambulance) =>
            ambulance.status ===
              "AVAILABLE" &&
            ambulance.isOperational,
        ).length,

      busy:
        ambulances.filter(
          (ambulance) =>
            ambulance.status ===
            "BUSY",
        ).length,

      offline:
        ambulances.filter(
          (ambulance) =>
            ambulance.status ===
            "OFFLINE",
        ).length,

      maintenance:
        ambulances.filter(
          (ambulance) =>
            ambulance.status ===
            "MAINTENANCE",
        ).length,
    },
  };
}

function createRequestId() {
  return globalThis.crypto
    ?.randomUUID?.() ??
    `${Date.now()}-${Math.random()}`;
}

function buildFacilityCheckpoints(
  state,
) {
  return state.facilityIds
    .map((facilityId) => {
      const facility =
        state.facilitiesById[
          String(
            facilityId,
          )
        ];

      if (!facility) {
        return null;
      }

      return {
        resourceId:
          String(
            facility.id,
          ),

        sequenceNumber:
          Number(
            facility.occupancy
              ?.sequenceNumber ??
            0,
          ),
      };
    })
    .filter(Boolean);
}

function buildAmbulanceCheckpoints(
  state,
) {
  return state.ambulanceIds
    .map((ambulanceId) => {
      const ambulance =
        state.ambulancesById[
          String(
            ambulanceId,
          )
        ];

      if (!ambulance) {
        return null;
      }

      return {
        resourceId:
          String(
            ambulance.id,
          ),

        sequenceNumber:
          Number(
            ambulance
              .lastSequenceNumber ??
            0,
          ),
      };
    })
    .filter(Boolean);
}

function advanceCheckpoints(
  checkpoints,
  events,
  resourceField,
) {
  const sequenceByResource =
    new Map(
      checkpoints.map(
        (checkpoint) => [
          String(
            checkpoint.resourceId,
          ),

          Number(
            checkpoint.sequenceNumber,
          ),
        ],
      ),
    );

  for (
    const event of
    events
  ) {
    const resourceId =
      String(
        event[
          resourceField
        ],
      );

    const currentSequence =
      sequenceByResource.get(
        resourceId,
      ) ?? 0;

    sequenceByResource.set(
      resourceId,
      Math.max(
        currentSequence,
        Number(
          event.sequenceNumber,
        ),
      ),
    );
  }

  return Array.from(
    sequenceByResource,
    (
      [
        resourceId,
        sequenceNumber,
      ],
    ) => ({
      resourceId,
      sequenceNumber,
    }),
  );
}

export const useLiveOperationsStore =
  create((set, get) => ({
    ...initialSocketState,

    ...initialDashboardState,
    ...initialRecoveryState,

    loadDashboardSnapshot: async ({
      governorateId = null,
      force = false,
    } = {}) => {
      const normalizedGovernorateId =
        governorateId
          ? String(governorateId)
          : null;

      const currentState = get();

      if (
        !force &&
        currentState.snapshotStatus ===
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
        snapshotStatus: "loading",

        snapshotError: null,

        requestedGovernorateId:
          normalizedGovernorateId,

        snapshotRequestId:
          requestId,
      });

      try {
        const snapshot =
          await fetchDashboardSnapshot({
            governorateId:
              normalizedGovernorateId,
          });

        /*
         * Prevent an older, slower request from overwriting
         * a newer governorate request.
         */
        if (
          get().snapshotRequestId !==
          requestId
        ) {
          return;
        }

        const facilitiesById =
          indexItemsById(
            snapshot.facilities,
          );

        const ambulancesById =
          indexItemsById(
            snapshot.ambulances,
          );

        set({
          snapshotStatus: "ready",

          snapshotError: null,

          generatedAt:
            snapshot.generatedAt,

          requestedGovernorateId:
            normalizedGovernorateId,

          governorates:
            snapshot.governorates,

          facilityIds:
            snapshot.facilities.map(
              (facility) =>
                facility.id,
            ),

          facilitiesById,

          ambulanceIds:
            snapshot.ambulances.map(
              (ambulance) =>
                ambulance.id,
            ),

          ambulancesById,

          summary:
            snapshot.summary,
        });
      } catch (error) {
        if (
          get().snapshotRequestId !==
          requestId
        ) {
          return;
        }

        set({
          snapshotStatus: "error",

          snapshotError:
            error instanceof Error
              ? error.message
              : "The Dashboard data could not be loaded.",
        });
      }
    },

    applyFacilityOccupancyEvent:
  (occupancyEvent) => {
    set((state) => {
      const facilityId =
        String(
          occupancyEvent
            .facilityId,
        );

      const existingFacility =
        state.facilitiesById[
          facilityId
        ];

      /*
       * The event may belong to a facility outside the
       * currently selected governorate.
       */
      if (!existingFacility) {
        console.warn(
          [
            "Facility occupancy event ignored",
            `facility=${facilityId}`,
            "The facility is not present in the current dashboard snapshot.",
          ].join(" | "),
        );

        return {};
      }

      const previousSequenceNumber =
        Number(
          existingFacility
            .occupancy
            ?.sequenceNumber ??
          -1,
        );

      const incomingSequenceNumber =
        Number(
          occupancyEvent
            .sequenceNumber,
        );

      /*
       * Prevent duplicated or out-of-order readings.
       */
      if (
        incomingSequenceNumber <=
        previousSequenceNumber
      ) {
        console.warn(
          [
            "Stale facility occupancy event ignored",
            `facility=${facilityId}`,
            `previous=${previousSequenceNumber}`,
            `incoming=${incomingSequenceNumber}`,
          ].join(" | "),
        );

        return {};
      }

      const updatedFacility = {
        ...existingFacility,

        totalBeds:
          Number(
            occupancyEvent
              .totalBeds,
          ),

        occupancy: {
          eventId:
            occupancyEvent
              .eventId,

          sourceDeviceId:
            occupancyEvent
              .sourceDeviceId,

          sequenceNumber:
            incomingSequenceNumber,

          totalBeds:
            Number(
              occupancyEvent
                .totalBeds,
            ),

          occupiedBeds:
            Number(
              occupancyEvent
                .occupiedBeds,
            ),

          availableBeds:
            Number(
              occupancyEvent
                .availableBeds,
            ),

          occupancyPercentage:
            Number(
              occupancyEvent
                .occupancyPercentage,
            ),

          status:
            occupancyEvent
              .status,

          recordedAt:
            occupancyEvent
              .recordedAt,

          receivedAt:
            occupancyEvent
              .receivedAt,
        },
      };

      const nextFacilitiesById = {
        ...state
          .facilitiesById,

        [facilityId]:
          updatedFacility,
      };

      const visibleFacilities =
        state.facilityIds
          .map(
            (currentFacilityId) =>
              nextFacilitiesById[
                String(
                  currentFacilityId,
                )
              ],
          )
          .filter(Boolean);

      const facilitiesWithOccupancy =
        visibleFacilities.filter(
          (facility) =>
            Boolean(
              facility.occupancy,
            ),
        );

      const redFacilities =
        facilitiesWithOccupancy
          .filter(
            (facility) =>
              facility
                .occupancy
                .status ===
              "RED",
          )
          .length;

      console.log(
        [
          "Facility occupancy applied to Zustand",
          `facility=${facilityId}`,
          `sequence=${incomingSequenceNumber}`,
          `availableBeds=${occupancyEvent.availableBeds}`,
          `status=${occupancyEvent.status}`,
        ].join(" | "),
      );

      return {
        facilitiesById:
          nextFacilitiesById,

        generatedAt:
          occupancyEvent
            .receivedAt,

        summary: {
          ...state.summary,

          facilities: {
            ...state
              .summary
              .facilities,

            total:
              visibleFacilities
                .length,

            withOccupancyData:
              facilitiesWithOccupancy
                .length,

            withoutOccupancyData:
              visibleFacilities
                .length -
              facilitiesWithOccupancy
                .length,

            red:
              redFacilities,
          },
        },
      };
    });
  },

    applyAmbulanceRoutePoint:
  (routePoint) => {
    set((state) => {
      const ambulanceId =
        String(
          routePoint.ambulanceId,
        );

      const existingAmbulance =
        state.ambulancesById[
          ambulanceId
        ];

      if (!existingAmbulance) {
        return {};
      }

      const currentLocationTimestamp =
  existingAmbulance
    .lastLocationAt
    ? new Date(
        existingAmbulance
          .lastLocationAt,
      ).getTime()
    : 0;

const incomingLocationTimestamp =
  new Date(
    event.recordedAt,
  ).getTime();

if (
  Number.isFinite(
    currentLocationTimestamp,
  ) &&
  currentLocationTimestamp >
    incomingLocationTimestamp
) {
  return state;
}

const previousSequenceNumber =
  Number(
    existingAmbulance
      .lastSequenceNumber ??
    0,
  );

const incomingSequenceNumber =
  Number(
    event.sequenceNumber,
  );

if (
  incomingSequenceNumber <=
    previousSequenceNumber &&
  currentLocationTimestamp >=
    incomingLocationTimestamp
) {
  return state;
}

      /*
       * Never replace a newer ambulance location with
       * an older route point.
       */
      const currentTimestamp =
        existingAmbulance
          .lastLocationAt
          ? new Date(
              existingAmbulance
                .lastLocationAt,
            ).getTime()
          : 0;

      const routeTimestamp =
        new Date(
          routePoint.recordedAt,
        ).getTime();

      if (
        Number.isFinite(
          currentTimestamp,
        ) &&
        currentTimestamp >
          routeTimestamp
      ) {
        return {};
      }

      return {
        ambulancesById: {
          ...state
            .ambulancesById,

          [ambulanceId]: {
            ...existingAmbulance,

            location: {
              longitude:
                routePoint
                  .location
                  .longitude,

              latitude:
                routePoint
                  .location
                  .latitude,
            },

            lastLocationAt:
              routePoint
                .recordedAt,

            routeSequenceNumber:
              routePoint
                .sequenceNumber,

            updatedAt:
              routePoint
                .receivedAt,
          },
        },
      };
    });
  },

    applyAmbulanceStatusUpdated:
  (event) => {
    set((state) => {
      const ambulanceId =
        String(
          event.ambulanceId,
        );

      const existingAmbulance =
        state.ambulancesById[
          ambulanceId
        ];

      if (!existingAmbulance) {
        return {};
      }

      const ambulancesById = {
        ...state.ambulancesById,

        [ambulanceId]: {
          ...existingAmbulance,

          status:
            event.status,

          isOperational:
            event.isOperational,

          updatedAt:
            event.updatedAt,
        },
      };

      const ambulances =
        Object.values(
          ambulancesById,
        );

      const ambulanceSummary = {
        ...state
          .summary
          .ambulances,

        total:
          ambulances.length,

        available:
          ambulances.filter(
            (ambulance) =>
              ambulance.status ===
              "AVAILABLE",
          ).length,

        busy:
          ambulances.filter(
            (ambulance) =>
              ambulance.status ===
              "BUSY",
          ).length,

        offline:
          ambulances.filter(
            (ambulance) =>
              ambulance.status ===
              "OFFLINE",
          ).length,

        maintenance:
          ambulances.filter(
            (ambulance) =>
              ambulance.status ===
              "MAINTENANCE",
          ).length,
      };

      return {
        ambulancesById,

        summary: {
          ...state.summary,

          ambulances:
            ambulanceSummary,
        },
      };
    });
  },

    applyAmbulanceLocationEvent: (
      event,
    ) => {
      if (!event.currentStateUpdated) {
        return;
      }

      set((state) => {
        const existingAmbulance =
          state.ambulancesById[
            event.ambulanceId
          ];

        if (!existingAmbulance) {
          return state;
        }

        return {
          ambulancesById: {
            ...state.ambulancesById,

            [event.ambulanceId]: {
              ...existingAmbulance,

              status:
                event.status,

              isOperational:
                event.isOperational,

              location: {
                longitude:
                  event.longitude,

                latitude:
                  event.latitude,
              },

              lastLocationAt:
                event.recordedAt,

              lastSequenceNumber:
                event.sequenceNumber,
            },
          },
        };
      });
    },

    recoverMissedLiveReadings:
  async () => {
    if (
      activeRecoveryPromise
    ) {
      return activeRecoveryPromise;
    }

    activeRecoveryPromise =
      (async () => {
        set({
          recoveryStatus:
            "recovering",

          recoveryError:
            null,

          recoveredFacilityEvents:
            0,

          recoveredAmbulanceEvents:
            0,
        });

        try {
          /*
           * A Socket connection can become ready before the
           * initial Dashboard snapshot finishes.
           */
          if (
            get().facilityIds.length ===
              0 &&
            get().ambulanceIds.length ===
              0
          ) {
            await get()
              .loadDashboardSnapshot({
                governorateId:
                  get()
                    .requestedGovernorateId,

                force:
                  true,
              });
          }

          let facilityCheckpoints =
            buildFacilityCheckpoints(
              get(),
            );

          let ambulanceCheckpoints =
            buildAmbulanceCheckpoints(
              get(),
            );

          let recoveredFacilityEvents =
            0;

          let recoveredAmbulanceEvents =
            0;

          let lastRecoveryAt =
            new Date()
              .toISOString();

          for (
            let pageNumber = 1;
            pageNumber <=
              MAXIMUM_RECOVERY_PAGES;
            pageNumber += 1
          ) {
            const result =
              await fetchLiveOperationsRecovery({
                facilityCheckpoints,

                ambulanceCheckpoints,

                limitPerResource:
                  500,
              });

            lastRecoveryAt =
              result.generatedAt;

            for (
              const occupancyEvent of
              result.facility.events
            ) {
              get()
                .applyFacilityOccupancyEvent(
                  occupancyEvent,
                );
            }

            for (
              const locationEvent of
              result.ambulance.events
            ) {
              get()
                .applyAmbulanceLocationEvent(
                  locationEvent,
                );
            }

            recoveredFacilityEvents +=
              result.facility
                .events
                .length;

            recoveredAmbulanceEvents +=
              result.ambulance
                .events
                .length;

            facilityCheckpoints =
              advanceCheckpoints(
                facilityCheckpoints,
                result.facility.events,
                "facilityId",
              );

            ambulanceCheckpoints =
              advanceCheckpoints(
                ambulanceCheckpoints,
                result.ambulance.events,
                "ambulanceId",
              );

            const hasMore =
              result.facility
                .hasMore ||
              result.ambulance
                .hasMore;

            if (!hasMore) {
              break;
            }

            if (
              result.facility
                .events
                .length === 0 &&
              result.ambulance
                .events
                .length === 0
            ) {
              throw new Error(
                "Recovery reported additional pages without returning recovery events.",
              );
            }

            if (
              pageNumber ===
              MAXIMUM_RECOVERY_PAGES
            ) {
              throw new Error(
                "The live recovery exceeded the maximum number of pages.",
              );
            }
          }

          console.log(
            [
              "Live readings recovery completed",
              `facilityEvents=${recoveredFacilityEvents}`,
              `ambulanceEvents=${recoveredAmbulanceEvents}`,
            ].join(" | "),
          );

          set({
            recoveryStatus:
              "ready",

            recoveryError:
              null,

            recoveredFacilityEvents,

            recoveredAmbulanceEvents,

            lastRecoveryAt,
          });

          return {
            recoveredFacilityEvents,

            recoveredAmbulanceEvents,

            lastRecoveryAt,
          };
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Live readings recovery failed.";

          console.error(
            "Live readings recovery failed:",
            error,
          );

          set({
            recoveryStatus:
              "error",

            recoveryError:
              message,
          });

          throw error;
        } finally {
          activeRecoveryPromise =
            null;
        }
      })();

    return activeRecoveryPromise;
  },

    markSocketConnecting: () => {
      set({
        connectionStatus:
          "connecting",

        connectionMessage:
          "Establishing the secure live connection...",

        connectionError: null,

        disconnectReason: null,
      });
    },

    markSocketConnected: (
      socketId,
    ) => {
      set({
        connectionStatus:
          "connected",

        socketId,

        connectionMessage:
          "The secure transport connection is active.",

        lastConnectedAt:
          new Date().toISOString(),

        connectionError: null,

        disconnectReason: null,
      });
    },

    markSocketReady: (
      payload,
    ) => {
      set({
        connectionStatus:
          "connected",

        socketId:
          payload.socketId,

        socketUser:
          payload.user,

        connectionMessage:
          payload.message,

        recovered:
          Boolean(
            payload.recovered,
          ),

        lastConnectedAt:
          payload.connectedAt,

        connectionError: null,

        disconnectReason: null,
      });
    },

    markSocketReconnecting: (
      attemptNumber,
    ) => {
      set({
        connectionStatus:
          "reconnecting",

        connectionMessage:
          `Reconnecting to live operations. Attempt ${attemptNumber}...`,

        connectionError: null,
      });
    },

    markSocketDisconnected: (
      reason,
    ) => {
      set({
        connectionStatus:
          "disconnected",

        socketId: null,

        connectionMessage:
          "The live connection is currently disconnected.",

        lastDisconnectedAt:
          new Date().toISOString(),

        disconnectReason:
          reason ?? null,
      });
    },

    markSocketError: (
      error,
    ) => {
      const errorCode =
        error?.data?.code ??
        "SOCKET_CONNECTION_ERROR";

      set({
        connectionStatus:
          errorCode ===
          "UNAUTHENTICATED"
            ? "unauthorized"
            : "error",

        socketId: null,

        connectionMessage:
          error?.message ||
          "The secure live connection could not be established.",

        connectionError: {
          code: errorCode,

          message:
            error?.message ||
            "Socket.IO connection failed.",
        },
      });
    },

    resetSocketConnection: () => {
      set({
        ...initialSocketState,
      });
    },

    resetDashboardData: () => {
      set({
        ...initialDashboardState,

        ...initialRecoveryState,
      });
    },
  }));