import {
    pool,
  } from "../config/databasePool.js";
  
  const SIMULATION_LOCK_KEY =
    "medical-monitoring:simulation-runtime";
  
  const STATUS_SELECT_SQL = `
    SELECT
      runtime_state.status
        AS runtime_status,
  
      runtime_state.active_run_id::TEXT
        AS active_run_id,
  
      runtime_state.tick_interval_ms,
  
      runtime_state.started_at
        AS runtime_started_at,
  
      runtime_state.stopped_at
        AS runtime_stopped_at,
  
      runtime_state.last_tick_at,
  
      runtime_state.version,
  
      runtime_state.updated_at
        AS runtime_updated_at,
  
      active_run.status
        AS active_run_status,
  
      active_run.tick_count
        AS active_run_tick_count,
  
      active_run.settings
        AS active_run_settings,
  
      active_run.started_at
        AS active_run_started_at,
  
      active_run.stopped_at
        AS active_run_stopped_at,
  
      latest_run.id::TEXT
        AS latest_run_id,
  
      latest_run.status
        AS latest_run_status,
  
      latest_run.tick_count
        AS latest_run_tick_count,
  
      latest_run.settings
        AS latest_run_settings,
  
      latest_run.started_at
        AS latest_run_started_at,
  
      latest_run.stopped_at
        AS latest_run_stopped_at,
  
      latest_run.failure_message
        AS latest_run_failure_message
  
    FROM public.simulation_runtime_state
      AS runtime_state
  
    LEFT JOIN public.simulation_runs
      AS active_run
      ON active_run.id =
         runtime_state.active_run_id
  
    LEFT JOIN LATERAL (
      SELECT
        simulation_run.id,
        simulation_run.status,
        simulation_run.tick_count,
        simulation_run.settings,
        simulation_run.started_at,
        simulation_run.stopped_at,
        simulation_run.failure_message
  
      FROM public.simulation_runs
        AS simulation_run
  
      ORDER BY
        simulation_run.id DESC
  
      LIMIT 1
    ) AS latest_run
      ON TRUE
  
    WHERE
      runtime_state.singleton_id = 1
  `;
  
  export async function acquireSimulationLock(
    client,
  ) {
    await client.query(
      `
        SELECT PG_ADVISORY_XACT_LOCK(
          HASHTEXT($1)
        );
      `,
      [
        SIMULATION_LOCK_KEY,
      ],
    );
  }
  
  export async function selectSimulationStatus(
    queryable = pool,
    {
      forUpdate = false,
    } = {},
  ) {
    const result =
      await queryable.query(
        `
          ${STATUS_SELECT_SQL}
          ${forUpdate
            ? "FOR UPDATE OF runtime_state"
            : ""}
        `,
      );
  
    return result.rows[0] ??
      null;
  }
  
  export async function insertSimulationRun(
    client,
    {
      userId,
      tickIntervalMs,
      settings,
    },
  ) {
    const result =
      await client.query(
        `
          INSERT INTO public.simulation_runs (
            status,
            tick_interval_ms,
            tick_count,
            started_by_user_id,
            started_at,
            settings,
            created_at,
            updated_at
          )
          VALUES (
            'RUNNING',
            $1::INTEGER,
            0,
            $2::BIGINT,
            NOW(),
            $3::JSONB,
            NOW(),
            NOW()
          )
          RETURNING
            id::TEXT
              AS id,
  
            status,
  
            tick_interval_ms,
  
            tick_count,
  
            settings,
  
            started_at;
        `,
        [
          tickIntervalMs,
          userId,
          JSON.stringify(
            settings,
          ),
        ],
      );
  
    return result.rows[0];
  }
  
  export async function markSimulationRuntimeRunning(
    client,
    {
      runId,
      tickIntervalMs,
    },
  ) {
    await client.query(
      `
        UPDATE public.simulation_runtime_state
        SET
          status = 'RUNNING',
  
          active_run_id =
            $1::BIGINT,
  
          tick_interval_ms =
            $2::INTEGER,
  
          started_at =
            NOW(),
  
          stopped_at =
            NULL,
  
          last_tick_at =
            NULL,
  
          version =
            version + 1,
  
          updated_at =
            NOW()
  
        WHERE
          singleton_id = 1;
      `,
      [
        runId,
        tickIntervalMs,
      ],
    );
  }
  
  export async function recordSimulationTick(
    client,
    runId,
  ) {
    const result =
      await client.query(
        `
          WITH updated_run AS (
            UPDATE public.simulation_runs
            SET
              tick_count =
                tick_count + 1,
  
              updated_at =
                NOW()
  
            WHERE
              id =
                $1::BIGINT
  
              AND status =
                'RUNNING'
  
            RETURNING
              tick_count
          )
  
          UPDATE public.simulation_runtime_state
            AS runtime_state
  
          SET
            last_tick_at =
              NOW(),
  
            version =
              runtime_state.version + 1,
  
            updated_at =
              NOW()
  
          FROM updated_run
  
          WHERE
            runtime_state.singleton_id =
              1
  
            AND runtime_state.status =
              'RUNNING'
  
            AND runtime_state.active_run_id =
              $1::BIGINT
  
          RETURNING
            runtime_state.last_tick_at,
  
            runtime_state.version,
  
            updated_run.tick_count;
        `,
        [
          runId,
        ],
      );
  
    return result.rows[0] ??
      null;
  }
  
  export async function finalizeSimulationRun(
    client,
    {
      runId,
      status,
      userId,
      failureMessage = null,
    },
  ) {
    if (!runId) {
      return;
    }
  
    await client.query(
      `
        UPDATE public.simulation_runs
        SET
          status =
            $2::TEXT,
  
          stopped_by_user_id =
            $3::BIGINT,
  
          stopped_at =
            NOW(),
  
          failure_message =
            $4::TEXT,
  
          updated_at =
            NOW()
  
        WHERE
          id =
            $1::BIGINT
  
          AND status =
            'RUNNING';
      `,
      [
        runId,
        status,
        userId,
        failureMessage,
      ],
    );
  }
  
  export async function markSimulationRuntimeStopped(
    client,
  ) {
    await client.query(
      `
        UPDATE public.simulation_runtime_state
        SET
          status =
            'STOPPED',
  
          active_run_id =
            NULL,
  
          stopped_at =
            NOW(),
  
          version =
            version + 1,
  
          updated_at =
            NOW()
  
        WHERE
          singleton_id =
            1;
      `,
    );
  }