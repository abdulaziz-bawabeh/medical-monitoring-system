import {
    useEffect,
  } from "react";
  
  import {
    emergencyCaseSchema,
    operationalAlertSchema,
  } from "../schemas/emergencyAlertSchemas.js";
  
  import {
    ambulanceLocationSocketEventSchema,
    facilityOccupancySocketEventSchema,
  } from "../schemas/dashboardSchemas.js";
  
  import {
    connectSocket,
    disconnectSocket,
    socket,
  } from "../services/socket.js";
  
  import {
    useAuthStore,
  } from "../stores/authStore.js";
  
  import {
    useEmergencyOperationsStore,
  } from "../stores/emergencyOperationsStore.js";
  
  import {
    useLiveOperationsStore,
  } from "../stores/liveOperationsStore.js";
  
  import {
    ambulanceDispatchSchema,
    ambulanceStatusSocketEventSchema,
    dispatchRecommendationSchema,
  } from "../schemas/dispatchSchemas.js";
  
  import {
    useDispatchOperationsStore,
  } from "../stores/dispatchOperationsStore.js";

  import {
    dispatchRoutePointSchema,
  } from "../schemas/dispatchRouteSchemas.js";
  
  import {
    useDispatchRouteStore,
  } from "../stores/dispatchRouteStore.js";

  export function useSocketLifecycle() {
    const authenticationStatus =
      useAuthStore(
        (state) =>
          state.status,
      );
  
    /*
     * Register Socket.IO listeners once.
     */
    useEffect(() => {
      function handleConnect() {
        useLiveOperationsStore
          .getState()
          .markSocketConnected(
            socket.id,
          );
      }
      let recoveryCycleRunning =
      false;
    
    async function recoverAllLiveStreams() {
      if (
        recoveryCycleRunning
      ) {
        return;
      }
    
      recoveryCycleRunning =
        true;
    
      try {
        await useLiveOperationsStore
          .getState()
          .recoverMissedLiveReadings();
    
        recoverActiveDispatchRoutes();
      } catch (error) {
        console.error(
          "Reconnect recovery failed:",
          error,
        );
    
        /*
         * Route recovery remains independent from occupancy and
         * ambulance-location recovery.
         */
        recoverActiveDispatchRoutes();
      } finally {
        recoveryCycleRunning =
          false;
      }
    }
      function handleConnectionReady(
        payload,
      ) {
        useLiveOperationsStore
          .getState()
          .markSocketReady(
            payload,
          );
      
        /*
         * After the authenticated Socket connection becomes ready,
         * recover any route points that may have been missed while
         * the client was disconnected.
         */
        void recoverAllLiveStreams();
      }
  
      function handleDisconnect(
        reason,
      ) {
        useLiveOperationsStore
          .getState()
          .markSocketDisconnected(
            reason,
          );
      }
  
      function handleConnectError(
        error,
      ) {
        useLiveOperationsStore
          .getState()
          .markSocketError(
            error,
          );
      }
      function handleEmergencyUpdated(
        payload,
      ) {
        const validationResult =
          emergencyCaseSchema
            .safeParse(payload);
      
        if (!validationResult.success) {
          console.error(
            "Invalid emergency updated Socket event:",
            validationResult
              .error
              .issues,
          );
      
          return;
        }
      
        useEmergencyOperationsStore
          .getState()
          .applyEmergencyUpdated(
            validationResult.data,
          );
      }

      function handleRecommendation(
        payload,
      ) {
        const validationResult =
          dispatchRecommendationSchema
            .safeParse(payload);
      
        if (!validationResult.success) {
          console.error(
            "Invalid dispatch recommendation Socket event:",
            validationResult
              .error
              .issues,
          );
      
          return;
        }
      
        useDispatchOperationsStore
          .getState()
          .applyRecommendation(
            validationResult.data,
          );
      }
      
      function handleDispatch(
        payload,
      ) {
        const validationResult =
          ambulanceDispatchSchema
            .safeParse(payload);
      
        if (!validationResult.success) {
          console.error(
            "Invalid dispatch Socket event:",
            validationResult
              .error
              .issues,
          );
      
          return;
        }
      
        useDispatchOperationsStore
          .getState()
          .applyDispatch(
            validationResult.data,
          );
      }
      
      function handleAmbulanceStatusUpdated(
        payload,
      ) {
        const validationResult =
          ambulanceStatusSocketEventSchema
            .safeParse(payload);
      
        if (!validationResult.success) {
          console.error(
            "Invalid ambulance status Socket event:",
            validationResult
              .error
              .issues,
          );
      
          return;
        }
      
        useLiveOperationsStore
          .getState()
          .applyAmbulanceStatusUpdated(
            validationResult.data,
          );
      }

      function handleReconnectAttempt(
        attemptNumber,
      ) {
        useLiveOperationsStore
          .getState()
          .markSocketReconnecting(
            attemptNumber,
          );
      }
  
      function handleReconnect() {
        useLiveOperationsStore
          .getState()
          .markSocketConnected(
            socket.id,
          );
      
        /*
         * This is a fallback recovery trigger.
         *
         * connection:ready remains the primary authenticated trigger.
         */
        void recoverAllLiveStreams();
      }
      
  
      /*
       * ========================================================
       * Facility occupancy events
       * ========================================================
       */
  
      function handleFacilityOccupancy(
        payload,
      ) {
        console.log(
          "[Socket.IO] Facility occupancy event received:",
          payload,
        );
      
        const validationResult =
          facilityOccupancySocketEventSchema
            .safeParse(
              payload,
            );
      
        if (
          !validationResult.success
        ) {
          console.error(
            "Invalid facility occupancy Socket event:",
            validationResult
              .error
              .issues,
          );
      
          return;
        }
      
        console.log(
          "[Socket.IO] Facility occupancy event validated:",
          validationResult.data,
        );
      
        useLiveOperationsStore
          .getState()
          .applyFacilityOccupancyEvent(
            validationResult.data,
          );
      }
      /*
       * ========================================================
       * Ambulance location events
       * ========================================================
       */
  
      function handleAmbulanceLocation(
        payload,
      ) {
        const validationResult =
          ambulanceLocationSocketEventSchema
            .safeParse(
              payload,
            );
  
        if (
          !validationResult.success
        ) {
          console.error(
            "Invalid ambulance location Socket event:",
            validationResult
              .error
              .issues,
          );
  
          return;
        }
  
        useLiveOperationsStore
          .getState()
          .applyAmbulanceLocationEvent(
            validationResult.data,
          );
      }
  
      /*
       * ========================================================
       * Emergency case events
       * ========================================================
       */
  
      function handleEmergencyCreated(
        payload,
      ) {
        const validationResult =
          emergencyCaseSchema
            .safeParse(
              payload,
            );
  
        if (
          !validationResult.success
        ) {
          console.error(
            "Invalid emergency created Socket event:",
            validationResult
              .error
              .issues,
          );
  
          return;
        }
  
        useEmergencyOperationsStore
          .getState()
          .applyEmergencyCreated(
            validationResult.data,
          );
      }
  
      /*
       * ========================================================
       * Alert events
       * ========================================================
       */
  
      function handleAlertCreated(
        payload,
      ) {
        const validationResult =
          operationalAlertSchema
            .safeParse(
              payload,
            );
  
        if (
          !validationResult.success
        ) {
          console.error(
            "Invalid alert created Socket event:",
            validationResult
              .error
              .issues,
          );
  
          return;
        }
  
        useEmergencyOperationsStore
          .getState()
          .applyAlertCreated(
            validationResult.data,
          );
      }
  
      function handleAlertUpdated(
        payload,
      ) {
        const validationResult =
          operationalAlertSchema
            .safeParse(
              payload,
            );
  
        if (
          !validationResult.success
        ) {
          console.error(
            "Invalid alert updated Socket event:",
            validationResult
              .error
              .issues,
          );
  
          return;
        }
  
        useEmergencyOperationsStore
          .getState()
          .applyAlertUpdated(
            validationResult.data,
          );
      }

      function handleDispatchRoutePoint(
        payload,
      ) {
        const validationResult =
          dispatchRoutePointSchema
            .safeParse(
              payload,
            );
      
        if (!validationResult.success) {
          console.error(
            "Invalid dispatch route point Socket event:",
            validationResult
              .error
              .issues,
          );
      
          return;
        }
      
        useDispatchRouteStore
          .getState()
          .applySocketRoutePoint(
            validationResult.data,
          );
      }

      function recoverActiveDispatchRoutes() {
        const dispatchState =
          useDispatchOperationsStore
            .getState();
      
        const routeState =
          useDispatchRouteStore
            .getState();
      
        for (
          const dispatchId of
          dispatchState.dispatchIds
        ) {
          const dispatch =
            dispatchState
              .dispatchesById[
              dispatchId
            ];
      
          if (
            !dispatch ||
            (
              dispatch.status !==
                "EN_ROUTE" &&
              dispatch.status !==
                "ARRIVED"
            )
          ) {
            continue;
          }
      
          void routeState
            .recoverDispatchRoute(
              dispatch.id,
            );
        }
      }
  
      /*
       * ========================================================
       * Register Socket event listeners
       * ========================================================
       */
  
      socket.on(
        "connect",
        handleConnect,
      );
  
      socket.on(
        "connection:ready",
        handleConnectionReady,
      );
  
      socket.on(
        "disconnect",
        handleDisconnect,
      );
  
      socket.on(
        "connect_error",
        handleConnectError,
      );
  
      socket.on(
        "facility:occupancy-updated",
        handleFacilityOccupancy,
      );
  
      socket.on(
        "ambulance:location-updated",
        handleAmbulanceLocation,
      );
  
      socket.on(
        "emergency:created",
        handleEmergencyCreated,
      );
  
      socket.on(
        "alert:created",
        handleAlertCreated,
      );
  
      socket.on(
        "alert:updated",
        handleAlertUpdated,
      );
  
      socket.io.on(
        "reconnect_attempt",
        handleReconnectAttempt,
      );
  
      socket.io.on(
        "reconnect",
        handleReconnect,
      );

      socket.on(
        "emergency:updated",
        handleEmergencyUpdated,
      );
      
      socket.on(
        "dispatch:recommendation-created",
        handleRecommendation,
      );
      
      socket.on(
        "dispatch:recommendation-updated",
        handleRecommendation,
      );
      
      socket.on(
        "dispatch:created",
        handleDispatch,
      );
      
      socket.on(
        "dispatch:status-updated",
        handleDispatch,
      );
      
      socket.on(
        "ambulance:status-updated",
        handleAmbulanceStatusUpdated,
      );
  
      socket.on(
        "dispatch:route-point",
        handleDispatchRoutePoint,
      );
      /*
       * Remove all listeners when the hook unmounts.
       *
       * This is important in React Strict Mode because effects
       * may mount and clean up more than once in development.
       */
      return () => {
        socket.off(
          "connect",
          handleConnect,
        );
  
        socket.off(
          "connection:ready",
          handleConnectionReady,
        );
  
        socket.off(
          "disconnect",
          handleDisconnect,
        );
  
        socket.off(
          "connect_error",
          handleConnectError,
        );
  
        socket.off(
          "facility:occupancy-updated",
          handleFacilityOccupancy,
        );
  
        socket.off(
          "ambulance:location-updated",
          handleAmbulanceLocation,
        );
  
        socket.off(
          "emergency:created",
          handleEmergencyCreated,
        );
  
        socket.off(
          "alert:created",
          handleAlertCreated,
        );
  
        socket.off(
          "alert:updated",
          handleAlertUpdated,
        );
  
        socket.io.off(
          "reconnect_attempt",
          handleReconnectAttempt,
        );
  
        socket.io.off(
          "reconnect",
          handleReconnect,
        );

        socket.off(
          "emergency:updated",
          handleEmergencyUpdated,
        );
        
        socket.off(
          "dispatch:recommendation-created",
          handleRecommendation,
        );
        
        socket.off(
          "dispatch:recommendation-updated",
          handleRecommendation,
        );
        
        socket.off(
          "dispatch:created",
          handleDispatch,
        );
        
        socket.off(
          "dispatch:status-updated",
          handleDispatch,
        );
        
        socket.off(
          "ambulance:status-updated",
          handleAmbulanceStatusUpdated,
        );

        socket.off(
          "dispatch:route-point",
          handleDispatchRoutePoint,
        );
      };
    }, []);
  
    /*
     * Start or stop the Socket.IO connection according to the
     * authenticated user state.
     */
    useEffect(() => {
      const liveStore =
        useLiveOperationsStore
          .getState();
  
      const emergencyStore =
        useEmergencyOperationsStore
          .getState();
  
      if (
        authenticationStatus ===
        "authenticated"
      ) {
        if (!socket.connected) {
          liveStore
            .markSocketConnecting();
  
          connectSocket();
        }
  
        return;
      }
  
      /*
       * Logout, expired JWT or unauthenticated state.
       */
      disconnectSocket();
  
      liveStore
        .resetSocketConnection();
  
      liveStore
        .resetDashboardData();
  
      emergencyStore
        .resetEmergencyOperations();
      
      useDispatchOperationsStore
        .getState()
        .resetDispatchOperations();
      useDispatchRouteStore
        .getState()
        .resetDispatchRoutes();
    }, [
      authenticationStatus,
    ]);
  }
  
  export default useSocketLifecycle;