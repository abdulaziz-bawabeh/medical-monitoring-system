import "dotenv/config";

import {
  Pool,
} from "pg";

const databaseUrl =
  process.env.DATABASE_URL
    ?.trim();

const localDatabaseVariables = [
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
];

function requireLocalDatabaseVariables() {
  for (
    const variableName of
    localDatabaseVariables
  ) {
    const value =
      process.env[
        variableName
      ];

    if (
      !value ||
      !value.trim()
    ) {
      throw new Error(
        [
          "Missing required database environment variable:",
          variableName,
        ].join(" "),
      );
    }
  }
}

function readPositiveInteger(
  variableName,
  defaultValue,
) {
  const rawValue =
    process.env[
      variableName
    ];

  if (
    rawValue === undefined ||
    rawValue.trim() === ""
  ) {
    return defaultValue;
  }

  const parsedValue =
    Number(rawValue);

  if (
    !Number.isInteger(
      parsedValue,
    ) ||
    parsedValue <= 0
  ) {
    throw new Error(
      `${variableName} must be a positive integer.`,
    );
  }

  return parsedValue;
}

/*
 * During local development, the connection uses:
 *
 * DB_HOST
 * DB_PORT
 * DB_NAME
 * DB_USER
 * DB_PASSWORD
 *
 * In production, providers such as Neon supply:
 *
 * DATABASE_URL
 */
if (!databaseUrl) {
  requireLocalDatabaseVariables();
}

const poolConfiguration =
  databaseUrl
    ? {
        connectionString:
          databaseUrl,

        max:
          readPositiveInteger(
            "DB_POOL_MAX",
            10,
          ),

        idleTimeoutMillis:
          readPositiveInteger(
            "DB_IDLE_TIMEOUT_MILLIS",
            30_000,
          ),

        connectionTimeoutMillis:
          readPositiveInteger(
            "DB_CONNECTION_TIMEOUT_MILLIS",
            10_000,
          ),
      }
    : {
        host:
          process.env.DB_HOST,

        port:
          Number(
            process.env.DB_PORT,
          ),

        database:
          process.env.DB_NAME,

        user:
          process.env.DB_USER,

        password:
          process.env.DB_PASSWORD,

        max:
          readPositiveInteger(
            "DB_POOL_MAX",
            10,
          ),

        idleTimeoutMillis:
          readPositiveInteger(
            "DB_IDLE_TIMEOUT_MILLIS",
            30_000,
          ),

        connectionTimeoutMillis:
          readPositiveInteger(
            "DB_CONNECTION_TIMEOUT_MILLIS",
            5_000,
          ),
      };

const pool =
  new Pool(
    poolConfiguration,
  );

pool.on(
  "error",
  (error) => {
    console.error(
      "Unexpected PostgreSQL pool error:",
      error,
    );
  },
);

export async function testDatabaseConnection() {
  const client =
    await pool.connect();

  try {
    const result =
      await client.query(`
        SELECT
          current_database()
            AS database_name,

          current_user
            AS database_user,

          PostGIS_Version()
            AS postgis_version,

          NOW()
            AS connected_at;
      `);

    return result.rows[0];
  } finally {
    client.release();
  }
}

export {
  pool,
};

export default pool;