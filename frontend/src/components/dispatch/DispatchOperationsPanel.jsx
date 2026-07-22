import {
  Ambulance,
  CheckCircle2,
  Clock3,
  MapPin,
  Navigation,
  Route,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import {
  useDispatchOperationsStore,
} from "../../stores/dispatchOperationsStore.js";

import DevRouteStreamControls from "./DevRouteStreamControls.jsx";

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

function DispatchOperationsPanel({
  emergencies = [],
}) {
  const [
    rejectionReasons,
    setRejectionReasons,
  ] = useState({});

  const status =
    useDispatchOperationsStore(
      (state) =>
        state.status,
    );

  const error =
    useDispatchOperationsStore(
      (state) =>
        state.error,
    );

  const actionError =
    useDispatchOperationsStore(
      (state) =>
        state.actionError,
    );

  const recommendationsById =
    useDispatchOperationsStore(
      (state) =>
        state.recommendationsById,
    );

  const recommendationIdByEmergencyId =
    useDispatchOperationsStore(
      (state) =>
        state
          .recommendationIdByEmergencyId,
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

  const generatingEmergencyId =
    useDispatchOperationsStore(
      (state) =>
        state.generatingEmergencyId,
    );

  const confirmingRecommendationId =
    useDispatchOperationsStore(
      (state) =>
        state
          .confirmingRecommendationId,
    );

  const rejectingRecommendationId =
    useDispatchOperationsStore(
      (state) =>
        state
          .rejectingRecommendationId,
    );

  const lifecycleActionsByDispatchId =
    useDispatchOperationsStore(
      (state) =>
        state
          .lifecycleActionsByDispatchId,
    );

  const generateRecommendation =
    useDispatchOperationsStore(
      (state) =>
        state.generateRecommendation,
    );

  const confirmRecommendation =
    useDispatchOperationsStore(
      (state) =>
        state.confirmRecommendation,
    );

  const rejectRecommendation =
    useDispatchOperationsStore(
      (state) =>
        state.rejectRecommendation,
    );

  const startDispatch =
    useDispatchOperationsStore(
      (state) =>
        state.startDispatch,
    );

  const markDispatchArrived =
    useDispatchOperationsStore(
      (state) =>
        state.markDispatchArrived,
    );

  const completeDispatch =
    useDispatchOperationsStore(
      (state) =>
        state.completeDispatch,
    );

  const dispatchByEmergencyId =
    useMemo(() => {
      const result = {};

      for (
        const dispatchId of
        dispatchIds
      ) {
        const dispatch =
          dispatchesById[
            dispatchId
          ];

        if (!dispatch) {
          continue;
        }

        result[
          dispatch
            .emergencyCase
            .id
        ] = dispatch;
      }

      return result;
    }, [
      dispatchIds,
      dispatchesById,
    ]);

  async function handleGenerate(
    emergencyId,
  ) {
    try {
      await generateRecommendation(
        emergencyId,
      );
    } catch {
      // Zustand displays the error.
    }
  }

  async function handleConfirm(
    recommendationId,
  ) {
    try {
      await confirmRecommendation(
        recommendationId,
      );
    } catch {
      // Zustand displays the error.
    }
  }

  async function handleReject(
    recommendationId,
  ) {
    const reason =
      rejectionReasons[
        recommendationId
      ]?.trim();

    if (
      !reason ||
      reason.length < 5
    ) {
      return;
    }

    try {
      await rejectRecommendation(
        recommendationId,
        reason,
      );

      setRejectionReasons(
        (current) => ({
          ...current,

          [recommendationId]:
            "",
        }),
      );
    } catch {
      // Zustand displays the error.
    }
  }

  async function handleStartDispatch(
    dispatchId,
  ) {
    try {
      await startDispatch(
        dispatchId,
      );
    } catch {
      // Zustand displays the error.
    }
  }

  async function handleMarkArrived(
    dispatchId,
  ) {
    try {
      await markDispatchArrived(
        dispatchId,
      );
    } catch {
      // Zustand displays the error.
    }
  }

  async function handleCompleteDispatch(
    dispatchId,
  ) {
    try {
      await completeDispatch(
        dispatchId,
      );
    } catch {
      // Zustand displays the error.
    }
  }

  return (
    <section className="dispatch-panel">
      <header className="dispatch-panel__header">
        <div className="dispatch-panel__header-icon">
          <Route size={21} />
        </div>

        <div>
          <span>
            Dispatch workflow
          </span>

          <h2>
            Ambulance Dispatch Operations
          </h2>

          <p>
            Generate the nearest eligible ambulance, confirm the assignment and manage the full response lifecycle.
          </p>
        </div>
      </header>

      {(error || actionError) && (
        <div className="dispatch-panel__error">
          <ShieldAlert size={16} />

          {actionError || error}
        </div>
      )}

      {status ===
        "loading" &&
        emergencies.length ===
          0 && (
          <div className="dispatch-panel__empty">
            Loading dispatch operations...
          </div>
        )}

      {emergencies.length ===
      0 ? (
        <div className="dispatch-panel__empty">
          No active emergency cases are available.
        </div>
      ) : (
        <div className="dispatch-panel__list">
          {emergencies.map(
            (emergency) => {
              const recommendationId =
                recommendationIdByEmergencyId[
                  emergency.id
                ];

              const recommendation =
                recommendationId
                  ? recommendationsById[
                      recommendationId
                    ]
                  : null;

              const dispatch =
                dispatchByEmergencyId[
                  emergency.id
                ];

              const recommendationExpired =
                recommendation
                  ?.isExpired ||
                (
                  recommendation &&
                  new Date(
                    recommendation
                      .expiresAt,
                  ).getTime() <=
                    Date.now()
                );

              const lifecycleAction =
                dispatch
                  ? lifecycleActionsByDispatchId[
                      String(
                        dispatch.id,
                      )
                    ] ??
                    null
                  : null;

              const lifecycleBusy =
                Boolean(
                  lifecycleAction,
                );

              return (
                <article
                  key={
                    emergency.id
                  }
                  className="dispatch-case"
                >
                  <div className="dispatch-case__top">
                    <div>
                      <span className="dispatch-case__number">
                        {
                          emergency
                            .caseNumber
                        }
                      </span>

                      <h3>
                        {
                          emergency
                            .summary
                        }
                      </h3>
                    </div>

                    <span
                      className={`dispatch-case__status dispatch-case__status--${emergency.status.toLowerCase()}`}
                    >
                      {
                        emergency
                          .status
                      }
                    </span>
                  </div>

                  <div className="dispatch-case__location">
                    <MapPin size={14} />

                    {emergency
                      .governorate
                      ?.name ??
                      "Unknown governorate"}

                    <span>
                      {emergency
                        .location
                        .latitude
                        .toFixed(4)}
                      ,{" "}
                      {emergency
                        .location
                        .longitude
                        .toFixed(4)}
                    </span>
                  </div>

                  {dispatch ? (
                    <div className="active-dispatch-card">
                      <div className="active-dispatch-card__title">
                        <CheckCircle2 size={17} />

                        <div>
                          <strong>
                            {
                              dispatch
                                .dispatchNumber
                            }
                          </strong>

                          <span>
                            Active dispatch
                          </span>
                        </div>

                        <b>
                          {
                            dispatch
                              .status
                          }
                        </b>
                      </div>

                      <div className="active-dispatch-card__details">
                        <div>
                          <span>
                            Ambulance
                          </span>

                          <strong>
                            {
                              dispatch
                                .ambulance
                                .code
                            }
                          </strong>
                        </div>

                        <div>
                          <span>
                            Distance
                          </span>

                          <strong>
                            {
                              dispatch
                                .assignedDistanceKilometers
                            }
                            {" "}
                            km
                          </strong>
                        </div>

                        <div>
                          <span>
                            Assigned
                          </span>

                          <strong>
                            {formatDateTime(
                              dispatch
                                .assignedAt,
                            )}
                          </strong>
                        </div>

                        {dispatch
                          .enRouteAt && (
                          <div>
                            <span>
                              Started
                            </span>

                            <strong>
                              {formatDateTime(
                                dispatch
                                  .enRouteAt,
                              )}
                            </strong>
                          </div>
                        )}

                        {dispatch
                          .arrivedAt && (
                          <div>
                            <span>
                              Arrived
                            </span>

                            <strong>
                              {formatDateTime(
                                dispatch
                                  .arrivedAt,
                              )}
                            </strong>
                          </div>
                        )}

                        <div>
                          <span>
                            Route sequence
                          </span>

                          <strong>
                            {
                              dispatch
                                .lastRouteSequenceNumber
                            }
                          </strong>
                        </div>
                      </div>

                      {dispatch.status ===
                        "EN_ROUTE" && (
                        <DevRouteStreamControls
                          dispatch={
                            dispatch
                          }
                        />
                      )}

                      <div className="dispatch-lifecycle-actions">
                        {dispatch.status ===
                          "ASSIGNED" && (
                          <button
                            type="button"
                            className="dispatch-lifecycle-button dispatch-lifecycle-button--start"
                            disabled={
                              lifecycleBusy
                            }
                            onClick={() =>
                              handleStartDispatch(
                                dispatch.id,
                              )
                            }
                          >
                            <Navigation size={15} />

                            {lifecycleAction ===
                            "start"
                              ? "Starting..."
                              : "Start Dispatch"}
                          </button>
                        )}

                        {dispatch.status ===
                          "EN_ROUTE" && (
                          <button
                            type="button"
                            className="dispatch-lifecycle-button dispatch-lifecycle-button--arrive"
                            disabled={
                              lifecycleBusy
                            }
                            onClick={() =>
                              handleMarkArrived(
                                dispatch.id,
                              )
                            }
                          >
                            <MapPin size={15} />

                            {lifecycleAction ===
                            "arrive"
                              ? "Recording Arrival..."
                              : "Mark Arrived"}
                          </button>
                        )}

                        {dispatch.status ===
                          "ARRIVED" && (
                          <button
                            type="button"
                            className="dispatch-lifecycle-button dispatch-lifecycle-button--complete"
                            disabled={
                              lifecycleBusy
                            }
                            onClick={() =>
                              handleCompleteDispatch(
                                dispatch.id,
                              )
                            }
                          >
                            <CheckCircle2 size={15} />

                            {lifecycleAction ===
                            "complete"
                              ? "Completing..."
                              : "Complete Dispatch"}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : recommendation &&
                    recommendation.status ===
                      "PENDING" &&
                    !recommendationExpired ? (
                    <div className="recommendation-card">
                      <div className="recommendation-card__title">
                        <Navigation size={18} />

                        <div>
                          <span>
                            Recommended ambulance
                          </span>

                          <strong>
                            {
                              recommendation
                                .ambulance
                                .code
                            }
                          </strong>
                        </div>

                        <b>
                          {
                            recommendation
                              .distanceKilometers
                          }
                          {" "}
                          km
                        </b>
                      </div>

                      <div className="recommendation-card__details">
                        <div>
                          <Ambulance size={14} />

                          <span>
                            Status:{" "}
                            <strong>
                              {
                                recommendation
                                  .ambulance
                                  .status
                              }
                            </strong>
                          </span>
                        </div>

                        <div>
                          <Clock3 size={14} />

                          <span>
                            Location age:{" "}
                            <strong>
                              {
                                recommendation
                                  .ambulanceLocationAgeSeconds
                              }
                              {" "}
                              sec
                            </strong>
                          </span>
                        </div>

                        <div>
                          <Clock3 size={14} />

                          <span>
                            Expires:{" "}
                            <strong>
                              {formatDateTime(
                                recommendation
                                  .expiresAt,
                              )}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <label className="recommendation-card__reason">
                        <span>
                          Rejection reason
                        </span>

                        <input
                          type="text"
                          minLength={5}
                          maxLength={500}
                          value={
                            rejectionReasons[
                              recommendation.id
                            ] ?? ""
                          }
                          onChange={(event) => {
                            setRejectionReasons(
                              (
                                current,
                              ) => ({
                                ...current,

                                [recommendation.id]:
                                  event
                                    .target
                                    .value,
                              }),
                            );
                          }}
                          placeholder="Required only when rejecting the recommendation."
                        />
                      </label>

                      <div className="recommendation-card__actions">
                        <button
                          type="button"
                          className="recommendation-action recommendation-action--reject"
                          disabled={
                            rejectingRecommendationId ===
                            recommendation.id
                          }
                          onClick={() =>
                            handleReject(
                              recommendation.id,
                            )
                          }
                        >
                          <XCircle size={15} />

                          {rejectingRecommendationId ===
                          recommendation.id
                            ? "Rejecting..."
                            : "Reject"}
                        </button>

                        <button
                          type="button"
                          className="recommendation-action recommendation-action--confirm"
                          disabled={
                            confirmingRecommendationId ===
                            recommendation.id
                          }
                          onClick={() =>
                            handleConfirm(
                              recommendation.id,
                            )
                          }
                        >
                          <CheckCircle2 size={15} />

                          {confirmingRecommendationId ===
                          recommendation.id
                            ? "Confirming..."
                            : "Confirm Dispatch"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="dispatch-case__generate">
                      {recommendation &&
                        (
                          recommendation.status !==
                            "PENDING" ||
                          recommendationExpired
                        ) && (
                          <p>
                            Previous recommendation:{" "}

                            <strong>
                              {recommendationExpired
                                ? "EXPIRED"
                                : recommendation
                                    .status}
                            </strong>
                          </p>
                        )}

                      <button
                        type="button"
                        disabled={
                          generatingEmergencyId ===
                          emergency.id
                        }
                        onClick={() =>
                          handleGenerate(
                            emergency.id,
                          )
                        }
                      >
                        <Navigation size={15} />

                        {generatingEmergencyId ===
                        emergency.id
                          ? "Finding Ambulance..."
                          : "Generate Recommendation"}
                      </button>
                    </div>
                  )}
                </article>
              );
            },
          )}
        </div>
      )}
    </section>
  );
}

export default DispatchOperationsPanel;