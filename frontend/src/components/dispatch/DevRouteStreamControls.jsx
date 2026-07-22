import {
    Pause,
    Play,
    Radio,
  } from "lucide-react";
  
  import {
    useEffect,
    useRef,
    useState,
  } from "react";
  
  import {
    useDispatchRouteStore,
  } from "../../stores/dispatchRouteStore.js";
  
  function calculateHeading(
    fromLocation,
    toLocation,
  ) {
    const longitudeDifference =
      toLocation.longitude -
      fromLocation.longitude;
  
    const latitudeDifference =
      toLocation.latitude -
      fromLocation.latitude;
  
    const degrees =
      Math.atan2(
        longitudeDifference,
        latitudeDifference,
      ) *
      180 /
      Math.PI;
  
    return (
      degrees + 360
    ) % 360;
  }
  
  function createNextLocation(
    currentLocation,
    targetLocation,
  ) {
    const longitudeDifference =
      targetLocation.longitude -
      currentLocation.longitude;
  
    const latitudeDifference =
      targetLocation.latitude -
      currentLocation.latitude;
  
    const isNearTarget =
      Math.abs(
        longitudeDifference,
      ) < 0.00015 &&
      Math.abs(
        latitudeDifference,
      ) < 0.00015;
  
    if (isNearTarget) {
      return {
        location:
          targetLocation,
  
        arrived:
          true,
      };
    }
  
    /*
     * Move 12% of the remaining distance every second.
     *
     * This is a development simulation, not a road-routing
     * algorithm.
     */
    return {
      location: {
        longitude:
          currentLocation.longitude +
          longitudeDifference *
            0.12,
  
        latitude:
          currentLocation.latitude +
          latitudeDifference *
            0.12,
      },
  
      arrived:
        false,
    };
  }
  
  function DevRouteStreamControls({
    dispatch,
  }) {
    const [
      isRunning,
      setIsRunning,
    ] = useState(false);
  
    const [
      localError,
      setLocalError,
    ] = useState(null);
  
    const streamSessionRef =
      useRef(0);
  
    const routeState =
      useDispatchRouteStore(
        (state) =>
          state.routesByDispatchId[
            dispatch.id
          ],
      );
  
    const loadDispatchRoute =
      useDispatchRouteStore(
        (state) =>
          state.loadDispatchRoute,
      );
  
    const sendRoutePoint =
      useDispatchRouteStore(
        (state) =>
          state.sendRoutePoint,
      );
  
    const pointCount =
      routeState
        ?.sequenceNumbers
        ?.length ?? 0;
  
    const lastSequence =
      routeState
        ?.lastSequence ??
      dispatch
        .lastRouteSequenceNumber ??
      0;
  
    useEffect(() => {
      if (
        dispatch.status !==
        "EN_ROUTE"
      ) {
        setIsRunning(
          false,
        );
      }
    }, [
      dispatch.status,
    ]);
  
    useEffect(() => {
      if (!isRunning) {
        return undefined;
      }
  
      const sessionId =
        streamSessionRef.current +
        1;
  
      streamSessionRef.current =
        sessionId;
  
      let timeoutId = null;
  
      let cancelled =
        false;
  
      async function sendNextPoint() {
        if (
          cancelled ||
          streamSessionRef.current !==
            sessionId
        ) {
          return;
        }
  
        const latestStore =
          useDispatchRouteStore
            .getState();
  
        const latestRoute =
          latestStore
            .routesByDispatchId[
            dispatch.id
          ];
  
        const latestSequence =
          latestRoute
            ?.lastSequence ??
          dispatch
            .lastRouteSequenceNumber ??
          0;
  
        const latestPoint =
          latestRoute
            ?.sequenceNumbers
            ?.length > 0
            ? latestRoute
                .pointsBySequence[
                latestRoute
                  .sequenceNumbers[
                  latestRoute
                    .sequenceNumbers
                    .length - 1
                ]
              ]
            : null;
  
        const currentLocation =
          latestPoint
            ?.location ??
          dispatch
            .ambulance
            .startLocation;
  
        const targetLocation =
          dispatch
            .emergencyCase
            .location;
  
        const nextStep =
          createNextLocation(
            currentLocation,
            targetLocation,
          );
  
        const headingDegrees =
          calculateHeading(
            currentLocation,
            targetLocation,
          );
  
        try {
          await sendRoutePoint(
            dispatch.id,
            {
              eventId:
                globalThis
                  .crypto
                  .randomUUID(),
  
              dispatchId:
                dispatch.id,
  
              ambulanceId:
                dispatch
                  .ambulance
                  .id,
  
              sequenceNumber:
                latestSequence +
                1,
  
              recordedAt:
                new Date()
                  .toISOString(),
  
              longitude:
                nextStep
                  .location
                  .longitude,
  
              latitude:
                nextStep
                  .location
                  .latitude,
  
              speedKmh:
                nextStep.arrived
                  ? 0
                  : 42,
  
              headingDegrees,
  
              payload: {
                source:
                  "react-dev-route-stream",
  
                synthetic:
                  true,
              },
            },
          );
  
          setLocalError(
            null,
          );
  
          if (
            nextStep.arrived
          ) {
            setIsRunning(
              false,
            );
  
            return;
          }
  
          timeoutId =
            window.setTimeout(
              sendNextPoint,
              1000,
            );
        } catch (error) {
          setLocalError(
            error instanceof Error
              ? error.message
              : "The development route stream stopped.",
          );
  
          setIsRunning(
            false,
          );
        }
      }
  
      timeoutId =
        window.setTimeout(
          sendNextPoint,
          0,
        );
  
      return () => {
        cancelled =
          true;
  
        if (timeoutId) {
          window.clearTimeout(
            timeoutId,
          );
        }
      };
    }, [
      dispatch,
      isRunning,
      sendRoutePoint,
    ]);
  
    async function handleStart() {
      setLocalError(
        null,
      );
  
      try {
        await loadDispatchRoute(
          dispatch.id,
        );
  
        setIsRunning(
          true,
        );
      } catch (error) {
        setLocalError(
          error instanceof Error
            ? error.message
            : "The dispatch route could not be prepared.",
        );
      }
    }
  
    function handleStop() {
      streamSessionRef.current +=
        1;
  
      setIsRunning(
        false,
      );
    }
  
    /*
     * Never expose development simulation controls in the
     * production build.
     */
    if (
      !import.meta.env.DEV
    ) {
      return null;
    }
  
    return (
      <div className="dev-route-stream">
        <div className="dev-route-stream__info">
          <Radio size={15} />
  
          <div>
            <strong>
              Development Route Stream
            </strong>
  
            <span>
              {pointCount}
              {" "}
              points · Sequence
              {" "}
              {lastSequence}
            </span>
          </div>
        </div>
  
        {localError && (
          <p className="dev-route-stream__error">
            {localError}
          </p>
        )}
  
        {isRunning ? (
          <button
            type="button"
            className="dev-route-stream__button dev-route-stream__button--stop"
            onClick={
              handleStop
            }
          >
            <Pause size={14} />
  
            Stop Dev Stream
          </button>
        ) : (
          <button
            type="button"
            className="dev-route-stream__button"
            onClick={
              handleStart
            }
            disabled={
              dispatch.status !==
              "EN_ROUTE"
            }
          >
            <Play size={14} />
  
            Start Dev Stream
          </button>
        )}
      </div>
    );
  }
  
  export default DevRouteStreamControls;