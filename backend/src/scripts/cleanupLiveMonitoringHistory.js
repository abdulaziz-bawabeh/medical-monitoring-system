import { pool } from "../config/databasePool.js";

async function cleanupLiveMonitoringHistory() {
  console.log("");
  console.log(
    "Starting live monitoring history cleanup...",
  );

  const result = await pool.query(`
    SELECT
      deleted_occupancy_events,
      deleted_ambulance_location_events
    FROM cleanup_live_monitoring_history();
  `);

  const cleanupResult = result.rows[0];

  console.log("");
  console.log(
    "Live monitoring history cleanup completed.",
  );

  console.log(
    `Deleted occupancy events: ${
      cleanupResult.deleted_occupancy_events
    }`,
  );

  console.log(
    `Deleted ambulance location events: ${
      cleanupResult.deleted_ambulance_location_events
    }`,
  );

  console.log("");
}

cleanupLiveMonitoringHistory()
  .catch((error) => {
    console.error("");
    console.error(
      "Live monitoring history cleanup failed:",
    );

    console.error(error.message);
    console.error("");

    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });