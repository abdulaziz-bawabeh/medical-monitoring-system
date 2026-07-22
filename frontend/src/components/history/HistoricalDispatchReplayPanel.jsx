import {
    ChevronLeft,
    ChevronRight,
    Gauge,
    Pause,
    Play,
    RotateCcw,
    Route,
  } from "lucide-react";
  
  import {
    useEffect,
    useMemo,
    useState,
  } from "react";
  
  import {
    useHistoryStore,
  } from "../../stores/historystore.js";
  
  const PLAYBACK_SPEEDS = [
    0.5,
    1,
    2,
    4,
  ];
  
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
          "medium",
      },
    ).format(date);
  }
  
  function HistoricalDispatchReplayPanel({
    dispatches = [],
    onReplayRouteChange,
  }) {
    const routesByDispatchId =
      useHistoryStore(
        (state) =>
          state.routesByDispatchId,
      );
  
    const selectedDispatchId =
      useHistoryStore(
        (state) =>
          state.selectedDispatchId,
      );
  
    const loadHistoricalDispatchRoute =
      useHistoryStore(
        (state) =>
          state.loadHistoricalDispatchRoute,
      );
  
    const selectHistoricalDispatch =
      useHistoryStore(
        (state) =>
          state.selectHistoricalDispatch,
      );
  
    const [
      currentPointIndex,
      setCurrentPointIndex,
    ] = useState(0);
  
    const [
      isPlaying,
      setIsPlaying,
    ] = useState(false);
  
    const [
      playbackSpeed,
      setPlaybackSpeed,
    ] = useState(1);
  
    const eligibleDispatches =
      useMemo(
        () =>
          dispatches.filter(
            (dispatch) =>
              dispatch
                .storedRoutePointCount >
              0,
          ),
        [
          dispatches,
        ],
      );
  
    const routeState =
      selectedDispatchId
        ? routesByDispatchId[
            selectedDispatchId
          ] ?? null
        : null;
  
    const routeData =
      routeState?.data ??
      null;
  
    const points =
      routeData?.points ??
      [];
  
    const safeCurrentIndex =
      points.length === 0
        ? 0
        : Math.min(
            currentPointIndex,
            points.length - 1,
          );
  
    const currentPoint =
      points[
        safeCurrentIndex
      ] ?? null;
  
    const selectedDispatch =
      useMemo(
        () =>
          eligibleDispatches.find(
            (dispatch) =>
              String(
                dispatch.id,
              ) ===
              String(
                selectedDispatchId,
              ),
          ) ?? null,
        [
          eligibleDispatches,
          selectedDispatchId,
        ],
      );
  
    /*
     * Automatically select the first dispatch that has
     * recorded route points.
     */
    useEffect(() => {
      if (
        eligibleDispatches.length ===
        0
      ) {
        if (
          selectedDispatchId !==
          null
        ) {
          selectHistoricalDispatch(
            null,
          );
        }
  
        return;
      }
  
      const selectedIsEligible =
        eligibleDispatches.some(
          (dispatch) =>
            String(
              dispatch.id,
            ) ===
            String(
              selectedDispatchId,
            ),
        );
  
      const dispatchId =
        selectedIsEligible
          ? String(
              selectedDispatchId,
            )
          : String(
              eligibleDispatches[0]
                .id,
            );
  
      if (!selectedIsEligible) {
        selectHistoricalDispatch(
          dispatchId,
        );
      }
  
      void loadHistoricalDispatchRoute(
        dispatchId,
      );
    }, [
      eligibleDispatches,
      selectedDispatchId,
      loadHistoricalDispatchRoute,
      selectHistoricalDispatch,
    ]);
  
    /*
     * Reset playback whenever another dispatch is selected.
     */
    useEffect(() => {
      setCurrentPointIndex(
        0,
      );
  
      setIsPlaying(
        false,
      );
    }, [
      selectedDispatchId,
    ]);
  
    /*
     * Stop playback if the loaded route contains fewer points
     * than the previous route.
     */
    useEffect(() => {
      if (
        points.length ===
        0
      ) {
        setCurrentPointIndex(
          0,
        );
  
        setIsPlaying(
          false,
        );
  
        return;
      }
  
      setCurrentPointIndex(
        (current) =>
          Math.min(
            current,
            points.length - 1,
          ),
      );
    }, [
      points.length,
    ]);
  
    /*
     * Playback timer.
     *
     * The backend demo stores approximately one route point
     * per second. The playback speed modifies that delay.
     */
    useEffect(() => {
      if (
        !isPlaying ||
        points.length < 2
      ) {
        return undefined;
      }
  
      if (
        safeCurrentIndex >=
        points.length - 1
      ) {
        setIsPlaying(
          false,
        );
  
        return undefined;
      }
  
      const delay =
        Math.max(
          100,
          1000 /
            playbackSpeed,
        );
  
      const timeoutId =
        window.setTimeout(
          () => {
            setCurrentPointIndex(
              (current) =>
                Math.min(
                  current + 1,
                  points.length - 1,
                ),
            );
          },
          delay,
        );
  
      return () => {
        window.clearTimeout(
          timeoutId,
        );
      };
    }, [
      isPlaying,
      playbackSpeed,
      points.length,
      safeCurrentIndex,
    ]);
  
    /*
     * Send the current replay visualization to the historical
     * page, which passes it to SyriaOperationsMap.
     */
    useEffect(() => {
      if (
        !routeData ||
        points.length === 0 ||
        !currentPoint
      ) {
        onReplayRouteChange(
          null,
        );
  
        return;
      }
  
      const completedPoints =
        points.slice(
          0,
          safeCurrentIndex + 1,
        );
  
      const remainingPoints =
        points.slice(
          safeCurrentIndex,
        );
  
      onReplayRouteChange({
        dispatchId:
          routeData
            .dispatch
            .id,
  
        dispatchNumber:
          routeData
            .dispatch
            .dispatchNumber,
  
        ambulanceId:
          routeData
            .dispatch
            .ambulance
            .id,
  
        ambulanceCode:
          routeData
            .dispatch
            .ambulance
            .code,
  
        status:
          routeData
            .dispatch
            .status,
  
        lastSequence:
          currentPoint
            .sequenceNumber,
  
        isHistoricalReplay:
          true,
  
        points:
          completedPoints,
  
        remainingPoints,
  
        currentPoint,
      });
    }, [
      currentPoint,
      onReplayRouteChange,
      points,
      routeData,
      safeCurrentIndex,
    ]);
  
    /*
     * Remove the replay layer when the panel is unmounted.
     */
    useEffect(
      () => () => {
        onReplayRouteChange(
          null,
        );
      },
      [
        onReplayRouteChange,
      ],
    );
  
    async function handleDispatchChange(
      event,
    ) {
      const dispatchId =
        event.target.value;
  
      setCurrentPointIndex(
        0,
      );
  
      setIsPlaying(
        false,
      );
  
      if (!dispatchId) {
        selectHistoricalDispatch(
          null,
        );
  
        onReplayRouteChange(
          null,
        );
  
        return;
      }
  
      selectHistoricalDispatch(
        dispatchId,
      );
  
      await loadHistoricalDispatchRoute(
        dispatchId,
        {
          force:
            true,
        },
      );
    }
  
    function handlePlayPause() {
      if (
        points.length <
        2
      ) {
        return;
      }
  
      if (
        safeCurrentIndex >=
        points.length - 1
      ) {
        setCurrentPointIndex(
          0,
        );
  
        setIsPlaying(
          true,
        );
  
        return;
      }
  
      setIsPlaying(
        (current) =>
          !current,
      );
    }
  
    function handleRestart() {
      setIsPlaying(
        false,
      );
  
      setCurrentPointIndex(
        0,
      );
    }
  
    function handlePreviousPoint() {
      setIsPlaying(
        false,
      );
  
      setCurrentPointIndex(
        (current) =>
          Math.max(
            0,
            current - 1,
          ),
      );
    }
  
    function handleNextPoint() {
      setIsPlaying(
        false,
      );
  
      setCurrentPointIndex(
        (current) =>
          Math.min(
            points.length - 1,
            current + 1,
          ),
      );
    }
  
    if (
      eligibleDispatches.length ===
      0
    ) {
      return (
        <section className="history-card history-replay-card">
          <header className="history-card__header">
            <div>
              <span>
                Historical route replay
              </span>
  
              <h2>
                Ambulance Route Replay
              </h2>
  
              <p>
                Replay stored ambulance
                movement during a historical
                dispatch.
              </p>
            </div>
          </header>
  
          <div className="history-empty-state">
            No dispatch containing route
            points was found in the selected
            historical range.
          </div>
        </section>
      );
    }
  
    return (
      <section className="history-card history-replay-card">
        <header className="history-card__header">
          <div>
            <span>
              Historical route replay
            </span>
  
            <h2>
              Ambulance Route Replay
            </h2>
  
            <p>
              Select a dispatch and replay
              its stored ambulance movement
              on the historical map.
            </p>
          </div>
  
          <strong className="history-card__counter">
            {
              eligibleDispatches
                .length
            }
            {" "}
            recorded routes
          </strong>
        </header>
  
        <div className="history-replay-content">
          <div className="history-replay-selector">
            <label>
              <span>
                Dispatch
              </span>
  
              <select
                value={
                  selectedDispatchId ??
                  ""
                }
                onChange={
                  handleDispatchChange
                }
              >
                {eligibleDispatches.map(
                  (dispatch) => (
                    <option
                      key={
                        dispatch.id
                      }
                      value={
                        dispatch.id
                      }
                    >
                      {
                        dispatch
                          .dispatchNumber
                      }
                      {" — "}
                      {
                        dispatch
                          .ambulance
                          .code
                      }
                      {" — "}
                      {
                        dispatch
                          .storedRoutePointCount
                      }
                      {" points"}
                    </option>
                  ),
                )}
              </select>
            </label>
  
            <div className="history-replay-dispatch-summary">
              <Route size={19} />
  
              <div>
                <strong>
                  {selectedDispatch
                    ?.dispatchNumber ??
                    "No dispatch selected"}
                </strong>
  
                <span>
                  {selectedDispatch
                    ? `${selectedDispatch.ambulance.code} · ${selectedDispatch.emergencyCase.caseNumber}`
                    : "Select a historical dispatch"}
                </span>
              </div>
            </div>
          </div>
  
          {routeState?.status ===
            "loading" && (
            <div className="history-replay-message">
              Loading historical route
              points...
            </div>
          )}
  
          {routeState?.status ===
            "error" && (
            <div className="history-filter-error">
              {routeState.error}
            </div>
          )}
  
          {routeState?.status ===
            "ready" &&
            points.length === 0 && (
            <div className="history-replay-message">
              The selected dispatch does not
              contain route points inside the
              selected time range.
            </div>
          )}
  
          {routeState?.status ===
            "ready" &&
            points.length > 0 && (
            <>
              <div className="history-replay-timeline-details">
                <div>
                  <span>
                    Current point
                  </span>
  
                  <strong>
                    {safeCurrentIndex +
                      1}
                    {" / "}
                    {points.length}
                  </strong>
                </div>
  
                <div>
                  <span>
                    Sequence
                  </span>
  
                  <strong>
                    {currentPoint
                      ?.sequenceNumber ??
                      0}
                  </strong>
                </div>
  
                <div>
                  <span>
                    Speed
                  </span>
  
                  <strong>
                    {currentPoint
                      ?.speedKmh !==
                      null &&
                    currentPoint
                      ?.speedKmh !==
                      undefined
                      ? `${currentPoint.speedKmh.toFixed(
                          1,
                        )} km/h`
                      : "Unavailable"}
                  </strong>
                </div>
  
                <div>
                  <span>
                    Recorded time
                  </span>
  
                  <strong>
                    {formatDateTime(
                      currentPoint
                        ?.recordedAt,
                    )}
                  </strong>
                </div>
              </div>
  
              <div className="history-replay-slider">
                <input
                  type="range"
                  min="0"
                  max={
                    Math.max(
                      0,
                      points.length -
                        1,
                    )
                  }
                  step="1"
                  value={
                    safeCurrentIndex
                  }
                  onChange={(event) => {
                    setIsPlaying(
                      false,
                    );
  
                    setCurrentPointIndex(
                      Number(
                        event
                          .target
                          .value,
                      ),
                    );
                  }}
                  aria-label="Historical route timeline"
                />
  
                <div>
                  <span>
                    {formatDateTime(
                      points[0]
                        ?.recordedAt,
                    )}
                  </span>
  
                  <span>
                    {formatDateTime(
                      points[
                        points.length -
                          1
                      ]?.recordedAt,
                    )}
                  </span>
                </div>
              </div>
  
              <div className="history-replay-controls">
                <div className="history-replay-controls__primary">
                  <button
                    type="button"
                    onClick={
                      handleRestart
                    }
                    title="Restart route"
                  >
                    <RotateCcw
                      size={17}
                    />
  
                    Restart
                  </button>
  
                  <button
                    type="button"
                    onClick={
                      handlePreviousPoint
                    }
                    disabled={
                      safeCurrentIndex ===
                      0
                    }
                    title="Previous route point"
                  >
                    <ChevronLeft
                      size={18}
                    />
                  </button>
  
                  <button
                    type="button"
                    className="history-replay-play-button"
                    onClick={
                      handlePlayPause
                    }
                    disabled={
                      points.length <
                      2
                    }
                  >
                    {isPlaying
                      ? (
                        <>
                          <Pause
                            size={18}
                          />
  
                          Pause
                        </>
                      )
                      : (
                        <>
                          <Play
                            size={18}
                          />
  
                          Play
                        </>
                      )}
                  </button>
  
                  <button
                    type="button"
                    onClick={
                      handleNextPoint
                    }
                    disabled={
                      safeCurrentIndex >=
                      points.length -
                        1
                    }
                    title="Next route point"
                  >
                    <ChevronRight
                      size={18}
                    />
                  </button>
                </div>
  
                <div className="history-replay-speed-controls">
                  <span>
                    <Gauge
                      size={15}
                    />
  
                    Playback speed
                  </span>
  
                  {PLAYBACK_SPEEDS.map(
                    (speed) => (
                      <button
                        key={
                          speed
                        }
                        type="button"
                        className={
                          playbackSpeed ===
                          speed
                            ? "history-replay-speed-button history-replay-speed-button--active"
                            : "history-replay-speed-button"
                        }
                        onClick={() => {
                          setPlaybackSpeed(
                            speed,
                          );
                        }}
                      >
                        {speed}x
                      </button>
                    ),
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    );
  }
  
  export default HistoricalDispatchReplayPanel;