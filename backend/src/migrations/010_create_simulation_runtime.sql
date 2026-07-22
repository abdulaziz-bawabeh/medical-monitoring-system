BEGIN;

CREATE TABLE IF NOT EXISTS public.simulation_runs (
  id BIGSERIAL PRIMARY KEY,

  status TEXT NOT NULL
    CHECK (
      status IN (
        'RUNNING',
        'STOPPED',
        'INTERRUPTED',
        'FAILED'
      )
    ),

  tick_interval_ms INTEGER NOT NULL
    CHECK (
      tick_interval_ms BETWEEN 500 AND 60000
    ),

  tick_count BIGINT NOT NULL DEFAULT 0
    CHECK (
      tick_count >= 0
    ),

  started_by_user_id BIGINT
    REFERENCES public.users(id)
    ON DELETE SET NULL,

  stopped_by_user_id BIGINT
    REFERENCES public.users(id)
    ON DELETE SET NULL,

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  stopped_at TIMESTAMPTZ,

  failure_message TEXT,

  settings JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (
    stopped_at IS NULL
    OR stopped_at >= started_at
  )
);

CREATE TABLE IF NOT EXISTS public.simulation_runtime_state (
  singleton_id SMALLINT PRIMARY KEY DEFAULT 1
    CHECK (
      singleton_id = 1
    ),

  status TEXT NOT NULL DEFAULT 'STOPPED'
    CHECK (
      status IN (
        'STOPPED',
        'RUNNING'
      )
    ),

  active_run_id BIGINT
    REFERENCES public.simulation_runs(id)
    ON DELETE SET NULL,

  tick_interval_ms INTEGER NOT NULL DEFAULT 1000
    CHECK (
      tick_interval_ms BETWEEN 500 AND 60000
    ),

  started_at TIMESTAMPTZ,

  stopped_at TIMESTAMPTZ,

  last_tick_at TIMESTAMPTZ,

  version BIGINT NOT NULL DEFAULT 0
    CHECK (
      version >= 0
    ),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (
    (
      status = 'RUNNING'
      AND active_run_id IS NOT NULL
      AND started_at IS NOT NULL
    )
    OR
    (
      status = 'STOPPED'
      AND active_run_id IS NULL
    )
  )
);

INSERT INTO public.simulation_runtime_state (
  singleton_id,
  status,
  active_run_id,
  tick_interval_ms,
  started_at,
  stopped_at,
  last_tick_at,
  version,
  updated_at
)
VALUES (
  1,
  'STOPPED',
  NULL,
  1000,
  NULL,
  NOW(),
  NULL,
  0,
  NOW()
)
ON CONFLICT (singleton_id)
DO NOTHING;

CREATE INDEX IF NOT EXISTS simulation_runs_status_started_idx
ON public.simulation_runs (
  status,
  started_at DESC
);

CREATE INDEX IF NOT EXISTS simulation_runs_started_at_idx
ON public.simulation_runs (
  started_at DESC
);

CREATE UNIQUE INDEX IF NOT EXISTS simulation_single_running_run_idx
ON public.simulation_runs (
  status
)
WHERE status = 'RUNNING';

COMMIT;