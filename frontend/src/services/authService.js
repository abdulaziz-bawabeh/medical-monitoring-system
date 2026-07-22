import { apiRequest } from "./apiClient.js";

import {
  currentUserResponseSchema,
  loginResponseSchema,
  logoutResponseSchema,
} from "../schemas/authSchemas.js";

function parseBackendResponse(schema, response) {
  const validationResult =
    schema.safeParse(response);

  if (!validationResult.success) {
    console.error(
      "Invalid Backend authentication response:",
      validationResult.error.issues,
    );

    throw new Error(
      "The authentication server returned an unexpected response.",
    );
  }

  return validationResult.data;
}

export async function loginUser(credentials) {
  const response = await apiRequest(
    "/api/auth/login",
    {
      method: "POST",
      json: credentials,
    },
  );

  return parseBackendResponse(
    loginResponseSchema,
    response,
  );
}

export async function getCurrentUser() {
  const response = await apiRequest(
    "/api/auth/me",
  );

  return parseBackendResponse(
    currentUserResponseSchema,
    response,
  );
}

export async function logoutUser() {
  const response = await apiRequest(
    "/api/auth/logout",
    {
      method: "POST",
    },
  );

  return parseBackendResponse(
    logoutResponseSchema,
    response,
  );
}