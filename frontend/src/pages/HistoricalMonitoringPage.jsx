import {
    Activity,
    AlertTriangle,
    Ambulance,
    Building2,
    CalendarClock,
    CheckCircle2,
    Clock3,
    History,
    RefreshCw,
    Route,
    ShieldAlert,
  } from "lucide-react";
  
  import {
    useEffect,
    useState,
  } from "react";
  
  import SummaryCard from "../components/dashboard/SummaryCard.jsx";
  import FacilityOccupancyHistoryChart from "../components/history/FacilityOccupancyHistoryChart.jsx";
  import HistoricalDispatchReplayPanel from "../components/history/HistoricalDispatchReplayPanel.jsx";
  import SyriaOperationsMap from "../components/map/SyriaOperationsMap.jsx";
  
  import {
    useHistoryStore,
  } from "../stores/historystore.js";
  
  import {
    useLiveOperationsStore,
  } from "../stores/liveOperationsStore.js";
  
  import "../styles/dashboard.css";
  import "../styles/history.css";
  import "../styles/operations-map.css";
  
  const MAX_HISTORY_HOURS =
    48;
  
  function toDateTimeLocal(
    value,
  ) {
    if (!value) {
      return "";
    }
  
    const date =
      new Date(value);
  
    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return "";
    }
  
    const localDate =
      new Date(
        date.getTime() -
          date.getTimezoneOffset() *
            60 *
            1000,
      );
  
    return localDate
      .toISOString()
      .slice(
        0,
        16,
      );
  }
  
  function fromDateTimeLocal(
    value,
  ) {
    if (!value) {
      return null;
    }
  
    const date =
      new Date(value);
  
    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return null;
    }
  
    return date.toISOString();
  }
  
  function formatDateTime(
    value,
  ) {
    if (!value) {
      return "Not available";
    }
  
    const date =
      new Date(value);
  
    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return "Invalid date";
    }
  
    return new Intl.DateTimeFormat(
      "en-GB",
      {
        dateStyle:
          "medium",
  
        timeStyle:
          "short",
      },
    ).format(date);
  }
  
  function formatFacilityType(
    value,
  ) {
    return {
      CENTRAL_HOSPITAL:
        "Central Hospital",
  
      CLINIC:
        "Clinic",
  
      FIELD_MEDICAL_POINT:
        "Field Medical Point",
    }[value] ?? value;
  }
  
  function HistoricalMonitoringPage() {
    const status =
      useHistoryStore(
        (state) =>
          state.status,
      );
  
    const error =
      useHistoryStore(
        (state) =>
          state.error,
      );
  
    const filters =
      useHistoryStore(
        (state) =>
          state.filters,
      );
  
    const overview =
      useHistoryStore(
        (state) =>
          state.overview,
      );
  
    const snapshot =
      useHistoryStore(
        (state) =>
          state.snapshot,
      );
  
    const facilityHistory =
      useHistoryStore(
        (state) =>
          state.facilityHistory,
      );
  
    const emergencyHistory =
      useHistoryStore(
        (state) =>
          state.emergencyHistory,
      );
  
    const dispatchHistory =
      useHistoryStore(
        (state) =>
          state.dispatchHistory,
      );
  
    const setHistoryFilters =
      useHistoryStore(
        (state) =>
          state.setHistoryFilters,
      );
  
    const resetHistoryFilters =
      useHistoryStore(
        (state) =>
          state.resetHistoryFilters,
      );
  
    const loadHistoricalData =
      useHistoryStore(
        (state) =>
          state.loadHistoricalData,
      );
  
    const governorates =
      useLiveOperationsStore(
        (state) =>
          state.governorates,
      );
  
    const loadDashboardSnapshot =
      useLiveOperationsStore(
        (state) =>
          state.loadDashboardSnapshot,
      );
  
    const [
      draftFilters,
      setDraftFilters,
    ] = useState(() => ({
      from:
        toDateTimeLocal(
          filters.from,
        ),
  
      to:
        toDateTimeLocal(
          filters.to,
        ),
  
      snapshotAt:
        toDateTimeLocal(
          filters.snapshotAt,
        ),
  
      governorateId:
        filters.governorateId ??
        "",
    }));
  
    const [
      filterError,
      setFilterError,
    ] = useState(null);

    const [
      historicalReplayRoute,
      setHistoricalReplayRoute,
    ] = useState(null);
  
    useEffect(() => {
      if (
        governorates.length ===
        0
      ) {
        void loadDashboardSnapshot({
          governorateId:
            null,
        });
      }
    }, [
      governorates.length,
      loadDashboardSnapshot,
    ]);
  
    useEffect(() => {
      void loadHistoricalData();
    }, [
      loadHistoricalData,
    ]);
  
    function validateDraftFilters() {
      const from =
        fromDateTimeLocal(
          draftFilters.from,
        );
  
      const to =
        fromDateTimeLocal(
          draftFilters.to,
        );
  
      const snapshotAt =
        fromDateTimeLocal(
          draftFilters
            .snapshotAt,
        );
  
      if (
        !from ||
        !to ||
        !snapshotAt
      ) {
        return {
          error:
            "Select a valid start time, end time and snapshot time.",
        };
      }
  
      const fromTime =
        new Date(from)
          .getTime();
  
      const toTime =
        new Date(to)
          .getTime();
  
      const snapshotTime =
        new Date(
          snapshotAt,
        ).getTime();
  
      const now =
        Date.now();
  
      if (
        fromTime >=
        toTime
      ) {
        return {
          error:
            "The start time must be earlier than the end time.",
        };
      }
  
      const rangeHours =
        (
          toTime -
          fromTime
        ) /
        (
          60 *
          60 *
          1000
        );
  
      if (
        rangeHours >
        MAX_HISTORY_HOURS
      ) {
        return {
          error:
            `The selected range cannot exceed ${MAX_HISTORY_HOURS} hours.`,
        };
      }
  
      if (
        toTime >
        now +
          60 *
            1000 ||
        snapshotTime >
        now +
          60 *
            1000
      ) {
        return {
          error:
            "Historical times cannot be in the future.",
        };
      }
  
      const earliestTime =
        now -
        MAX_HISTORY_HOURS *
          60 *
          60 *
          1000;
  
      if (
        fromTime <
          earliestTime ||
        snapshotTime <
          earliestTime
      ) {
        return {
          error:
            `Historical data is retained for the latest ${MAX_HISTORY_HOURS} hours only.`,
        };
      }
  
      return {
        from,
        to,
        snapshotAt,
      };
    }
  
    async function handleApplyFilters(
      event,
    ) {
      event.preventDefault();
  
      const validation =
        validateDraftFilters();
  
      if (
        validation.error
      ) {
        setFilterError(
          validation.error,
        );
  
        return;
      }
  
      setFilterError(
        null,
      );

      setHistoricalReplayRoute(
        null,
      );
  
      setHistoryFilters({
        from:
          validation.from,
  
        to:
          validation.to,
  
        snapshotAt:
          validation
            .snapshotAt,
  
        governorateId:
          draftFilters
            .governorateId ||
          null,
      });
  
      await useHistoryStore
        .getState()
        .loadHistoricalData({
          force:
            true,
        });
    }
  
    async function handleReset() {
      setHistoricalReplayRoute(
        null,
      );
      resetHistoryFilters();
  
      const nextFilters =
        useHistoryStore
          .getState()
          .filters;
  
      setDraftFilters({
        from:
          toDateTimeLocal(
            nextFilters.from,
          ),
  
        to:
          toDateTimeLocal(
            nextFilters.to,
          ),
  
        snapshotAt:
          toDateTimeLocal(
            nextFilters
              .snapshotAt,
          ),
  
        governorateId:
          nextFilters
            .governorateId ??
          "",
      });
  
      setFilterError(
        null,
      );
  
      await useHistoryStore
        .getState()
        .loadHistoricalData({
          force:
            true,
        });
    }
  
    const isLoading =
      status ===
      "loading";
  
    const overviewSummary =
      overview?.summary;
  
    const snapshotSummary =
      snapshot?.summary;
  
    const maxDateTime =
      toDateTimeLocal(
        new Date()
          .toISOString(),
      );
  
    return (
      <div className="operations-dashboard historical-monitoring-page">
        <header className="operations-dashboard__header">
          <div>
            <span className="operations-dashboard__eyebrow">
              Historical intelligence
            </span>
  
            <h1>
              Historical Monitoring
            </h1>
  
            <p>
              Review medical capacity,
              ambulance activity,
              emergency cases and dispatch
              operations from the latest
              48-hour retention window.
            </p>
          </div>
  
          <div className="history-retention-badge">
            <History size={18} />
  
            <div>
              <strong>
                48-hour retention
              </strong>
  
              <span>
                Time-machine reconstruction
              </span>
            </div>
          </div>
        </header>
  
        <form
          className="history-filter-panel"
          onSubmit={
            handleApplyFilters
          }
        >
          <div className="history-filter-panel__heading">
            <CalendarClock
              size={21}
            />
  
            <div>
              <span>
                Historical range
              </span>
  
              <h2>
                Date and Time Filters
              </h2>
            </div>
          </div>
  
          <div className="history-filter-grid">
            <label>
              <span>
                From
              </span>
  
              <input
                type="datetime-local"
                value={
                  draftFilters.from
                }
                max={
                  maxDateTime
                }
                onChange={(event) => {
                  setDraftFilters(
                    (
                      current,
                    ) => ({
                      ...current,
  
                      from:
                        event
                          .target
                          .value,
                    }),
                  );
                }}
              />
            </label>
  
            <label>
              <span>
                To
              </span>
  
              <input
                type="datetime-local"
                value={
                  draftFilters.to
                }
                max={
                  maxDateTime
                }
                onChange={(event) => {
                  setDraftFilters(
                    (
                      current,
                    ) => ({
                      ...current,
  
                      to:
                        event
                          .target
                          .value,
                    }),
                  );
                }}
              />
            </label>
  
            <label>
              <span>
                Snapshot time
              </span>
  
              <input
                type="datetime-local"
                value={
                  draftFilters
                    .snapshotAt
                }
                max={
                  maxDateTime
                }
                onChange={(event) => {
                  setDraftFilters(
                    (
                      current,
                    ) => ({
                      ...current,
  
                      snapshotAt:
                        event
                          .target
                          .value,
                    }),
                  );
                }}
              />
            </label>
  
            <label>
              <span>
                Governorate
              </span>
  
              <select
                value={
                  draftFilters
                    .governorateId
                }
                onChange={(event) => {
                  setDraftFilters(
                    (
                      current,
                    ) => ({
                      ...current,
  
                      governorateId:
                        event
                          .target
                          .value,
                    }),
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
                      {
                        governorate.name
                      }
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>
  
          {(filterError ||
            error) && (
            <div className="history-filter-error">
              <ShieldAlert
                size={17}
              />
  
              {filterError ||
                error}
            </div>
          )}
  
          <div className="history-filter-actions">
            <button
              type="button"
              className="history-filter-button history-filter-button--secondary"
              onClick={
                handleReset
              }
              disabled={
                isLoading
              }
            >
              Reset to 24 Hours
            </button>
  
            <button
              type="submit"
              className="history-filter-button history-filter-button--primary"
              disabled={
                isLoading
              }
            >
              <RefreshCw
                size={16}
                className={
                  isLoading
                    ? "dashboard-refresh__spinner"
                    : undefined
                }
              />
  
              {isLoading
                ? "Loading History..."
                : "Apply Historical View"}
            </button>
          </div>
        </form>
  
        <section className="summary-grid">
          <SummaryCard
            label="Average Occupancy"
            value={
              overviewSummary
                ? `${overviewSummary.facilities.averageOccupancyPercentage}%`
                : "—"
            }
            helper={`${overviewSummary?.facilities.occupancyReadingCount ?? 0} historical readings`}
            icon={Building2}
            tone="blue"
          />
  
          <SummaryCard
            label="Tracked Ambulances"
            value={
              overviewSummary
                ?.ambulances
                .trackedAmbulanceCount ??
              0
            }
            helper={`${overviewSummary?.ambulances.locationReadingCount ?? 0} location readings`}
            icon={Ambulance}
            tone="teal"
          />
  
          <SummaryCard
            label="Emergency Cases"
            value={
              overviewSummary
                ?.emergencies
                .total ??
              0
            }
            helper={`${overviewSummary?.emergencies.resolved ?? 0} resolved in range`}
            icon={AlertTriangle}
            tone="red"
          />
  
          <SummaryCard
            label="Completed Dispatches"
            value={
              overviewSummary
                ?.dispatches
                .completed ??
              0
            }
            helper={`${overviewSummary?.dispatches.routePointCount ?? 0} stored route points`}
            icon={Route}
            tone="green"
          />
        </section>
  
        <section className="history-snapshot-heading">
          <div>
            <Clock3 size={20} />
  
            <div>
              <span>
                Time Machine
              </span>
  
              <h2>
                Operational Snapshot
              </h2>
            </div>
          </div>
  
          <strong>
            {snapshot
              ? formatDateTime(
                  snapshot
                    .snapshotAt,
                )
              : "Waiting for snapshot"}
          </strong>
        </section>
        <HistoricalDispatchReplayPanel
  dispatches={
    dispatchHistory
      ?.dispatches ??
    []
  }
  onReplayRouteChange={
    setHistoricalReplayRoute
  }
/>
  
<SyriaOperationsMap
  mode="historical"
  facilities={
    snapshot
      ?.facilities ??
    []
  }
  ambulances={
    snapshot
      ?.ambulances ??
    []
  }
  emergencies={
    snapshot
      ?.emergencies ??
    []
  }
  dispatchRoutes={
    historicalReplayRoute
      ? [
          historicalReplayRoute,
        ]
      : []
  }
  generatedAt={
    snapshot
      ?.snapshotAt ??
    null
  }
  selectedGovernorateId={
    filters
      .governorateId
  }
/>
        <section className="history-snapshot-stat-grid">
          <div>
            <Building2 />
  
            <span>
              Facilities with data
            </span>
  
            <strong>
              {snapshotSummary
                ?.facilities
                .withOccupancyData ??
                0}
            </strong>
          </div>
  
          <div>
            <Activity />
  
            <span>
              High occupancy
            </span>
  
            <strong>
              {snapshotSummary
                ?.facilities
                .red ??
                0}
            </strong>
          </div>
  
          <div>
            <Ambulance />
  
            <span>
              Busy ambulances
            </span>
  
            <strong>
              {snapshotSummary
                ?.ambulances
                .busy ??
                0}
            </strong>
          </div>
  
          <div>
            <CheckCircle2 />
  
            <span>
              Active dispatches
            </span>
  
            <strong>
              {snapshotSummary
                ?.dispatches
                .active ??
                0}
            </strong>
          </div>
        </section>
  
        <FacilityOccupancyHistoryChart
          history={
            facilityHistory
          }
        />
  
        <section className="history-card">
          <header className="history-card__header">
            <div>
              <span>
                Snapshot capacity
              </span>
  
              <h2>
                Facility Status at Selected Time
              </h2>
  
              <p>
                The last occupancy reading
                available before the snapshot
                time.
              </p>
            </div>
  
            <strong className="history-card__counter">
              {snapshot
                ?.facilities
                .length ??
                0}
              {" "}
              facilities
            </strong>
          </header>
  
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>
                    Facility
                  </th>
  
                  <th>
                    Governorate
                  </th>
  
                  <th>
                    Available
                  </th>
  
                  <th>
                    Occupancy
                  </th>
  
                  <th>
                    Status
                  </th>
  
                  <th>
                    Reading time
                  </th>
                </tr>
              </thead>
  
              <tbody>
                {(snapshot
                  ?.facilities ??
                  []
                ).map(
                  (facility) => (
                    <tr
                      key={
                        facility.id
                      }
                    >
                      <td>
                        <strong>
                          {
                            facility.name
                          }
                        </strong>
  
                        <span>
                          {formatFacilityType(
                            facility
                              .facilityType,
                          )}
                        </span>
                      </td>
  
                      <td>
                        {
                          facility
                            .governorate
                            .name
                        }
                      </td>
  
                      <td>
                        {facility
                          .occupancy
                          ?.availableBeds ??
                          "No data"}
                      </td>
  
                      <td>
                        {facility
                          .occupancy
                          ? `${facility.occupancy.occupancyPercentage.toFixed(
                              1,
                            )}%`
                          : "No data"}
                      </td>
  
                      <td>
                        <span
                          className={`history-status history-status--${(
                            facility
                              .occupancy
                              ?.status ??
                            "UNKNOWN"
                          ).toLowerCase()}`}
                        >
                          {facility
                            .occupancy
                            ?.status ??
                            "UNKNOWN"}
                        </span>
                      </td>
  
                      <td>
                        {formatDateTime(
                          facility
                            .occupancy
                            ?.recordedAt,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>
  
        <section className="history-card">
          <header className="history-card__header">
            <div>
              <span>
                Emergency activity
              </span>
  
              <h2>
                Emergency Case History
              </h2>
  
              <p>
                Emergency cases reported
                during the selected range.
              </p>
            </div>
  
            <strong className="history-card__counter">
              {emergencyHistory
                ?.count ??
                0}
              {" "}
              cases
            </strong>
          </header>
  
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>
                    Case
                  </th>
  
                  <th>
                    Governorate
                  </th>
  
                  <th>
                    Status
                  </th>
  
                  <th>
                    Dispatches
                  </th>
  
                  <th>
                    Reported
                  </th>
  
                  <th>
                    Resolved
                  </th>
                </tr>
              </thead>
  
              <tbody>
                {(emergencyHistory
                  ?.emergencies ??
                  []
                ).map(
                  (emergency) => (
                    <tr
                      key={
                        emergency.id
                      }
                    >
                      <td>
                        <strong>
                          {
                            emergency
                              .caseNumber
                          }
                        </strong>
  
                        <span>
                          {
                            emergency
                              .summary
                          }
                        </span>
                      </td>
  
                      <td>
                        {
                          emergency
                            .governorate
                            .name
                        }
                      </td>
  
                      <td>
                        <span
                          className={`history-status history-status--${emergency.status.toLowerCase()}`}
                        >
                          {
                            emergency
                              .status
                          }
                        </span>
                      </td>
  
                      <td>
                        {
                          emergency
                            .dispatchCount
                        }
                      </td>
  
                      <td>
                        {formatDateTime(
                          emergency
                            .reportedAt,
                        )}
                      </td>
  
                      <td>
                        {formatDateTime(
                          emergency
                            .resolvedAt,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>
  
        <section className="history-card">
          <header className="history-card__header">
            <div>
              <span>
                Response operations
              </span>
  
              <h2>
                Dispatch History
              </h2>
  
              <p>
                Ambulance assignments and
                lifecycle outcomes during
                the selected range.
              </p>
            </div>
  
            <strong className="history-card__counter">
              {dispatchHistory
                ?.count ??
                0}
              {" "}
              dispatches
            </strong>
          </header>
  
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>
                    Dispatch
                  </th>
  
                  <th>
                    Ambulance
                  </th>
  
                  <th>
                    Emergency
                  </th>
  
                  <th>
                    Status
                  </th>
  
                  <th>
                    Distance
                  </th>
  
                  <th>
                    Route points
                  </th>
  
                  <th>
                    Assigned
                  </th>
                </tr>
              </thead>
  
              <tbody>
                {(dispatchHistory
                  ?.dispatches ??
                  []
                ).map(
                  (dispatch) => (
                    <tr
                      key={
                        dispatch.id
                      }
                    >
                      <td>
                        <strong>
                          {
                            dispatch
                              .dispatchNumber
                          }
                        </strong>
  
                        <span>
                          {
                            dispatch
                              .emergencyCase
                              .governorate
                              .name
                          }
                        </span>
                      </td>
  
                      <td>
                        {
                          dispatch
                            .ambulance
                            .code
                        }
                      </td>
  
                      <td>
                        {
                          dispatch
                            .emergencyCase
                            .caseNumber
                        }
                      </td>
  
                      <td>
                        <span
                          className={`history-status history-status--${dispatch.status.toLowerCase()}`}
                        >
                          {
                            dispatch
                              .status
                          }
                        </span>
                      </td>
  
                      <td>
                        {
                          dispatch
                            .assignedDistanceKilometers
                        }
                        {" "}
                        km
                      </td>
  
                      <td>
                        {
                          dispatch
                            .storedRoutePointCount
                        }
                      </td>
  
                      <td>
                        {formatDateTime(
                          dispatch
                            .assignedAt,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>
  
        <footer className="dashboard-generated-at">
          Historical data generated:{" "}
  
          {overview
            ? formatDateTime(
                overview
                  .generatedAt,
              )
            : "Waiting for server"}
        </footer>
      </div>
    );
  }
  
  export default HistoricalMonitoringPage;