import jwt from "jsonwebtoken";

import {
  authConfig,
  getTokenDuration,
  getTokenDurationMilliseconds,
} from "../config/auth.js";

/**
 * Creates a signed access token for one authenticated user.
 */
export function createAccessToken(
  user,
  rememberMe = false,
) {
  return jwt.sign(
    {
      type: "access",
      role: user.role,
      tokenVersion: user.token_version,
    },
    authConfig.jwtSecret,
    {
      algorithm: "HS256",

      subject: String(user.id),

      issuer: authConfig.issuer,

      audience: authConfig.audience,

      expiresIn: getTokenDuration(rememberMe),
    },
  );
}

/**
 * Verifies:
 * - JWT signature
 * - accepted algorithm
 * - expiration time
 * - issuer
 * - audience
 */
export function verifyAccessToken(token) {
  return jwt.verify(
    token,
    authConfig.jwtSecret,
    {
      algorithms: ["HS256"],
      issuer: authConfig.issuer,
      audience: authConfig.audience,
    },
  );
}

/**
 * Options used when setting the authentication cookie.
 */
export function getAuthenticationCookieOptions(
  rememberMe = false,
) {
  return {
    httpOnly: true,

    /*
     * false locally because localhost uses HTTP.
     * true automatically in production.
     */
    secure: authConfig.isProduction,

    sameSite: authConfig.cookieSameSite,

    path: "/",

    maxAge:
      getTokenDurationMilliseconds(rememberMe),
  };
}

/**
 * clearCookie must use the same identifying options
 * used when the original cookie was created.
 */
export function getClearCookieOptions() {
  return {
    httpOnly: true,
    secure: authConfig.isProduction,
    sameSite: authConfig.cookieSameSite,
    path: "/",
  };
}