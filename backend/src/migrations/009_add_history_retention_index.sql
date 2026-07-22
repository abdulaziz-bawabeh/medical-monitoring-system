BEGIN;

-- Speeds up deletion and time-range queries for dispatch
-- lifecycle history.
CREATE INDEX IF NOT EXISTS
    dispatch_status_events_retention_idx
ON public.dispatch_status_events (
    occurred_at
);

COMMIT;