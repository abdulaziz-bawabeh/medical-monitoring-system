import { authConfig } from "../config/auth.js";

import {
  verifyAccessToken,
} from "../services/jwtService.js";

import {
  findActiveUserById,
} from "../repositories/authRepository.js";

function sendUnauthorizedResponse(res) {
  return res.status(401).json({
    success: false,
    code: "UNAUTHENTICATED",
    message:
      "Authentication is required or the session has expired.",
  });
}

/**
 * Protects REST API routes.
 *
 * Execution order:
 * 1. Read JWT from HttpOnly Cookie.
 * 2. Verify JWT signature and claims.
 * 3. Load the current user from PostgreSQL.
 * 4. Check token_version.
 * 5. Attach the user to req.user.
 */
export async function authenticate(
  req,
  res,
  next,
) {
  try {
    const token =
      req.cookies?.[authConfig.cookieName];

    if (!token) {
      return sendUnauthorizedResponse(res);
    }

    const payload =
      verifyAccessToken(token);

    if (
      !payload ||
      typeof payload !== "object" ||
      payload.type !== "access" ||
      typeof payload.sub !== "string" ||
      typeof payload.tokenVersion !== "number"
    ) {
      return sendUnauthorizedResponse(res);
    }

    const user =
      await findActiveUserById(payload.sub);

    if (!user) {
      return sendUnauthorizedResponse(res);
    }

    /*
     * A token becomes invalid when the database token_version
     * changes after a password reset or account security action.
     */
    if (
      user.token_version !==
      payload.tokenVersion
    ) {
      return sendUnauthorizedResponse(res);
    }

    if (user.role !== payload.role) {
      return sendUnauthorizedResponse(res);
    }

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
    };

    return next();
  } catch {
    return sendUnauthorizedResponse(res);
  }
}

/**
 * Authorizes one or more roles after authenticate().
 *
 * Example:
 * authorizeRoles("health_manager")
 */
export function authorizeRoles(
  ...allowedRoles
) {
  return function roleAuthorizationMiddleware(
    req,
    res,
    next,
  ) {
    if (!req.user) {
      return sendUnauthorizedResponse(res);
    }

    if (
      !allowedRoles.includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN",
        message:
          "You do not have permission to perform this action.",
      });
    }

    return next();
  };
}