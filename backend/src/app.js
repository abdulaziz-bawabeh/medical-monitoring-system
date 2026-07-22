import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import liveMonitoringRoutes from "./routes/liveMonitoringRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import emergencyRoutes from "./routes/emergencyRoutes.js";
import { pool } from "./config/databasePool.js";
import dispatchRecommendationRoutes from "./routes/dispatchRecommendationRoutes.js";
import dispatchRoutes from "./routes/dispatchRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import historyRoutes from "./routes/historyRoutes.js";
import simulationRoutes from "./routes/simulationRoutes.js";
import recoveryRoutes from "./routes/recoveryRoutes.js";

const app = express();

const frontendUrl =
  process.env.FRONTEND_URL ??
  "http://localhost:5173";

const isProduction =
  process.env.NODE_ENV === "production";

/*
 * Security-related HTTP headers.
 */
app.use(helmet());

/*
 * An exact origin is required when Cookies and
 * credentials are enabled.
 */
app.use(
  cors({
    origin: frontendUrl,

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  }),
);

/*
 * Request body parsers.
 */
app.use(
  express.json({
    limit: "1mb",
  }),
);

app.use(
  express.urlencoded({
    extended: false,
  }),
);

/*
 * Reads the Cookie request header and makes
 * Cookies available through req.cookies.
 */
app.use(cookieParser());

/*
 * HTTP request logging.
 */
app.use(
  morgan(
    isProduction
      ? "combined"
      : "dev",
  ),
);

/*
 * Root endpoint.
 */
app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message:
      "Interactive Medical Monitoring and Response System API",
  });
});

/*
 * Database and PostGIS health check.
 */
app.get(
  "/api/health",
  async (req, res, next) => {
    try {
      const result =
        await pool.query(`
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

      return res.status(200).json({
        success: true,
        status: "healthy",
        data: result.rows[0],
      });
    } catch (error) {
      return next(error);
    }
  },
);

/*
 * Authentication endpoints.
 */
app.use(
  "/api/auth",
  authRoutes,
);

app.use(
  "/api/emergencies",
  emergencyRoutes,
);

app.use(
  "/api/alerts",
  alertRoutes,
);

app.use(
  "/api/dispatch-recommendations",
  dispatchRecommendationRoutes,
);

app.use(
  "/api/dispatches",
  dispatchRoutes,
);

app.use(
  "/api/dashboard",
  dashboardRoutes,
);

app.use(
  "/api/feed",
  liveMonitoringRoutes,
);

app.use(
  "/api/history",
  historyRoutes,
);

app.use(
  "/api/simulation",
  simulationRoutes,
);

app.use(
  "/api/recovery",
  recoveryRoutes,
);

/*
 * 404 handler.
 *
 * This must remain after all valid routes.
 */
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    code: "ROUTE_NOT_FOUND",
    message:
      "The requested API endpoint was not found.",
  });
});

/*
 * Global error handler.
 *
 * Express identifies an error handler through
 * the four parameters below.
 */
app.use(
  (
    error,
    req,
    res,
    next,
  ) => {
    void next;

    console.error(
      "Unhandled application error:",
      error,
    );

    const statusCode =
  Number.isInteger(
    error.statusCode,
  )
    ? error.statusCode
    : 500;

const response = {
  success: false,

  code:
    statusCode === 500
      ? "INTERNAL_SERVER_ERROR"
      : error.code ||
        "REQUEST_ERROR",

  message:
    statusCode === 500
      ? "An unexpected server error occurred."
      : error.message,
};

if (
  statusCode !== 500 &&
  error.details
) {
  response.details =
    error.details;
}

if (
  !isProduction &&
  error.message
) {
  response.developmentMessage =
    error.message;
}

    return res
      .status(statusCode)
      .json(response);
  },
);

export default app;