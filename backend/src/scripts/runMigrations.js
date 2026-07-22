import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/*
 * This dynamic import supports either of these exports
 * from database.js:
 *
 * export const pool = ...
 *
 * or:
 *
 * export default pool;
 */
const databaseModule = await import("../config/database.js");

const pool = databaseModule.pool ?? databaseModule.default;

if (!pool || typeof pool.connect !== "function") {
  throw new Error(
    "Database pool was not found. database.js must export the pg Pool as a named export called pool or as the default export.",
  );
}

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);

const migrationsDirectory = path.resolve(
  currentDirectory,
  "../migrations",
);

/**
 * Creates the internal table used to remember which migrations
 * have already been applied.
 */
async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      migration_name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

/**
 * Reads all SQL migration files in numerical order.
 *
 * Examples:
 * 001_create_users_table.sql
 * 002_create_alerts_table.sql
 * 003_create_ambulances_table.sql
 */
async function getMigrationFiles() {
  const directoryEntries = await readdir(migrationsDirectory, {
    withFileTypes: true,
  });

  return directoryEntries
    .filter(
      (entry) =>
        entry.isFile() &&
        /^\d+_[a-z0-9_]+\.sql$/i.test(entry.name),
    )
    .map((entry) => entry.name)
    .sort((firstName, secondName) =>
      firstName.localeCompare(secondName),
    );
}

/**
 * Returns true when a migration was previously applied.
 */
async function isMigrationApplied(client, migrationName) {
  const result = await client.query(
    `
      SELECT 1
      FROM schema_migrations
      WHERE migration_name = $1
      LIMIT 1;
    `,
    [migrationName],
  );

  return result.rowCount > 0;
}

/**
 * Executes one migration inside a database transaction.
 *
 * If any SQL statement fails:
 * - all changes from that migration are rolled back;
 * - the migration is not recorded as completed.
 */
async function applyMigration(client, migrationName) {
  const migrationPath = path.join(
    migrationsDirectory,
    migrationName,
  );

  const migrationSql = await readFile(migrationPath, "utf8");

  await client.query("BEGIN");

  try {
    await client.query(migrationSql);

    await client.query(
      `
        INSERT INTO schema_migrations (migration_name)
        VALUES ($1);
      `,
      [migrationName],
    );

    await client.query("COMMIT");

    console.log(`Migration applied: ${migrationName}`);
  } catch (error) {
    await client.query("ROLLBACK");

    throw new Error(
      `Migration failed: ${migrationName}\n${error.message}`,
      {
        cause: error,
      },
    );
  }
}

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log("Connecting to PostgreSQL...");
    console.log("Checking migration history...");

    await ensureMigrationsTable(client);

    const migrationFiles = await getMigrationFiles();

    if (migrationFiles.length === 0) {
      console.log("No migration files were found.");
      return;
    }

    for (const migrationName of migrationFiles) {
      const alreadyApplied = await isMigrationApplied(
        client,
        migrationName,
      );

      if (alreadyApplied) {
        console.log(`Migration skipped: ${migrationName}`);
        continue;
      }

      await applyMigration(client, migrationName);
    }

    console.log("Database migrations completed successfully.");
  } finally {
    client.release();
  }
}

runMigrations()
  .catch((error) => {
    console.error("Database migration error:");
    console.error(error.message);

    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });