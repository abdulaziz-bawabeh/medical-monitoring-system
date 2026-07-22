import "dotenv/config";

import {
  createServer,
} from "node:http";

import app from "./app.js";

import pool, {
  testDatabaseConnection,
} from "./config/database.js";

import {
  initializeSocket,
} from "./config/socket.js";

import {
  initializeSimulationRuntime,
} from "./services/simulationService.js";

const PORT =
  Number(
    process.env.PORT,
  ) || 5000;

const HOST =
  process.env.HOST ||
  "0.0.0.0";

const httpServer =
  createServer(app);

initializeSocket(
  httpServer,
);

async function startServer() {
  try {
    const databaseInfo =
      await testDatabaseConnection();

    console.log(
      "----------------------------------------",
    );

    console.log(
      "PostgreSQL connected successfully",
    );

    console.log(
      `Database: ${databaseInfo.database_name}`,
    );

    console.log(
      `Database user: ${databaseInfo.database_user}`,
    );

    console.log(
      `PostGIS: ${databaseInfo.postgis_version}`,
    );

    console.log(
      "----------------------------------------",
    );

    await initializeSimulationRuntime();

    httpServer.listen(
      PORT,
      HOST,
      () => {
        console.log(
          "Medical Monitoring Backend",
        );

        console.log(
          `HTTP and Socket.IO server listening on ${HOST}:${PORT}`,
        );

        console.log(
          `Environment: ${
            process.env.NODE_ENV ||
            "development"
          }`,
        );

        console.log(
          "----------------------------------------",
        );
      },
    );
  } catch (error) {
    console.error(
      "----------------------------------------",
    );

    console.error(
      "Failed to start the Backend",
    );

    console.error(
      error instanceof Error
        ? error.message
        : error,
    );

    console.error(
      "----------------------------------------",
    );

    await pool.end();

    process.exit(1);
  }
}

async function shutdown(
  signal,
) {
  console.log(
    `${signal} received. Shutting down...`,
  );

  httpServer.close(
    async (error) => {
      if (error) {
        console.error(
          "HTTP shutdown error:",
          error,
        );

        process.exit(1);
      }

      await pool.end();

      console.log(
        "HTTP server, Socket.IO and PostgreSQL pool closed.",
      );

      process.exit(0);
    },
  );
}

process.on(
  "SIGINT",
  () => {
    void shutdown(
      "SIGINT",
    );
  },
);

process.on(
  "SIGTERM",
  () => {
    void shutdown(
      "SIGTERM",
    );
  },
);

void startServer();