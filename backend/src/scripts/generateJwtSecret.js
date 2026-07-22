import { randomBytes } from "node:crypto";

/**
 * Generates a cryptographically random secret for signing JWT tokens.
 *
 * The generated value must be stored only in backend/.env.
 * Never place the real value in .env.example or commit it to Git.
 */
function generateJwtSecret() {
  return randomBytes(64).toString("base64url");
}

const jwtSecret = generateJwtSecret();

console.log("");
console.log("JWT secret generated successfully.");
console.log("");
console.log("Copy the following value into backend/.env:");
console.log("");
console.log(jwtSecret);
console.log("");
console.log("Do not share this value or commit it to Git.");
console.log("");