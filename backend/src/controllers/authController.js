import bcrypt from "bcryptjs";

import { authConfig } from "../config/auth.js";

import {
  findUserByEmail,
  recordFailedLogin,
  recordSuccessfulLogin,
} from "../repositories/authRepository.js";

import {
  createAccessToken,
  getAuthenticationCookieOptions,
  getClearCookieOptions,
} from "../services/jwtService.js";

import {
  loginRequestSchema,
} from "../validators/authSchemas.js";

/*
 * Used to reduce the timing difference between:
 * - an unknown email;
 * - an existing email with an incorrect password.
 *
 * This value is generated only in memory when the server starts.
 */
const DUMMY_PASSWORD_HASH =
  bcrypt.hashSync(
    "not-a-real-user-password",
    12,
  );

function mapValidationErrors(zodError) {
  const fieldErrors = {};

  for (const issue of zodError.issues) {
    const fieldName = issue.path[0];

    if (
      fieldName &&
      !fieldErrors[fieldName]
    ) {
      fieldErrors[fieldName] =
        issue.message;
    }
  }

  return fieldErrors;
}

function mapPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName:
      user.full_name ??
      user.fullName,
    role: user.role,
    lastLoginAt:
      user.last_login_at ??
      user.lastLoginAt ??
      null,
  };
}

function sendInvalidCredentials(res) {
  return res.status(401).json({
    success: false,
    code: "INVALID_CREDENTIALS",
    message:
      "The email address or password is incorrect.",
  });
}

/**
 * POST /api/auth/login
 */
export async function login(
  req,
  res,
  next,
) {
  try {
    res.setHeader(
      "Cache-Control",
      "no-store",
    );

    const validationResult =
      loginRequestSchema.safeParse(
        req.body,
      );

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message:
          "The submitted login data is invalid.",
        fieldErrors:
          mapValidationErrors(
            validationResult.error,
          ),
      });
    }

    const {
      email,
      password,
      rememberMe,
    } = validationResult.data;

    const user =
      await findUserByEmail(email);

    if (!user) {
      /*
       * Run one bcrypt comparison even for an unknown email
       * to reduce observable timing differences.
       */
      await bcrypt.compare(
        password,
        DUMMY_PASSWORD_HASH,
      );

      return sendInvalidCredentials(res);
    }

    if (!user.is_active) {
      return sendInvalidCredentials(res);
    }

    const currentTime = Date.now();

    const lockedUntilTime =
      user.locked_until
        ? new Date(
            user.locked_until,
          ).getTime()
        : null;

    if (
      lockedUntilTime &&
      lockedUntilTime > currentTime
    ) {
      return res.status(423).json({
        success: false,
        code: "ACCOUNT_TEMPORARILY_LOCKED",
        message:
          "This account is temporarily locked after repeated failed sign-in attempts.",
        retryAt:
          new Date(
            user.locked_until,
          ).toISOString(),
      });
    }

    const passwordMatches =
      await bcrypt.compare(
        password,
        user.password_hash,
      );

    if (!passwordMatches) {
      await recordFailedLogin(user.id);

      return sendInvalidCredentials(res);
    }

    const loginRecord =
      await recordSuccessfulLogin(
        user.id,
      );

    const accessToken =
      createAccessToken(
        user,
        rememberMe,
      );

    res.cookie(
      authConfig.cookieName,
      accessToken,
      getAuthenticationCookieOptions(
        rememberMe,
      ),
    );

    return res.status(200).json({
      success: true,
      message:
        "Signed in successfully.",
      data: {
        user: mapPublicUser({
          ...user,
          last_login_at:
            loginRecord?.last_login_at ??
            null,
        }),
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/auth/me
 *
 * authenticate middleware has already loaded
 * the current user into req.user.
 */
export async function getCurrentUser(
  req,
  res,
) {
  res.setHeader(
    "Cache-Control",
    "no-store",
  );

  return res.status(200).json({
    success: true,
    data: {
      user: mapPublicUser(req.user),
    },
  });
}

/**
 * POST /api/auth/logout
 *
 * The JWT is removed from the browser by clearing
 * the HttpOnly Cookie.
 */
export async function logout(
  req,
  res,
) {
  res.clearCookie(
    authConfig.cookieName,
    getClearCookieOptions(),
  );

  res.setHeader(
    "Cache-Control",
    "no-store",
  );

  return res.status(200).json({
    success: true,
    message:
      "Signed out successfully.",
  });
}