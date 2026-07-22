import { create } from "zustand";

import { ApiError } from "../services/apiClient";

import {
  getCurrentUser,
  loginUser,
  logoutUser,
} from "../services/authService";

const initialAuthenticationState = {
  user: null,

  status: "idle",

  hasCheckedSession: false,

  error: null,

  fieldErrors: {},
};

function normalizeAuthenticationError(error) {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      code: error.code,
      status: error.status,
      fieldErrors: error.fieldErrors,
    };
  }

  return {
    message:
      error instanceof Error
        ? error.message
        : "An unexpected authentication error occurred.",

    code: "UNEXPECTED_AUTH_ERROR",

    status: 0,

    fieldErrors: {},
  };
}

export const useAuthStore = create(
  (set, get) => ({
    ...initialAuthenticationState,

    /**
     * Checks whether the browser already has a valid
     * authentication Cookie.
     *
     * This runs once when React starts.
     */
    initializeSession: async () => {
      const currentState = get();

      if (
        currentState.hasCheckedSession ||
        currentState.status === "checking"
      ) {
        return;
      }

      set({
        status: "checking",
        error: null,
      });

      try {
        const response =
          await getCurrentUser();

        set({
          user: response.data.user,
          status: "authenticated",
          hasCheckedSession: true,
          error: null,
          fieldErrors: {},
        });
      } catch (error) {
        const normalizedError =
          normalizeAuthenticationError(error);

        /*
         * A 401 response is expected when the visitor
         * has not signed in yet.
         */
        if (
          normalizedError.status !== 401
        ) {
          console.error(
            "Session initialization failed:",
            normalizedError,
          );
        }

        set({
          user: null,
          status: "unauthenticated",
          hasCheckedSession: true,
          error:
            normalizedError.status === 401
              ? null
              : normalizedError.message,
          fieldErrors: {},
        });
      }
    },

    /**
     * Sends Login credentials to the Backend.
     */
    login: async (credentials) => {
      set({
        status: "authenticating",
        error: null,
        fieldErrors: {},
      });

      try {
        const response =
          await loginUser(credentials);

        set({
          user: response.data.user,
          status: "authenticated",
          hasCheckedSession: true,
          error: null,
          fieldErrors: {},
        });

        return {
          success: true,
          user: response.data.user,
        };
      } catch (error) {
        const normalizedError =
          normalizeAuthenticationError(error);

        set({
          user: null,
          status: "unauthenticated",
          hasCheckedSession: true,
          error: normalizedError.message,
          fieldErrors:
            normalizedError.fieldErrors,
        });

        return {
          success: false,
          error: normalizedError.message,
          fieldErrors:
            normalizedError.fieldErrors,
        };
      }
    },

    /**
     * Clears the HttpOnly Cookie through the Backend,
     * then removes the user from Zustand.
     */
    logout: async () => {
      set({
        status: "signing_out",
        error: null,
      });

      try {
        await logoutUser();
      } catch (error) {
        console.error(
          "Backend logout request failed:",
          error,
        );
      } finally {
        set({
          ...initialAuthenticationState,
          status: "unauthenticated",
          hasCheckedSession: true,
        });
      }
    },

    clearAuthenticationError: () => {
      set({
        error: null,
        fieldErrors: {},
      });
    },
  }),
);