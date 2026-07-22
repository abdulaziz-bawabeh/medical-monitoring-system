import rateLimit from "express-rate-limit";

/**
 * Limits repeated Login requests from one IP address.
 *
 * This is separate from the account lock stored in PostgreSQL:
 *
 * Rate limiter:
 * protects the endpoint and server.
 *
 * failed_login_attempts:
 * protects the individual account.
 */
export const loginRateLimiter =
  rateLimit({
    windowMs: 15 * 60 * 1000,

    max: 20,

    standardHeaders: true,

    legacyHeaders: false,

    message: {
      success: false,
      code: "TOO_MANY_LOGIN_ATTEMPTS",
      message:
        "Too many sign-in attempts. Please try again later.",
    },
  });