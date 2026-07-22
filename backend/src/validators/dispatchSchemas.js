import {
    z,
  } from "zod";
  
  const numericIdentifierSchema =
    z.string()
      .trim()
      .regex(
        /^\d+$/,
        "Identifier must contain digits only.",
      );
  
  export const emergencyRecommendationParameterSchema =
    z.object({
      emergencyId:
        numericIdentifierSchema,
    });
  
  export const recommendationParameterSchema =
    z.object({
      recommendationId:
        numericIdentifierSchema,
    });
  
    export const dispatchParameterSchema =
  z.object({
    dispatchId:
      numericIdentifierSchema,
  });

export const dispatchTransitionBodySchema =
  z
    .object({
      /*
       * Used to make each lifecycle command idempotent.
       *
       * Repeating the same eventId must not create another
       * dispatch status event.
       */
      eventId: z
        .string()
        .uuid(
          "Dispatch transition event ID must be a valid UUID.",
        ),
    })
    .strict();

  export const generateRecommendationBodySchema =
    z.object({
      eventId: z
        .string()
        .uuid(
          "Event ID must be a valid UUID.",
        ),
    })
      .strict();
  
  export const confirmRecommendationBodySchema =
    z.object({
      eventId: z
        .string()
        .uuid(
          "Dispatch event ID must be a valid UUID.",
        ),
    })
      .strict();
  
  export const rejectRecommendationBodySchema =
    z.object({
      reason: z
        .string()
        .trim()
        .min(
          5,
          "Rejection reason must contain at least 5 characters.",
        )
        .max(
          500,
          "Rejection reason must not exceed 500 characters.",
        ),
    })
      .strict();
  
  export const activeDispatchListQuerySchema =
    z.object({
      governorateId: z
        .coerce
        .number()
        .int()
        .positive()
        .optional(),
  
      limit: z
        .coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(50),
    });