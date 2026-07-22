import bcrypt from "bcryptjs";
import {
  input,
  password,
} from "@inquirer/prompts";

/*
 * Supports either:
 *
 * export const pool = ...
 *
 * or:
 *
 * export default pool;
 */
const databaseModule = await import("../config/database.js");

const pool = databaseModule.pool ?? databaseModule.default;

if (!pool || typeof pool.query !== "function") {
  throw new Error(
    "Database pool was not found. database.js must export the pg Pool.",
  );
}

/**
 * bcrypt cost factor.
 *
 * A higher number requires more work to hash and verify passwords.
 * 12 is suitable for this Proof of Concept.
 */
const BCRYPT_ROUNDS = 12;

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function validateEmail(value) {
  const normalizedEmail = normalizeEmail(value);

  if (!normalizedEmail) {
    return "Email address is required.";
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalizedEmail)) {
    return "Enter a valid email address.";
  }

  if (normalizedEmail.length > 320) {
    return "Email address is too long.";
  }

  return true;
}

function validateFullName(value) {
  const normalizedName = value.trim();

  if (normalizedName.length < 2) {
    return "Full name must contain at least 2 characters.";
  }

  if (normalizedName.length > 150) {
    return "Full name must not exceed 150 characters.";
  }

  return true;
}

function validatePassword(value) {
  if (value.length < 12) {
    return "Password must contain at least 12 characters.";
  }

  if (!/[a-z]/.test(value)) {
    return "Password must contain at least one lowercase letter.";
  }

  if (!/[A-Z]/.test(value)) {
    return "Password must contain at least one uppercase letter.";
  }

  if (!/[0-9]/.test(value)) {
    return "Password must contain at least one number.";
  }

  return true;
}

async function collectManagerDetails() {
  const email = await input({
    message: "Manager email:",
    default: "manager@medresponse.org",
    required: true,
    validate: validateEmail,
  });

  const fullName = await input({
    message: "Manager full name:",
    default: "Health Operations Manager",
    required: true,
    validate: validateFullName,
  });

  const managerPassword = await password({
    message: "Manager password:",
    mask: "*",
    validate: validatePassword,
  });

  const passwordConfirmation = await password({
    message: "Confirm manager password:",
    mask: "*",
    validate: (value) => {
      if (!value) {
        return "Password confirmation is required.";
      }

      if (value !== managerPassword) {
        return "Passwords do not match.";
      }

      return true;
    },
  });

  return {
    email: normalizeEmail(email),
    fullName: fullName.trim(),
    password: managerPassword,
    passwordConfirmation,
  };
}

async function saveHealthManager({
  email,
  fullName,
  password: plainPassword,
}) {
  console.log("");
  console.log("Hashing password...");

  const passwordHash = await bcrypt.hash(
    plainPassword,
    BCRYPT_ROUNDS,
  );

  /*
   * ON CONFLICT makes this script reusable.
   *
   * If the email does not exist:
   * - a new account is created.
   *
   * If the email already exists:
   * - the password is replaced;
   * - the account is reactivated;
   * - login failures are cleared;
   * - token_version is increased to invalidate previous tokens.
   */
  const result = await pool.query(
    `
      INSERT INTO users AS existing_user (
        email,
        full_name,
        password_hash,
        role,
        is_active
      )
      VALUES ($1, $2, $3, 'health_manager', TRUE)

      ON CONFLICT (email)
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        password_hash = EXCLUDED.password_hash,
        role = 'health_manager',
        is_active = TRUE,
        token_version = existing_user.token_version + 1,
        failed_login_attempts = 0,
        locked_until = NULL,
        updated_at = NOW()

      RETURNING
        id,
        email,
        full_name,
        role,
        is_active,
        token_version,
        created_at,
        updated_at;
    `,
    [
      email,
      fullName,
      passwordHash,
    ],
  );

  return result.rows[0];
}

async function createHealthManager() {
  console.log("");
  console.log("Create or update the health manager account");
  console.log("-------------------------------------------");
  console.log("");

  const managerDetails = await collectManagerDetails();

  const savedManager = await saveHealthManager(
    managerDetails,
  );

  console.log("");
  console.log("Health manager account saved successfully.");
  console.log("");
  console.log(`ID: ${savedManager.id}`);
  console.log(`Email: ${savedManager.email}`);
  console.log(`Full name: ${savedManager.full_name}`);
  console.log(`Role: ${savedManager.role}`);
  console.log(`Active: ${savedManager.is_active}`);
  console.log(`Token version: ${savedManager.token_version}`);
  console.log("");
}

createHealthManager()
  .catch((error) => {
    console.error("");
    console.error("Failed to create the health manager:");
    console.error(error.message);
    console.error("");

    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });