import {
  AlertTriangle,
  Ambulance,
  BedDouble,
  Building2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import {
  useEffect,
} from "react";

import AlertsPanel from "../components/alerts/AlertsPanel.jsx";
import AmbulanceStatusPanel from "../components/ambulances/AmbulanceStatusPanel.jsx";
import SummaryCard from "../components/dashboard/SummaryCard.jsx";
import DispatchOperationsPanel from "../components/dispatch/DispatchOperationsPanel.jsx";
import EmergencyCaseForm from "../components/emergencies/EmergencyCaseForm.jsx";
import FacilityOccupancyPanel from "../components/facilities/FacilityOccupancyPanel.jsx";
import SyriaOperationsMap from "../components/map/SyriaOperationsMap.jsx";
import SimulationControlPanel from "../components/simulation/SimulationControlPanel.jsx";
import {
  useDispatchOperationsStore,
} from "../stores/dispatchOperationsStore.js";

import {
  useDispatchRouteStore,
} from "../stores/dispatchRouteStore.js";

import {
  useEmergencyOperationsStore,
} from "../stores/emergencyOperationsStore.js";

import {
  useLiveOperationsStore,
} from "../stores/liveOperationsStore.js";

import {
  useMapUiStore,
} from "../stores/mapUiStore.js";

import "../styles/dashboard.css";
import "../styles/emergency-operations.css";
import "../styles/dispatch-operations.css";

function LiveOperationsDashboardPage() {
  /*
   * ==========================================================
   * Map UI state
   * ==========================================================
   */

  const selectedGovernorateId =
    useMapUiStore(
      (state) =>
        state.selectedGovernorateId,
    );

  const setSelectedGovernorateId =
    useMapUiStore(
      (state) =>
        state.setSelectedGovernorateId,
    );

  /*
   * ==========================================================
   * Live Dashboard state
   * ==========================================================
   */

  const loadDashboardSnapshot =
    useLiveOperationsStore(
      (state) =>
        state.loadDashboardSnapshot,
    );

  const snapshotStatus =
    useLiveOperationsStore(
      (state) =>
        state.snapshotStatus,
    );

  const snapshotError =
    useLiveOperationsStore(
      (state) =>
        state.snapshotError,
    );

  const generatedAt =
    useLiveOperationsStore(
      (state) =>
        state.generatedAt,
    );

  const governorates =
    useLiveOperationsStore(
      (state) =>
        state.governorates,
    );

  const facilityIds =
    useLiveOperationsStore(
      (state) =>
        state.facilityIds,
    );

  const facilitiesById =
    useLiveOperationsStore(
      (state) =>
        state.facilitiesById,
    );

  const ambulanceIds =
    useLiveOperationsStore(
      (state) =>
        state.ambulanceIds,
    );

  const ambulancesById =
    useLiveOperationsStore(
      (state) =>
        state.ambulancesById,
    );

  const summary =
    useLiveOperationsStore(
      (state) =>
        state.summary,
    );

  /*
   * ==========================================================
   * Emergency operations state
   * ==========================================================
   */

  const loadOperationalData =
    useEmergencyOperationsStore(
      (state) =>
        state.loadOperationalData,
    );

  const emergencyOperationsStatus =
    useEmergencyOperationsStore(
      (state) =>
        state.status,
    );

  const emergencyOperationsError =
    useEmergencyOperationsStore(
      (state) =>
        state.error,
    );

  const emergencyIds =
    useEmergencyOperationsStore(
      (state) =>
        state.emergencyIds,
    );

  const emergenciesById =
    useEmergencyOperationsStore(
      (state) =>
        state.emergenciesById,
    );

  /*
   * ==========================================================
   * Dispatch operations state
   * ==========================================================
   */

  const loadDispatchOperations =
    useDispatchOperationsStore(
      (state) =>
        state.loadDispatchOperations,
    );

  const dispatchOperationsStatus =
    useDispatchOperationsStore(
      (state) =>
        state.status,
    );

  const dispatchIds =
    useDispatchOperationsStore(
      (state) =>
        state.dispatchIds,
    );

  const dispatchesById =
    useDispatchOperationsStore(
      (state) =>
        state.dispatchesById,
    );

  /*
   * ==========================================================
   * Dispatch route state
   * ==========================================================
   */

  const routesByDispatchId =
    useDispatchRouteStore(
      (state) =>
        state.routesByDispatchId,
    );

  const loadDispatchRoute =
    useDispatchRouteStore(
      (state) =>
        state.loadDispatchRoute,
    );

  /*
   * ==========================================================
   * Convert normalized Zustand data into arrays for UI
   * ==========================================================
   */

  const facilities =
    facilityIds
      .map(
        (facilityId) =>
          facilitiesById[
            facilityId
          ],
      )
      .filter(Boolean);

  const ambulances =
    ambulanceIds
      .map(
        (ambulanceId) =>
          ambulancesById[
            ambulanceId
          ],
      )
      .filter(Boolean);

  const emergencies =
    emergencyIds
      .map(
        (emergencyId) =>
          emergenciesById[
            emergencyId
          ],
      )
      .filter(Boolean);

  /*
   * Only EN_ROUTE and ARRIVED dispatches can have an active
   * route that should appear on the operations map.
   */
  const routeEligibleDispatches =
    dispatchIds
      .map((dispatchId) => {
        return dispatchesById[
          dispatchId
        ];
      })
      .filter((dispatch) => {
        return (
          dispatch &&
          (
            dispatch.status ===
              "EN_ROUTE" ||
            dispatch.status ===
              "ARRIVED"
          )
        );
      });

  /*
   * This stable string is used as a useEffect dependency.
   *
   * Using the routeEligibleDispatches array directly would
   * create a new array during each render.
   */
  const routeEligibleDispatchIdsKey =
    routeEligibleDispatches
      .map((dispatch) =>
        String(
          dispatch.id,
        ),
      )
      .join(",");

  /*
   * Convert normalized route points into ordered arrays that
   * React Leaflet can use to draw each Polyline.
   */
  const dispatchRoutes =
    routeEligibleDispatches
      .map((dispatch) => {
        const dispatchId =
          String(
            dispatch.id,
          );

        const routeState =
          routesByDispatchId[
            dispatchId
          ];

        const points =
          routeState
            ?.sequenceNumbers
            ?.map(
              (sequenceNumber) =>
                routeState
                  .pointsBySequence[
                  sequenceNumber
                ],
            )
            .filter(Boolean) ??
          [];

        return {
          dispatchId,

          dispatchNumber:
            dispatch
              .dispatchNumber,

          ambulanceCode:
            dispatch
              .ambulance
              ?.code ??
            "Unknown ambulance",

          status:
            dispatch.status,

          lastSequence:
            routeState
              ?.lastSequence ??
            dispatch
              .lastRouteSequenceNumber ??
            0,

          points,
        };
      })
      .filter(
        (route) =>
          route.points.length >
          0,
      );

  /*
   * ==========================================================
   * Initial data loading
   * ==========================================================
   */

  /*
   * Load medical facilities and ambulances when:
   *
   * - The page opens.
   * - The selected governorate changes.
   */
  useEffect(() => {
    void loadDashboardSnapshot({
      governorateId:
        selectedGovernorateId,
    });
  }, [
    loadDashboardSnapshot,
    selectedGovernorateId,
  ]);

  /*
   * Load emergency cases and alerts when:
   *
   * - The page opens.
   * - The selected governorate changes.
   *
   * Emergency cases are filtered by governorate.
   * Alerts remain operationally visible across the Dashboard.
   */
  useEffect(() => {
    void loadOperationalData({
      governorateId:
        selectedGovernorateId,
    });
  }, [
    loadOperationalData,
    selectedGovernorateId,
  ]);

  /*
   * Load recommendations and active dispatches when:
   *
   * - The page opens.
   * - The selected governorate changes.
   * - The list of active emergencies changes.
   */
  useEffect(() => {
    void loadDispatchOperations({
      governorateId:
        selectedGovernorateId,

      emergencyIds,
    });
  }, [
    loadDispatchOperations,
    selectedGovernorateId,
    emergencyIds,
  ]);

  /*
   * Load stored route points for every active dispatch that
   * has already started moving.
   */
  useEffect(() => {
    if (
      !routeEligibleDispatchIdsKey
    ) {
      return;
    }

    const dispatchIdsToLoad =
      routeEligibleDispatchIdsKey
        .split(",")
        .filter(Boolean);

    for (
      const dispatchId of
      dispatchIdsToLoad
    ) {
      void loadDispatchRoute(
        dispatchId,
      ).catch((error) => {
        console.error(
          `Failed to load route for dispatch ${dispatchId}:`,
          error,
        );
      });
    }
  }, [
    loadDispatchRoute,
    routeEligibleDispatchIdsKey,
  ]);

  /*
   * ==========================================================
   * Manual refresh
   * ==========================================================
   */

  /*
   * Refresh all Dashboard resources, not only the facility
   * and ambulance snapshot.
   */
  async function handleRefresh() {
    await Promise.all([
      loadDashboardSnapshot({
        governorateId:
          selectedGovernorateId,

        force:
          true,
      }),

      loadOperationalData({
        governorateId:
          selectedGovernorateId,

        force:
          true,
      }),

      loadDispatchOperations({
        governorateId:
          selectedGovernorateId,

        emergencyIds,

        force:
          true,
      }),
    ]);

    /*
     * Read the updated dispatch state after the three main
     * requests finish.
     *
     * Route points are then reloaded from sequence zero so the
     * manual Refresh button performs a full synchronization.
     */
    const latestDispatchState =
      useDispatchOperationsStore
        .getState();

    const latestRouteStore =
      useDispatchRouteStore
        .getState();

    const activeRouteDispatches =
      latestDispatchState
        .dispatchIds
        .map(
          (dispatchId) =>
            latestDispatchState
              .dispatchesById[
              dispatchId
            ],
        )
        .filter((dispatch) => {
          return (
            dispatch &&
            (
              dispatch.status ===
                "EN_ROUTE" ||
              dispatch.status ===
                "ARRIVED"
            )
          );
        });

    await Promise.all(
      activeRouteDispatches.map(
        (dispatch) =>
          latestRouteStore
            .loadDispatchRoute(
              dispatch.id,
              {
                force:
                  true,
              },
            )
            .catch((error) => {
              console.error(
                `Failed to refresh route for dispatch ${dispatch.id}:`,
                error,
              );

              return null;
            }),
      ),
    );
  }

  /*
   * ==========================================================
   * Derived Dashboard values
   * ==========================================================
   */

  const isLoading =
    snapshotStatus ===
      "loading" ||
    emergencyOperationsStatus ===
      "loading" ||
    dispatchOperationsStatus ===
      "loading";

  const availableBeds =
    facilities.reduce(
      (
        totalAvailableBeds,
        facility,
      ) => {
        return (
          totalAvailableBeds +
          (
            facility
              .occupancy
              ?.availableBeds ??
            0
          )
        );
      },
      0,
    );

  return (
    <div className="operations-dashboard">
      <header className="operations-dashboard__header">
        <div>
          <span className="operations-dashboard__eyebrow">
            Real-time command center
          </span>

          <h1>
            Live Operations
          </h1>

          <p>
            Monitor medical capacity,
            ambulance availability,
            emergency cases and
            operational resources across
            Syria.
          </p>
        </div>

        <div className="operations-dashboard__actions">
          <label className="dashboard-filter">
            <span>
              Governorate
            </span>

            <select
              value={
                selectedGovernorateId ??
                ""
              }
              onChange={(event) => {
                setSelectedGovernorateId(
                  event.target.value ||
                    null,
                );
              }}
            >
              <option value="">
                All governorates
              </option>

              {governorates.map(
                (governorate) => (
                  <option
                    key={
                      governorate.id
                    }
                    value={
                      governorate.id
                    }
                  >
                    {governorate.name}
                  </option>
                ),
              )}
            </select>
          </label>

          <button
            type="button"
            className="dashboard-refresh"
            onClick={
              handleRefresh
            }
            disabled={
              isLoading
            }
          >
            <RefreshCw
              size={17}
              className={
                isLoading
                  ? "dashboard-refresh__spinner"
                  : undefined
              }
            />

            Refresh
          </button>
        </div>
      </header>

      {snapshotError && (
        <div className="dashboard-error">
          <ShieldAlert size={20} />

          <div>
            <strong>
              Dashboard data could not
              be loaded
            </strong>

            <span>
              {snapshotError}
            </span>
          </div>
        </div>
      )}

      {emergencyOperationsError && (
        <div className="dashboard-error">
          <ShieldAlert size={20} />

          <div>
            <strong>
              Emergency operations could
              not be loaded
            </strong>

            <span>
              {
                emergencyOperationsError
              }
            </span>
          </div>
        </div>
      )}
<SimulationControlPanel
  onResetComplete={
    handleRefresh
  }
/>
      <section className="summary-grid">
        <SummaryCard
          label="Medical Facilities"
          value={
            summary.facilities.total
          }
          helper={`${summary.facilities.withoutOccupancyData} waiting for occupancy data`}
          icon={Building2}
          tone="blue"
        />

        <SummaryCard
          label="High Occupancy"
          value={
            summary.facilities.red
          }
          helper="Facilities above 90% occupancy"
          icon={AlertTriangle}
          tone="red"
        />

        <SummaryCard
          label="Available Beds"
          value={
            availableBeds
          }
          helper="Across facilities with live data"
          icon={BedDouble}
          tone="green"
        />

        <SummaryCard
          label="Available Ambulances"
          value={
            summary
              .ambulances
              .available
          }
          helper={`${summary.ambulances.busy} currently busy`}
          icon={Ambulance}
          tone="teal"
        />
      </section>

      <SyriaOperationsMap
        facilities={
          facilities
        }
        ambulances={
          ambulances
        }
        emergencies={
          emergencies
        }
        dispatchRoutes={
          dispatchRoutes
        }
        generatedAt={
          generatedAt
        }
        selectedGovernorateId={
          selectedGovernorateId
        }
      />

      <div className="emergency-operations-grid">
        <EmergencyCaseForm />

        <AlertsPanel />
      </div>

      <DispatchOperationsPanel
        emergencies={
          emergencies
        }
      />

      <div className="dashboard-content-grid">
        <FacilityOccupancyPanel
          facilities={
            facilities
          }
        />

        <AmbulanceStatusPanel
          ambulances={
            ambulances
          }
        />
      </div>

      <footer className="dashboard-generated-at">
        Snapshot generated:{" "}

        {generatedAt
          ? new Intl.DateTimeFormat(
              "en-GB",
              {
                dateStyle:
                  "medium",

                timeStyle:
                  "medium",
              },
            ).format(
              new Date(
                generatedAt,
              ),
            )
          : "Waiting for server"}
      </footer>
    </div>
  );
}

export default LiveOperationsDashboardPage;