import { pool } from "../config/databasePool.js";

/**
 * Returns the user required for checking credentials.
 *
 * This function is used only during Login because it returns
 * password_hash.
 */
export async function findUserByEmail(email) {
  const result = await pool.query(
    `
      SELECT
        id,
        email,
        full_name,
        password_hash,
        role,
        is_active,
        token_version,
        failed_login_attempts,
        locked_until
      FROM users
      WHERE email = $1
      LIMIT 1;
    `,
    [email],
  );

  return result.rows[0] ?? null;
}

/**
 * Used after JWT verification.
 *
 * password_hash is intentionally not selected.
 */
export async function findActiveUserById(userId) {
  const result = await pool.query(
    `
      SELECT
        id,
        email,
        full_name,
        role,
        is_active,
        token_version,
        last_login_at,
        created_at,
        updated_at
      FROM users
      WHERE id = $1
        AND is_active = TRUE
      LIMIT 1;
    `,
    [userId],
  );

  return result.rows[0] ?? null;
}

/**
 * Records a failed login.
 *
 * After five failed attempts, the account is locked
 * for fifteen minutes.
 */
export async function recordFailedLogin(
  userId,
  maximumAttempts = 5,
  lockDurationMinutes = 15,
) {
  const result = await pool.query(
    `
      UPDATE users
      SET
        failed_login_attempts =
          failed_login_attempts + 1,

        locked_until =
          CASE
            WHEN failed_login_attempts + 1 >= $2
            THEN NOW() + ($3 * INTERVAL '1 minute')
            ELSE locked_until
          END,

        updated_at = NOW()
      WHERE id = $1
      RETURNING
        failed_login_attempts,
        locked_until;
    `,
    [
      userId,
      maximumAttempts,
      lockDurationMinutes,
    ],
  );

  return result.rows[0] ?? null;
}

/**
 * Clears failed attempts after a successful Login
 * and saves the latest successful login time.
 */
export async function recordSuccessfulLogin(
  userId,
) {
  const result = await pool.query(
    `
      UPDATE users
      SET
        failed_login_attempts = 0,
        locked_until = NULL,
        last_login_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        last_login_at;
    `,
    [userId],
  );

  return result.rows[0] ?? null;
}