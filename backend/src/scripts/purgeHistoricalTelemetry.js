import "dotenv/config";

import {
  pool,
} from "../config/databasePool.js";

const DEFAULT_RETENTION_HOURS =
  48;

const MAX_RETENTION_HOURS =
  24 * 30;

function readRetentionHours() {
  const argument =
    process.argv.find(
      (value) =>
        value.startsWith(
          "--hours=",
        ),
    );

  if (!argument) {
    return DEFAULT_RETENTION_HOURS;
  }

  const rawValue =
    argument.split("=")[1];

  const parsedValue =
    Number(rawValue);

  if (
    !Number.isInteger(
      parsedValue,
    ) ||
    parsedValue < 1 ||
    parsedValue >
      MAX_RETENTION_HOURS
  ) {
    throw new Error(
      [
        "Invalid retention period.",
        "Use a whole number between 1 and",
        `${MAX_RETENTION_HOURS} hours.`,
      ].join(" "),
    );
  }

  return parsedValue;
}

function getDryRunMode() {
  return process.argv.includes(
    "--dry-run",
  );
}

function createCutoffDate(
  retentionHours,
) {
  return new Date(
    Date.now() -
      retentionHours *
        60 *
        60 *
        1000,
  );
}

async function countRowsEligibleForDeletion(
  client,
  cutoffDate,
) {
  const queries = [
    {
      tableName:
        "facility_occupancy_events",

      query: `
        SELECT
          COUNT(*)::BIGINT
            AS count

        FROM facility_occupancy_events
          AS occupancy_event

        WHERE
          occupancy_event.recorded_at <
            $1::TIMESTAMPTZ

          /*
           * Preserve an old event if it is still backing the
           * current facility occupancy snapshot.
           */
          AND NOT EXISTS (
            SELECT 1

            FROM facility_current_occupancy
              AS current_occupancy

            WHERE
              current_occupancy.last_event_id =
                occupancy_event.event_id
          );
      `,
    },

    {
      tableName:
        "ambulance_location_events",

      query: `
        SELECT
          COUNT(*)::BIGINT
            AS count

        FROM ambulance_location_events

        WHERE
          recorded_at <
            $1::TIMESTAMPTZ;
      `,
    },

    {
      tableName:
        "dispatch_route_points",

      query: `
        SELECT
          COUNT(*)::BIGINT
            AS count

        FROM dispatch_route_points

        WHERE
          recorded_at <
            $1::TIMESTAMPTZ;
      `,
    },

    {
      tableName:
        "dispatch_status_events",

      query: `
        SELECT
          COUNT(*)::BIGINT
            AS count

        FROM dispatch_status_events

        WHERE
          occurred_at <
            $1::TIMESTAMPTZ;
      `,
    },
  ];

  const result = {};

  for (
    const queryDefinition of
    queries
  ) {
    const queryResult =
      await client.query(
        queryDefinition.query,
        [
          cutoffDate.toISOString(),
        ],
      );

    result[
      queryDefinition.tableName
    ] = Number(
      queryResult.rows[0].count,
    );
  }

  return result;
}

async function deleteExpiredHistoricalRows(
  client,
  cutoffDate,
) {
  const cutoffValue =
    cutoffDate.toISOString();

  const deletedCounts = {};

  const facilityResult =
    await client.query(
      `
        DELETE FROM
          facility_occupancy_events
            AS occupancy_event

        WHERE
          occupancy_event.recorded_at <
            $1::TIMESTAMPTZ

          AND NOT EXISTS (
            SELECT 1

            FROM facility_current_occupancy
              AS current_occupancy

            WHERE
              current_occupancy.last_event_id =
                occupancy_event.event_id
          );
      `,
      [
        cutoffValue,
      ],
    );

  deletedCounts
    .facility_occupancy_events =
    facilityResult.rowCount;

  const ambulanceResult =
    await client.query(
      `
        DELETE FROM
          ambulance_location_events

        WHERE
          recorded_at <
            $1::TIMESTAMPTZ;
      `,
      [
        cutoffValue,
      ],
    );

  deletedCounts
    .ambulance_location_events =
    ambulanceResult.rowCount;

  const routeResult =
    await client.query(
      `
        DELETE FROM
          dispatch_route_points

        WHERE
          recorded_at <
            $1::TIMESTAMPTZ;
      `,
      [
        cutoffValue,
      ],
    );

  deletedCounts
    .dispatch_route_points =
    routeResult.rowCount;

  const statusResult =
    await client.query(
      `
        DELETE FROM
          dispatch_status_events

        WHERE
          occurred_at <
            $1::TIMESTAMPTZ;
      `,
      [
        cutoffValue,
      ],
    );

  deletedCounts
    .dispatch_status_events =
    statusResult.rowCount;

  return deletedCounts;
}

async function run() {
  const retentionHours =
    readRetentionHours();

  const dryRun =
    getDryRunMode();

  const cutoffDate =
    createCutoffDate(
      retentionHours,
    );

  const client =
    await pool.connect();

  try {
    console.log(
      "Starting historical telemetry retention...",
    );

    console.log(
      `Retention window: ${retentionHours} hours`,
    );

    console.log(
      `Cutoff timestamp: ${cutoffDate.toISOString()}`,
    );

    console.log(
      `Mode: ${
        dryRun
          ? "DRY RUN"
          : "DELETE"
      }`,
    );

    if (dryRun) {
      const candidateCounts =
        await countRowsEligibleForDeletion(
          client,
          cutoffDate,
        );

      console.log(
        "\nRows eligible for deletion:",
      );

      console.table(
        candidateCounts,
      );

      console.log(
        "\nDry run completed. No rows were deleted.",
      );

      return;
    }

    await client.query(
      "BEGIN",
    );

    /*
     * Prevent two cleanup processes from deleting the same
     * history rows concurrently.
     */
    await client.query(
      `
        SELECT
          PG_ADVISORY_XACT_LOCK(
            HASHTEXT(
              'medical-monitoring-history-retention'
            )
          );
      `,
    );

    const deletedCounts =
      await deleteExpiredHistoricalRows(
        client,
        cutoffDate,
      );

    await client.query(
      "COMMIT",
    );

    console.log(
      "\nDeleted historical rows:",
    );

    console.table(
      deletedCounts,
    );

    console.log(
      "\nHistorical telemetry retention completed successfully.",
    );
  } catch (error) {
    try {
      await client.query(
        "ROLLBACK",
      );
    } catch {
      // The transaction may not have started in dry-run mode.
    }

    console.error(
      "Historical telemetry retention failed:",
      error,
    );

    process.exitCode = 1;
  } finally {
    client.release();

    await pool.end();
  }
}

run();