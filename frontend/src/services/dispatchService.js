import {
  ApiError,
  apiRequest,
} from "./apiClient.js";

import {
  activeDispatchesResponseSchema,
  confirmRecommendationResponseSchema,
  dispatchLifecycleResponseSchema,
  generateRecommendationResponseSchema,
  latestRecommendationResponseSchema,
  rejectRecommendationResponseSchema,
} from "../schemas/dispatchSchemas.js";

function validateResponse(
  schema,
  response,
  errorCode,
  errorMessage,
) {
  const validationResult =
    schema.safeParse(
      response,
    );

  if (
    !validationResult.success
  ) {
    console.error(
      errorCode,
      validationResult
        .error
        .issues,
    );

    throw new ApiError(
      errorMessage,
      {
        code:
          errorCode,

        data:
          validationResult
            .error
            .issues,
      },
    );
  }

  return validationResult.data;
}

function createEventId(
  errorMessage,
) {
  const eventId =
    globalThis.crypto
      ?.randomUUID?.();

  if (!eventId) {
    throw new ApiError(
      errorMessage,
      {
        code:
          "UUID_GENERATION_FAILED",
      },
    );
  }

  return eventId;
}

export async function fetchLatestRecommendation(
  emergencyId,
) {
  const response =
    await apiRequest(
      `/api/emergencies/${emergencyId}/recommendation`,
    );

  const validated =
    validateResponse(
      latestRecommendationResponseSchema,
      response,
      "INVALID_RECOMMENDATION_RESPONSE",
      "The dispatch server returned an unexpected recommendation response.",
    );

  return validated
    .data
    .recommendation;
}

export async function fetchActiveDispatches({
  governorateId = null,
  limit = 50,
} = {}) {
  const query =
    new URLSearchParams();

  if (governorateId) {
    query.set(
      "governorateId",
      String(
        governorateId,
      ),
    );
  }

  query.set(
    "limit",
    String(limit),
  );

  const response =
    await apiRequest(
      `/api/dispatches/active?${query.toString()}`,
    );

  const validated =
    validateResponse(
      activeDispatchesResponseSchema,
      response,
      "INVALID_ACTIVE_DISPATCHES_RESPONSE",
      "The dispatch server returned an unexpected active dispatch response.",
    );

  return validated.data;
}

export async function generateRecommendationRequest(
  emergencyId,
) {
  const eventId =
    createEventId(
      "The browser could not generate a recommendation event identifier.",
    );

  const response =
    await apiRequest(
      `/api/emergencies/${emergencyId}/recommendation`,
      {
        method:
          "POST",

        /*
         * apiClient receives json, not body.
         */
        json: {
          eventId,
        },
      },
    );

  const validated =
    validateResponse(
      generateRecommendationResponseSchema,
      response,
      "INVALID_GENERATE_RECOMMENDATION_RESPONSE",
      "The dispatch server returned an unexpected recommendation creation response.",
    );

  return validated.data;
}

export async function confirmRecommendationRequest(
  recommendationId,
) {
  const eventId =
    createEventId(
      "The browser could not generate a dispatch confirmation event identifier.",
    );

  const response =
    await apiRequest(
      `/api/dispatch-recommendations/${recommendationId}/confirm`,
      {
        method:
          "POST",

        json: {
          eventId,
        },
      },
    );

  const validated =
    validateResponse(
      confirmRecommendationResponseSchema,
      response,
      "INVALID_CONFIRM_RECOMMENDATION_RESPONSE",
      "The dispatch server returned an unexpected confirmation response.",
    );

  return validated.data;
}

export async function rejectRecommendationRequest(
  recommendationId,
  reason,
) {
  const response =
    await apiRequest(
      `/api/dispatch-recommendations/${recommendationId}/reject`,
      {
        method:
          "POST",

        json: {
          reason,
        },
      },
    );

  const validated =
    validateResponse(
      rejectRecommendationResponseSchema,
      response,
      "INVALID_REJECT_RECOMMENDATION_RESPONSE",
      "The dispatch server returned an unexpected rejection response.",
    );

  return validated.data;
}

/*
 * Sends one lifecycle transition request.
 *
 * Supported actions:
 *
 * start
 * arrive
 * complete
 */
async function performDispatchLifecycleRequest(
  dispatchId,
  action,
) {
  const supportedActions =
    new Set([
      "start",
      "arrive",
      "complete",
    ]);

  if (
    !supportedActions.has(
      action,
    )
  ) {
    throw new ApiError(
      `Unsupported dispatch lifecycle action: ${action}.`,
      {
        code:
          "INVALID_DISPATCH_LIFECYCLE_ACTION",
      },
    );
  }

  const eventId =
    createEventId(
      "The browser could not generate a dispatch lifecycle event identifier.",
    );

  const response =
    await apiRequest(
      `/api/dispatches/${dispatchId}/${action}`,
      {
        method:
          "POST",

        json: {
          eventId,
        },
      },
    );

  const validated =
    validateResponse(
      dispatchLifecycleResponseSchema,
      response,
      "INVALID_DISPATCH_LIFECYCLE_RESPONSE",
      "The dispatch server returned an unexpected lifecycle response.",
    );

  return validated.data;
}

export async function startDispatchRequest(
  dispatchId,
) {
  return performDispatchLifecycleRequest(
    dispatchId,
    "start",
  );
}

export async function arriveDispatchRequest(
  dispatchId,
) {
  return performDispatchLifecycleRequest(
    dispatchId,
    "arrive",
  );
}

export async function completeDispatchRequest(
  dispatchId,
) {
  return performDispatchLifecycleRequest(
    dispatchId,
    "complete",
  );
}