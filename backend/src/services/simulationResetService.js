import {
    pool,
  } from "../config/databasePool.js";
  
  import {
    getSocketServer,
  } from "../config/socket.js";
  
  import {
    HttpError,
  } from "../utils/httpError.js";
  
  const SIMULATION_RESET_LOCK_KEY =
    "medical-monitoring:simulation-reset";
  
  function publishSimulationReset(
    result,
  ) {
    try {
      const io =
        getSocketServer();
  
      io
        .to(
          "role:health_manager",
        )
        .emit(
          "simulation:reset",
          result,
        );
    } catch (error) {
      console.error(
        "Failed to publish simulation:reset:",
        error.message,
      );
    }
  }
  
  export async function resetSimulationOperations({
    userId,
  }) {
    const client =
      await pool.connect();
  
    try {
      await client.query(
        "BEGIN",
      );
  
      await client.query(
        `
          SELECT PG_ADVISORY_XACT_LOCK(
            HASHTEXT($1)
          );
        `,
        [
          SIMULATION_RESET_LOCK_KEY,
        ],
      );
  
      const runtimeResult =
        await client.query(
          `
            SELECT
              status,
              active_run_id::TEXT
                AS active_run_id
  
            FROM public.simulation_runtime_state
  
            WHERE singleton_id = 1
  
            FOR UPDATE;
          `,
        );
  
      const runtime =
        runtimeResult.rows[0];
  
      if (
        runtime?.status ===
        "RUNNING"
      ) {
        throw new HttpError(
          409,
          "SIMULATION_MUST_BE_STOPPED",
          "The simulation must be stopped before its operational data can be reset.",
          {
            activeRunId:
              runtime.active_run_id,
          },
        );
      }
  
      const emergencyResult =
        await client.query(
          `
            SELECT
              emergency.id::TEXT
                AS id
  
            FROM public.emergency_cases
              AS emergency
  
            WHERE
              emergency.payload
                ->> 'source' =
              'simulation';
          `,
        );
  
      const emergencyIds =
        emergencyResult.rows.map(
          (row) =>
            row.id,
        );
  
      if (
        emergencyIds.length ===
        0
      ) {
        await client.query(
          "COMMIT",
        );
  
        const emptyResult = {
          resetAt:
            new Date()
              .toISOString(),
  
          resetByUserId:
            String(
              userId,
            ),
  
          deleted: {
            emergencies:
              0,
  
            alerts:
              0,
  
            recommendations:
              0,
  
            dispatches:
              0,
  
            dispatchStatusEvents:
              0,
  
            routePoints:
              0,
          },
  
          releasedAmbulances:
            0,
        };
  
        publishSimulationReset(
          emptyResult,
        );
  
        return emptyResult;
      }
  
      const dispatchResult =
        await client.query(
          `
            SELECT
              dispatch.id::TEXT
                AS id,
  
              dispatch.ambulance_id::TEXT
                AS ambulance_id
  
            FROM public.ambulance_dispatches
              AS dispatch
  
            WHERE dispatch.emergency_case_id =
              ANY(
                $1::BIGINT[]
              );
          `,
          [
            emergencyIds,
          ],
        );
  
      const dispatchIds =
        dispatchResult.rows.map(
          (row) =>
            row.id,
        );
  
      const ambulanceIds = [
        ...new Set(
          dispatchResult.rows.map(
            (row) =>
              row.ambulance_id,
          ),
        ),
      ];
  
      let routePointCount =
        0;
  
      let dispatchStatusEventCount =
        0;
  
      if (
        dispatchIds.length >
        0
      ) {
        const routeDeleteResult =
          await client.query(
            `
              DELETE FROM
                public.dispatch_route_points
  
              WHERE dispatch_id =
                ANY(
                  $1::BIGINT[]
                );
            `,
            [
              dispatchIds,
            ],
          );
  
        routePointCount =
          routeDeleteResult.rowCount ??
          0;
  
        const statusDeleteResult =
          await client.query(
            `
              DELETE FROM
                public.dispatch_status_events
  
              WHERE dispatch_id =
                ANY(
                  $1::BIGINT[]
                );
            `,
            [
              dispatchIds,
            ],
          );
  
        dispatchStatusEventCount =
          statusDeleteResult.rowCount ??
          0;
      }
  
      const alertDeleteResult =
        await client.query(
          `
            DELETE FROM
              public.alerts
  
            WHERE emergency_case_id =
              ANY(
                $1::BIGINT[]
              );
          `,
          [
            emergencyIds,
          ],
        );
  
      const dispatchDeleteResult =
        await client.query(
          `
            DELETE FROM
              public.ambulance_dispatches
  
            WHERE emergency_case_id =
              ANY(
                $1::BIGINT[]
              );
          `,
          [
            emergencyIds,
          ],
        );
  
      const recommendationDeleteResult =
        await client.query(
          `
            DELETE FROM
              public.dispatch_recommendations
  
            WHERE emergency_case_id =
              ANY(
                $1::BIGINT[]
              );
          `,
          [
            emergencyIds,
          ],
        );
  
      const emergencyDeleteResult =
        await client.query(
          `
            DELETE FROM
              public.emergency_cases
  
            WHERE id =
              ANY(
                $1::BIGINT[]
              );
          `,
          [
            emergencyIds,
          ],
        );
  
      let releasedAmbulanceCount =
        0;
  
      if (
        ambulanceIds.length >
        0
      ) {
        const ambulanceUpdateResult =
          await client.query(
            `
              UPDATE public.ambulances
                AS ambulance
  
              SET
                status =
                  'AVAILABLE',
  
                updated_at =
                  NOW()
  
              WHERE
                ambulance.id =
                  ANY(
                    $1::BIGINT[]
                  )
  
                AND ambulance.is_operational =
                  TRUE
  
                AND NOT EXISTS (
                  SELECT 1
  
                  FROM public.ambulance_dispatches
                    AS active_dispatch
  
                  WHERE
                    active_dispatch.ambulance_id =
                      ambulance.id
  
                    AND active_dispatch.status IN (
                      'ASSIGNED',
                      'EN_ROUTE',
                      'ARRIVED'
                    )
                );
            `,
            [
              ambulanceIds,
            ],
          );
  
        releasedAmbulanceCount =
          ambulanceUpdateResult
            .rowCount ??
          0;
      }
  
      await client.query(
        "COMMIT",
      );
  
      const result = {
        resetAt:
          new Date()
            .toISOString(),
  
        resetByUserId:
          String(
            userId,
          ),
  
        deleted: {
          emergencies:
            emergencyDeleteResult
              .rowCount ??
            0,
  
          alerts:
            alertDeleteResult
              .rowCount ??
            0,
  
          recommendations:
            recommendationDeleteResult
              .rowCount ??
            0,
  
          dispatches:
            dispatchDeleteResult
              .rowCount ??
            0,
  
          dispatchStatusEvents:
            dispatchStatusEventCount,
  
          routePoints:
            routePointCount,
        },
  
        releasedAmbulances:
          releasedAmbulanceCount,
      };
  
      publishSimulationReset(
        result,
      );
  
      return result;
    } catch (error) {
      try {
        await client.query(
          "ROLLBACK",
        );
      } catch {
        // Transaction may already be closed.
      }
  
      throw error;
    } finally {
      client.release();
    }
  }