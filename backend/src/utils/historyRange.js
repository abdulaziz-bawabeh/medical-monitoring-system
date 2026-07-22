import {
    HttpError,
  } from "./httpError.js";
  
  export const HISTORY_RETENTION_HOURS =
    48;
  
  export const DEFAULT_HISTORY_RANGE_HOURS =
    24;
  
  const HOUR_IN_MILLISECONDS =
    60 * 60 * 1000;
  
  const MAX_HISTORY_RANGE_MS =
    HISTORY_RETENTION_HOURS *
    HOUR_IN_MILLISECONDS;
  
  const DEFAULT_HISTORY_RANGE_MS =
    DEFAULT_HISTORY_RANGE_HOURS *
    HOUR_IN_MILLISECONDS;
  
  const FUTURE_TOLERANCE_MS =
    60 * 1000;
  
  function createRetentionCutoff(
    now,
  ) {
    return new Date(
      now.getTime() -
        MAX_HISTORY_RANGE_MS,
    );
  }
  
  function validateHistoricalDate(
    date,
    errorCode,
    errorMessage,
  ) {
    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      throw new HttpError(
        400,
        errorCode,
        errorMessage,
      );
    }
  }
  
  function ensureNotInFuture(
    date,
    now,
  ) {
    if (
      date.getTime() >
      now.getTime() +
        FUTURE_TOLERANCE_MS
    ) {
      throw new HttpError(
        400,
        "HISTORY_TIME_IN_FUTURE",
        "The historical time cannot be in the future.",
      );
    }
  }
  
  function ensureInsideRetentionWindow(
    date,
    now,
  ) {
    const retentionCutoff =
      createRetentionCutoff(
        now,
      );
  
    if (
      date.getTime() <
      retentionCutoff.getTime()
    ) {
      throw new HttpError(
        400,
        "HISTORY_OUTSIDE_RETENTION_WINDOW",
        `Historical telemetry is retained for the latest ${HISTORY_RETENTION_HOURS} hours only.`,
        {
          retentionHours:
            HISTORY_RETENTION_HOURS,
  
          earliestAvailableAt:
            retentionCutoff
              .toISOString(),
        },
      );
    }
  
    return retentionCutoff;
  }
  
  export function resolveHistoryRange({
    from,
    to,
  }) {
    const now =
      new Date();
  
    const resolvedTo =
      to
        ? new Date(to)
        : now;
  
    const resolvedFrom =
      from
        ? new Date(from)
        : new Date(
            resolvedTo.getTime() -
              DEFAULT_HISTORY_RANGE_MS,
          );
  
    validateHistoricalDate(
      resolvedFrom,
      "INVALID_HISTORY_RANGE",
      "The historical start time is invalid.",
    );
  
    validateHistoricalDate(
      resolvedTo,
      "INVALID_HISTORY_RANGE",
      "The historical end time is invalid.",
    );
  
    if (
      resolvedFrom.getTime() >=
      resolvedTo.getTime()
    ) {
      throw new HttpError(
        400,
        "INVALID_HISTORY_RANGE_ORDER",
        "The historical start time must be earlier than the end time.",
      );
    }
  
    ensureNotInFuture(
      resolvedTo,
      now,
    );
  
    const rangeDuration =
      resolvedTo.getTime() -
      resolvedFrom.getTime();
  
    if (
      rangeDuration >
      MAX_HISTORY_RANGE_MS
    ) {
      throw new HttpError(
        400,
        "HISTORY_RANGE_TOO_LARGE",
        `The historical range cannot exceed ${HISTORY_RETENTION_HOURS} hours.`,
        {
          retentionHours:
            HISTORY_RETENTION_HOURS,
  
          requestedRangeHours:
            Number(
              (
                rangeDuration /
                HOUR_IN_MILLISECONDS
              ).toFixed(2),
            ),
        },
      );
    }
  
    ensureInsideRetentionWindow(
      resolvedFrom,
      now,
    );
  
    return {
      from:
        resolvedFrom
          .toISOString(),
  
      to:
        resolvedTo
          .toISOString(),
  
      retentionHours:
        HISTORY_RETENTION_HOURS,
    };
  }
  
  export function resolveHistoryInstant({
    at,
  }) {
    const now =
      new Date();
  
    const resolvedAt =
      at
        ? new Date(at)
        : now;
  
    validateHistoricalDate(
      resolvedAt,
      "INVALID_HISTORY_TIME",
      "The historical snapshot time is invalid.",
    );
  
    ensureNotInFuture(
      resolvedAt,
      now,
    );
  
    const retentionCutoff =
      ensureInsideRetentionWindow(
        resolvedAt,
        now,
      );
  
    return {
      at:
        resolvedAt
          .toISOString(),
  
      earliestAvailableAt:
        retentionCutoff
          .toISOString(),
  
      retentionHours:
        HISTORY_RETENTION_HOURS,
    };
  }