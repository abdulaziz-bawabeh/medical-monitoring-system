import {
    pool,
  } from "../config/databasePool.js";
  
  import {
    HttpError,
  } from "../utils/httpError.js";
  
  import {
    acquireSimulationLock,
    finalizeSimulationRun,
    insertSimulationRun,
    markSimulationRuntimeRunning,
    markSimulationRuntimeStopped,
    recordSimulationTick,
    selectSimulationStatus,
  } from "../repositories/simulationRepository.js";
  
  import {
    generateFacilityOccupancyReadings,
  } from "./simulationOccupancyService.js";
  
  import {
    generateEmergencyScenario,
  } from "./simulationEmergencyService.js";
  
  import {
    automateSimulationEmergencyDispatch,
  } from "./simulationDispatchService.js";

  import {
    runSimulationAmbulanceMovementCycle,
  } from "./simulationAmbulanceMovementService.js";

  /*
   * The in-process timer exists only while the current
   * Node.js backend process is running.
   */
  let intervalHandle =
    null;
  
  let processRunId =
    null;
  
  let processSettings =
    null;
  
  let processStartedByUserId =
    null;
  
  let tickInProgress =
    false;
  
  /*
   * Stops the in-process simulation timer and clears all
   * runtime-only state.
   *
   * Database state is updated separately inside
   * stopSimulation() or initializeSimulationRuntime().
   */
  function stopProcessTimer() {
    if (
      intervalHandle !== null
    ) {
      clearInterval(
        intervalHandle,
      );
  
      intervalHandle =
        null;
    }
  
    processRunId =
      null;
  
    processSettings =
      null;
  
    processStartedByUserId =
      null;
  
    tickInProgress =
      false;
  }
  
  /*
   * Generates facility occupancy readings when the current
   * tick matches occupancyEveryTicks.
   */
  async function executeOccupancyGenerator({
    runId,
    currentTickCount,
    settings,
  }) {
    const occupancyEveryTicks =
      Number(
        settings
          ?.occupancyEveryTicks ??
        0,
      );
  
    const shouldGenerateOccupancy =
      occupancyEveryTicks > 0 &&
      currentTickCount %
        occupancyEveryTicks ===
        0 &&
      processRunId ===
        String(runId);
  
    if (
      !shouldGenerateOccupancy
    ) {
      return;
    }
  
    try {
      const occupancyResult =
        await generateFacilityOccupancyReadings({
          simulationRunId:
            runId,
  
          tickCount:
            currentTickCount,
        });
  
      console.log(
        [
          "Simulation occupancy generated",
          `run=${runId}`,
          `tick=${currentTickCount}`,
          `facilities=${occupancyResult.generatedCount}`,
        ].join(" | "),
      );
    } catch (error) {
      /*
       * A generator failure must not stop the main simulation
       * clock. The next scheduled tick can try again.
       */
      console.error(
        [
          "Simulation occupancy generation failed",
          `run=${runId}`,
          `tick=${currentTickCount}`,
          error instanceof Error
            ? error.message
            : String(error),
        ].join(" | "),
      );
    }
  }
  
  /*
   * Generates an emergency scenario when the current tick
   * matches emergencyEveryTicks.
   */
  async function executeEmergencyGenerator({
  runId,
  currentTickCount,
  settings,
  startedByUserId,
}) {
  const emergencyEveryTicks =
    Number(
      settings
        ?.emergencyEveryTicks ??
      0,
    );

  const maxActiveEmergencies =
    Number(
      settings
        ?.maxActiveEmergencies ??
      0,
    );

  const autoConfirmDispatch =
    Boolean(
      settings
        ?.autoConfirmDispatch,
    );

  const shouldGenerateEmergency =
    emergencyEveryTicks > 0 &&
    maxActiveEmergencies > 0 &&
    currentTickCount %
      emergencyEveryTicks ===
      0 &&
    processRunId ===
      String(runId);

  if (
    !shouldGenerateEmergency
  ) {
    return;
  }

  if (!startedByUserId) {
    console.error(
      [
        "Simulation emergency generation failed",
        `run=${runId}`,
        `tick=${currentTickCount}`,
        "The simulation starter user ID is unavailable.",
      ].join(" | "),
    );

    return;
  }

  try {
    const emergencyResult =
      await generateEmergencyScenario({
        simulationRunId:
          runId,

        tickCount:
          currentTickCount,

        startedByUserId,

        maxActiveEmergencies,
      });

    if (
      !emergencyResult.created
    ) {
      console.log(
        [
          "Simulation emergency skipped",
          `run=${runId}`,
          `tick=${currentTickCount}`,
          `reason=${emergencyResult.reason ?? "UNKNOWN_REASON"}`,
          `active=${emergencyResult.activeEmergencyCount}`,
          `maximum=${emergencyResult.maxActiveEmergencies}`,
        ].join(" | "),
      );

      return;
    }

    console.log(
      [
        "Simulation emergency generated",
        `run=${runId}`,
        `tick=${currentTickCount}`,
        `emergency=${emergencyResult.emergencyCase?.id ?? "unknown"}`,
        `case=${emergencyResult.emergencyCase?.caseNumber ?? "unknown"}`,
        `active=${emergencyResult.activeEmergencyCount}`,
        `maximum=${emergencyResult.maxActiveEmergencies}`,
      ].join(" | "),
    );

    /*
     * Immediately attempt to generate a recommendation for the
     * newly created emergency.
     */
    const dispatchAutomationResult =
      await automateSimulationEmergencyDispatch({
        emergencyCase:
          emergencyResult
            .emergencyCase,

        startedByUserId,

        autoConfirmDispatch,

        simulationRunId:
          runId,

        tickCount:
          currentTickCount,
      });

    if (
      dispatchAutomationResult
        .status ===
      "RECOMMENDATION_READY"
    ) {
      console.log(
        [
          "Simulation recommendation generated",
          `run=${runId}`,
          `tick=${currentTickCount}`,
          `emergency=${emergencyResult.emergencyCase.id}`,
          `recommendation=${dispatchAutomationResult.recommendation?.id ?? "unknown"}`,
          `ambulance=${dispatchAutomationResult.recommendation?.ambulance?.code ?? "unknown"}`,
          `distanceKm=${dispatchAutomationResult.recommendation?.distanceKilometers ?? "unknown"}`,
          "autoConfirm=false",
        ].join(" | "),
      );

      return;
    }

    if (
      dispatchAutomationResult
        .status ===
      "DISPATCH_ASSIGNED"
    ) {
      console.log(
        [
          "Simulation dispatch assigned",
          `run=${runId}`,
          `tick=${currentTickCount}`,
          `emergency=${emergencyResult.emergencyCase.id}`,
          `recommendation=${dispatchAutomationResult.recommendation?.id ?? "unknown"}`,
          `dispatch=${dispatchAutomationResult.dispatch?.id ?? "unknown"}`,
          `dispatchNumber=${dispatchAutomationResult.dispatch?.dispatchNumber ?? "unknown"}`,
          `ambulance=${dispatchAutomationResult.dispatch?.ambulance?.code ?? "unknown"}`,
          "autoConfirm=true",
        ].join(" | "),
      );

      return;
    }

    console.log(
      [
        "Simulation dispatch automation skipped",
        `run=${runId}`,
        `tick=${currentTickCount}`,
        `emergency=${emergencyResult.emergencyCase.id}`,
        `stage=${dispatchAutomationResult.status}`,
        `reason=${dispatchAutomationResult.reason ?? "UNKNOWN_REASON"}`,
      ].join(" | "),
    );
  } catch (error) {
    /*
     * Emergency or dispatch automation failure must not stop
     * the simulation runtime.
     */
    console.error(
      [
        "Simulation emergency generation failed",
        `run=${runId}`,
        `tick=${currentTickCount}`,
        error instanceof Error
          ? error.message
          : String(error),
      ].join(" | "),
    );
  }
}
  /*
   * Executes one simulation clock cycle.
   *
   * Flow:
   * 1. Increment the persistent tick counter.
   * 2. Commit the runtime tick.
   * 3. Run scheduled data generators.
   * 4. Keep the timer alive even if one generator fails.
   */
  async function executeAmbulanceMovementGenerator({
    runId,
    currentTickCount,
    settings,
    startedByUserId,
  }) {
    const movementEveryTicks =
      Number(
        settings
          ?.ambulanceMovementEveryTicks ??
        0,
      );
  
    const shouldMoveAmbulances =
      movementEveryTicks > 0 &&
      currentTickCount %
        movementEveryTicks ===
        0 &&
      processRunId ===
        String(runId);
  
    if (
      !shouldMoveAmbulances
    ) {
      return;
    }
  
    try {
      const result =
        await runSimulationAmbulanceMovementCycle({
          simulationRunId:
            runId,
  
          tickCount:
            currentTickCount,
  
          startedByUserId,
        });
  
      console.log(
        [
          "Simulation ambulance movement",
          `run=${runId}`,
          `tick=${currentTickCount}`,
          `processed=${result.processedCount}`,
          `started=${result.startedCount}`,
          `moved=${result.movedCount}`,
          `arrived=${result.arrivedCount}`,
          `completed=${result.completedCount}`,
          `failed=${result.failedCount}`,
        ].join(" | "),
      );
    } catch (error) {
      console.error(
        [
          "Simulation ambulance movement cycle failed",
          `run=${runId}`,
          `tick=${currentTickCount}`,
          error instanceof Error
            ? error.message
            : String(error),
        ].join(" | "),
      );
    }
  }
    
  async function executeSimulationTick(
    runId,
  ) {
    if (tickInProgress) {
      console.log(
        [
          "Simulation tick skipped",
          `run=${runId}`,
          "reason=PREVIOUS_TICK_STILL_RUNNING",
        ].join(" | "),
      );
  
      return;
    }
  
    tickInProgress =
      true;
  
    let client =
      null;
  
    try {
      client =
        await pool.connect();
  
      await client.query(
        "BEGIN",
      );
  
      const tick =
        await recordSimulationTick(
          client,
          runId,
        );
  
      await client.query(
        "COMMIT",
      );
  
      if (!tick) {
        console.warn(
          [
            "Simulation tick was not recorded",
            `run=${runId}`,
            "The database runtime state no longer matches the active process timer.",
          ].join(" | "),
        );
  
        stopProcessTimer();
  
        return;
      }
  
      const currentTickCount =
        Number(
          tick.tick_count,
        );
  
      /*
       * Take snapshots of the current process settings.
       *
       * This prevents one generator from reading a partially
       * changed settings object.
       */
      const settingsSnapshot =
        processSettings
          ? {
              ...processSettings,
            }
          : null;
  
      const startedByUserIdSnapshot =
        processStartedByUserId;
  
      await executeOccupancyGenerator({
        runId,
  
        currentTickCount,
  
        settings:
          settingsSnapshot,
      });
  
      await executeEmergencyGenerator({
        runId,
  
        currentTickCount,
  
        settings:
          settingsSnapshot,
  
        startedByUserId:
          startedByUserIdSnapshot,
      });

      await executeAmbulanceMovementGenerator({
        runId,
      
        currentTickCount,
      
        settings:
          settingsSnapshot,
      
        startedByUserId:
          startedByUserIdSnapshot,
      });
  
      console.log(
        [
          "Simulation tick",
          `run=${runId}`,
          `tick=${currentTickCount}`,
          `at=${new Date(
            tick.last_tick_at,
          ).toISOString()}`,
        ].join(" | "),
      );
    } catch (error) {
      if (client) {
        try {
          await client.query(
            "ROLLBACK",
          );
        } catch {
          /*
           * The transaction may already have been committed
           * or rolled back.
           */
        }
      }
  
      console.error(
        [
          "Simulation tick failed",
          `run=${runId}`,
          error instanceof Error
            ? error.message
            : String(error),
        ].join(" | "),
      );
    } finally {
      client?.release();
  
      tickInProgress =
        false;
    }
  }
  
  /*
   * Starts the in-process timer for one persisted
   * simulation run.
   */
  function startProcessTimer({
    runId,
    tickIntervalMs,
    settings,
    startedByUserId,
  }) {
    stopProcessTimer();
  
    processRunId =
      String(runId);
  
    processSettings = {
      ...settings,
    };
  
    processStartedByUserId =
      startedByUserId
        ? String(
            startedByUserId,
          )
        : null;
  
    console.log(
      [
        "Simulation timer started",
        `run=${processRunId}`,
        `interval=${tickIntervalMs}ms`,
        `occupancyEveryTicks=${processSettings.occupancyEveryTicks}`,
        `emergencyEveryTicks=${processSettings.emergencyEveryTicks}`,
        `ambulanceMovementEveryTicks=${processSettings.ambulanceMovementEveryTicks}`,
        `maxActiveEmergencies=${processSettings.maxActiveEmergencies}`,
        `autoConfirmDispatch=${processSettings.autoConfirmDispatch}`,
      ].join(" | "),
    );
  
    /*
     * Execute the first tick immediately rather than waiting
     * for the first interval period.
     */
    void executeSimulationTick(
      processRunId,
    );
  
    intervalHandle =
      setInterval(
        () => {
          void executeSimulationTick(
            processRunId,
          );
        },
        tickIntervalMs,
      );
  
    /*
     * Do not call unref() during development.
     *
     * Keeping the timer referenced makes the runtime easier
     * to observe and debug.
     */
  }
  
  function mapRun({
    id,
    status,
    tickCount,
    settings,
    startedAt,
    stoppedAt,
    failureMessage = null,
  }) {
    if (!id) {
      return null;
    }
  
    return {
      id:
        String(id),
  
      status,
  
      tickCount:
        Number(
          tickCount ??
          0,
        ),
  
      settings:
        settings ??
        {},
  
      startedAt,
  
      stoppedAt,
  
      failureMessage,
    };
  }
  
  function mapSimulationStatus(
    row,
  ) {
    if (!row) {
      throw new HttpError(
        500,
        "SIMULATION_RUNTIME_STATE_NOT_FOUND",
        "The simulation runtime state was not found.",
      );
    }
  
    const activeRun =
      mapRun({
        id:
          row.active_run_id,
  
        status:
          row.active_run_status,
  
        tickCount:
          row.active_run_tick_count,
  
        settings:
          row.active_run_settings,
  
        startedAt:
          row.active_run_started_at,
  
        stoppedAt:
          row.active_run_stopped_at,
      });
  
    const latestRun =
      mapRun({
        id:
          row.latest_run_id,
  
        status:
          row.latest_run_status,
  
        tickCount:
          row.latest_run_tick_count,
  
        settings:
          row.latest_run_settings,
  
        startedAt:
          row.latest_run_started_at,
  
        stoppedAt:
          row.latest_run_stopped_at,
  
        failureMessage:
          row.latest_run_failure_message,
      });
  
    return {
      status:
        row.runtime_status,
  
      isRunning:
        row.runtime_status ===
        "RUNNING",
  
      processTimerActive:
        intervalHandle !== null &&
        processRunId !== null &&
        processRunId ===
          String(
            row.active_run_id,
          ),
  
      tickIntervalMs:
        Number(
          row.tick_interval_ms,
        ),
  
      startedAt:
        row.runtime_started_at,
  
      stoppedAt:
        row.runtime_stopped_at,
  
      lastTickAt:
        row.last_tick_at,
  
      version:
        Number(
          row.version,
        ),
  
      updatedAt:
        row.runtime_updated_at,
  
      activeRun,
  
      latestRun,
    };
  }
  
  export async function getSimulationStatus() {
    const row =
      await selectSimulationStatus();
  
    return {
      generatedAt:
        new Date()
          .toISOString(),
  
      simulation:
        mapSimulationStatus(
          row,
        ),
    };
  }
  
  export async function startSimulation({
    userId,
    settings,
  }) {
    const client =
      await pool.connect();
  
    let run =
      null;
  
    try {
      await client.query(
        "BEGIN",
      );
  
      await acquireSimulationLock(
        client,
      );
  
      const currentState =
        await selectSimulationStatus(
          client,
          {
            forUpdate:
              true,
          },
        );
  
      if (
        currentState
          ?.runtime_status ===
        "RUNNING"
      ) {
        throw new HttpError(
          409,
          "SIMULATION_ALREADY_RUNNING",
          "The simulation is already running.",
          {
            activeRunId:
              currentState
                .active_run_id,
          },
        );
      }
  
      run =
        await insertSimulationRun(
          client,
          {
            userId,
  
            tickIntervalMs:
              settings
                .tickIntervalMs,
  
            settings,
          },
        );
  
      await markSimulationRuntimeRunning(
        client,
        {
          runId:
            run.id,
  
          tickIntervalMs:
            settings
              .tickIntervalMs,
        },
      );
  
      await client.query(
        "COMMIT",
      );
    } catch (error) {
      try {
        await client.query(
          "ROLLBACK",
        );
      } catch {
        /*
         * The transaction may already have been committed
         * or rolled back.
         */
      }
  
      throw error;
    } finally {
      client.release();
    }
  
    startProcessTimer({
      runId:
        run.id,
  
      tickIntervalMs:
        settings
          .tickIntervalMs,
  
      settings,
  
      startedByUserId:
        userId,
    });
  
    return getSimulationStatus();
  }
  
  export async function stopSimulation({
    userId,
    reason = null,
  }) {
    const client =
      await pool.connect();
  
    try {
      await client.query(
        "BEGIN",
      );
  
      await acquireSimulationLock(
        client,
      );
  
      const currentState =
        await selectSimulationStatus(
          client,
          {
            forUpdate:
              true,
          },
        );
  
      if (
        currentState
          ?.runtime_status ===
        "STOPPED"
      ) {
        await client.query(
          "COMMIT",
        );
  
        stopProcessTimer();
  
        return getSimulationStatus();
      }
  
      await finalizeSimulationRun(
        client,
        {
          runId:
            currentState
              .active_run_id,
  
          status:
            "STOPPED",
  
          userId,
  
          failureMessage:
            reason,
        },
      );
  
      await markSimulationRuntimeStopped(
        client,
      );
  
      await client.query(
        "COMMIT",
      );
    } catch (error) {
      try {
        await client.query(
          "ROLLBACK",
        );
      } catch {
        /*
         * The transaction may already have been committed
         * or rolled back.
         */
      }
  
      throw error;
    } finally {
      client.release();
    }
  
    stopProcessTimer();
  
    return getSimulationStatus();
  }
  
  /*
   * Node.js timers do not survive a process restart.
   *
   * If PostgreSQL says RUNNING during backend startup, the
   * previous run is marked INTERRUPTED and the runtime returns
   * to STOPPED.
   */
  export async function initializeSimulationRuntime() {
    stopProcessTimer();
  
    const client =
      await pool.connect();
  
    try {
      await client.query(
        "BEGIN",
      );
  
      await acquireSimulationLock(
        client,
      );
  
      const currentState =
        await selectSimulationStatus(
          client,
          {
            forUpdate:
              true,
          },
        );
  
      if (
        currentState
          ?.runtime_status ===
        "RUNNING"
      ) {
        await finalizeSimulationRun(
          client,
          {
            runId:
              currentState
                .active_run_id,
  
            status:
              "INTERRUPTED",
  
            userId:
              null,
  
            failureMessage:
              "The backend process restarted while the simulation was running.",
          },
        );
  
        await markSimulationRuntimeStopped(
          client,
        );
  
        console.warn(
          "Interrupted simulation run was reset during backend startup.",
        );
      }
  
      await client.query(
        "COMMIT",
      );
    } catch (error) {
      try {
        await client.query(
          "ROLLBACK",
        );
      } catch {
        /*
         * The transaction may already have been committed
         * or rolled back.
         */
      }
  
      throw error;
    } finally {
      client.release();
    }
  }