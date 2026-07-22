import "dotenv/config";

const REQUIRED_ENVIRONMENT_VARIABLES = [
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "JWT_REMEMBER_EXPIRES_IN",
  "JWT_COOKIE_NAME",
  "JWT_ISSUER",
  "JWT_AUDIENCE",
];

for (const variableName of REQUIRED_ENVIRONMENT_VARIABLES) {
  const value = process.env[variableName];

  if (!value || !value.trim()) {
    throw new Error(
      `Missing required authentication environment variable: ${variableName}`,
    );
  }
}

if (process.env.JWT_SECRET.length < 64) {
  throw new Error(
    "JWT_SECRET must contain at least 64 characters.",
  );
}

function parseSameSite(value) {
  const normalizedValue = value.trim().toLowerCase();

  const allowedValues = [
    "lax",
    "strict",
    "none",
  ];

  if (!allowedValues.includes(normalizedValue)) {
    throw new Error(
      "JWT_COOKIE_SAME_SITE must be lax, strict, or none.",
    );
  }

  return normalizedValue;
}

/**
 * Converts short duration strings to milliseconds.
 *
 * Supported examples:
 * 30s
 * 15m
 * 8h
 * 2d
 */
export function durationToMilliseconds(duration) {
  const match = /^(\d+)(s|m|h|d)$/i.exec(
    duration.trim(),
  );

  if (!match) {
    throw new Error(
      `Invalid duration "${duration}". Use values such as 30m, 8h, or 2d.`,
    );
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const millisecondsByUnit = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * millisecondsByUnit[unit];
}

const isProduction =
  process.env.NODE_ENV === "production";

const cookieSameSite = parseSameSite(
  process.env.JWT_COOKIE_SAME_SITE ?? "lax",
);

if (
  cookieSameSite === "none" &&
  !isProduction
) {
  throw new Error(
    "SameSite=None should only be used with a Secure production cookie.",
  );
}

export const authConfig = Object.freeze({
  jwtSecret: process.env.JWT_SECRET,

  standardExpiresIn:
    process.env.JWT_EXPIRES_IN,

  rememberExpiresIn:
    process.env.JWT_REMEMBER_EXPIRES_IN,

  cookieName:
    process.env.JWT_COOKIE_NAME,

  issuer:
    process.env.JWT_ISSUER,

  audience:
    process.env.JWT_AUDIENCE,

  cookieSameSite,

  isProduction,
});

/*
 * Validate the duration values when the server starts.
 * This causes configuration errors to appear immediately.
 */
durationToMilliseconds(
  authConfig.standardExpiresIn,
);

durationToMilliseconds(
  authConfig.rememberExpiresIn,
);

export function getTokenDuration(rememberMe) {
  return rememberMe
    ? authConfig.rememberExpiresIn
    : authConfig.standardExpiresIn;
}

export function getTokenDurationMilliseconds(
  rememberMe,
) {
  return durationToMilliseconds(
    getTokenDuration(rememberMe),
  );
}