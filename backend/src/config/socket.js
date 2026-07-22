import "dotenv/config";

import cookieParser from "cookie-parser";
import { Server } from "socket.io";

import { authConfig } from "./auth.js";

import {
  verifyAccessToken,
} from "../services/jwtService.js";

import {
  findActiveUserById,
} from "../repositories/authRepository.js";

let io;

/**
 * Creates a consistent authentication error that will be
 * received by the Frontend through the connect_error event.
 */
function createSocketAuthenticationError(
  code,
  message,
) {
  const error = new Error(message);

  error.data = {
    code,
  };

  return error;
}

/**
 * Authenticates one incoming Socket.IO connection.
 *
 * Flow:
 * 1. Read JWT from the HttpOnly Cookie.
 * 2. Verify signature, expiration, issuer and audience.
 * 3. Read the active user from PostgreSQL.
 * 4. Verify token_version and role.
 * 5. Store the safe user object inside socket.data.
 */
async function authenticateSocket(
  socket,
  next,
) {
  try {
    const token =
      socket.request.cookies?.[
        authConfig.cookieName
      ];

    if (!token) {
      return next(
        createSocketAuthenticationError(
          "UNAUTHENTICATED",
          "Authentication is required for the live connection.",
        ),
      );
    }

    const payload =
      verifyAccessToken(token);

    if (
      !payload ||
      typeof payload !== "object" ||
      payload.type !== "access" ||
      typeof payload.sub !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.tokenVersion !== "number"
    ) {
      return next(
        createSocketAuthenticationError(
          "INVALID_SOCKET_TOKEN",
          "The live connection authentication token is invalid.",
        ),
      );
    }

    const user =
      await findActiveUserById(
        payload.sub,
      );

    if (!user) {
      return next(
        createSocketAuthenticationError(
          "USER_NOT_AVAILABLE",
          "The authenticated user is not available.",
        ),
      );
    }

    if (
      user.token_version !==
      payload.tokenVersion
    ) {
      return next(
        createSocketAuthenticationError(
          "TOKEN_REVOKED",
          "The live connection session has been revoked.",
        ),
      );
    }

    if (
      user.role !== payload.role ||
      user.role !== "health_manager"
    ) {
      return next(
        createSocketAuthenticationError(
          "FORBIDDEN",
          "The user is not authorized to access live operations.",
        ),
      );
    }

    /*
     * Only safe user properties are attached.
     * Never attach password_hash or the raw JWT.
     */
    socket.data.user = {
      id: String(user.id),
      email: user.email,
      fullName: user.full_name,
      role: user.role,
    };

    return next();
  } catch {
    return next(
      createSocketAuthenticationError(
        "UNAUTHENTICATED",
        "The live connection session is invalid or has expired.",
      ),
    );
  }
}

export function initializeSocket(
  httpServer,
) {
  io = new Server(httpServer, {
    cors: {
      origin:
        process.env.FRONTEND_URL ||
        "http://localhost:5173",

      methods: [
        "GET",
        "POST",
      ],

      credentials: true,
    },

    connectionStateRecovery: {
      maxDisconnectionDuration:
      1000,

      skipMiddlewares: false,
    },
  });

  /*
   * Parses the Cookie header before the Socket.IO
   * authentication middleware runs.
   *
   * The result becomes available through:
   * socket.request.cookies
   */
  io.engine.use(
    cookieParser(),
  );

  /*
   * Every incoming Socket connection must pass
   * authentication before reaching io.on("connection").
   */
  io.use(authenticateSocket);

  io.on(
    "connection",
    async (socket) => {
      const authenticatedUser =
        socket.data.user;

      /*
       * These rooms are safe because the user already passed
       * authentication and authorization.
       */
      await socket.join(
        `user:${authenticatedUser.id}`,
      );

      await socket.join(
        `role:${authenticatedUser.role}`,
      );

      console.log(
        [
          "Authenticated socket connected:",
          socket.id,
          `user=${authenticatedUser.id}`,
          `role=${authenticatedUser.role}`,
        ].join(" "),
      );

      socket.emit(
        "connection:ready",
        {
          success: true,

          socketId: socket.id,

          recovered:
            socket.recovered,

          message:
            "Authenticated Socket.IO connection established.",

          user: authenticatedUser,

          connectedAt:
            new Date().toISOString(),
        },
      );

      /*
       * Existing test event is preserved.
       * It is now available only to authenticated users.
       */
      socket.on(
        "medical:test-reading",
        (
          reading,
          acknowledge,
        ) => {
          console.log(
            "Authenticated medical test reading received:",
            {
              userId:
                authenticatedUser.id,

              eventId:
                reading?.eventId,
            },
          );

          const response = {
            success: true,

            eventId:
              reading?.eventId ??
              null,

            receivedAt:
              new Date().toISOString(),
          };

          if (
            typeof acknowledge ===
            "function"
          ) {
            acknowledge(response);
          }

          socket.emit(
            "medical:reading-confirmed",
            {
              ...reading,

              serverReceivedAt:
                response.receivedAt,
            },
          );
        },
      );

      socket.on(
        "disconnect",
        (reason) => {
          console.log(
            [
              "Authenticated socket disconnected:",
              socket.id,
              `user=${authenticatedUser.id}`,
              `reason=${reason}`,
            ].join(" "),
          );
        },
      );
    },
  );

  return io;
}

export function getSocketServer() {
  if (!io) {
    throw new Error(
      "Socket.IO server has not been initialized.",
    );
  }

  return io;
}

