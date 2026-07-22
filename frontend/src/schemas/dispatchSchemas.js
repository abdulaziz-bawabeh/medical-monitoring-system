import {
  z,
} from "zod";

import {
  emergencyCaseSchema,
  emergencyStatusSchema,
  operationalAlertSchema,
} from "./emergencyAlertSchemas.js";

const idSchema = z
  .union([
    z.string(),
    z.number(),
  ])
  .transform(
    (value) => String(value),
  );

const dateTimeSchema = z
  .string()
  .datetime({
    offset: true,
  });

const payloadSchema = z.record(
  z.string(),
  z.unknown(),
);

export const recommendationStatusSchema =
  z.enum([
    "PENDING",
    "CONFIRMED",
    "REJECTED",
    "EXPIRED",
    "SUPERSEDED",
  ]);

export const dispatchStatusSchema =
  z.enum([
    "ASSIGNED",
    "EN_ROUTE",
    "ARRIVED",
    "COMPLETED",
    "CANCELLED",
  ]);

export const ambulanceOperationalStatusSchema =
  z.enum([
    "AVAILABLE",
    "BUSY",
    "OFFLINE",
    "MAINTENANCE",
  ]);

const locationSchema = z.object({
  longitude: z
    .number()
    .min(-180)
    .max(180),

  latitude: z
    .number()
    .min(-90)
    .max(90),
});

const ambulanceStatusCoreSchema =
  z.object({
    code: z
      .string()
      .min(1),

    status:
      ambulanceOperationalStatusSchema,

    isOperational:
      z.boolean(),

    updatedAt:
      dateTimeSchema,
  });

/*
 * Socket.IO ambulance status event.
 *
 * Backend Socket events identify the ambulance with
 * ambulanceId and include the related dispatchId.
 */
export const ambulanceStatusSocketEventSchema =
  ambulanceStatusCoreSchema
    .extend({
      ambulanceId:
        idSchema,

      dispatchId:
        idSchema,
    });

/*
 * HTTP responses may return either:
 *
 * id
 * ambulanceId
 *
 * The schema accepts both forms and requires at least one.
 */
export const ambulanceStatusResponseSchema =
  ambulanceStatusCoreSchema
    .extend({
      id:
        idSchema
          .optional(),

      ambulanceId:
        idSchema
          .optional(),

      dispatchId:
        idSchema
          .optional(),
    })
    .superRefine(
      (
        value,
        context,
      ) => {
        if (
          !value.id &&
          !value.ambulanceId
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "ambulanceId",
            ],

            message:
              "The ambulance status response must contain id or ambulanceId.",
          });
        }
      },
    );

export const dispatchRecommendationSchema =
  z.object({
    id:
      idSchema,

    eventId: z
      .string()
      .uuid(),

    status:
      recommendationStatusSchema,

    isExpired:
      z.boolean(),

    distanceMeters: z
      .number()
      .nonnegative(),

    distanceKilometers: z
      .number()
      .nonnegative(),

    ambulanceLocationAgeSeconds: z
      .number()
      .int()
      .nonnegative(),

    maxLocationAgeSeconds: z
      .number()
      .int()
      .positive(),

    generatedAt:
      dateTimeSchema,

    expiresAt:
      dateTimeSchema,

    emergencyCase:
      z.object({
        id:
          idSchema,

        caseNumber: z
          .string()
          .min(1),

        summary: z
          .string()
          .min(1),

        status:
          emergencyStatusSchema,

        location:
          locationSchema,
      }),

    ambulance:
      z.object({
        id:
          idSchema,

        code: z
          .string()
          .min(1),

        status:
          ambulanceOperationalStatusSchema,

        isOperational:
          z.boolean(),

        location:
          locationSchema,

        locationRecordedAt:
          dateTimeSchema,
      }),

    requestedBy:
      z.object({
        id:
          idSchema,

        name: z
          .string()
          .min(1),
      }),

    confirmedBy:
      z
        .object({
          id:
            idSchema,

          name: z
            .string()
            .min(1),

          confirmedAt:
            dateTimeSchema,
        })
        .nullable(),

    rejectedBy:
      z
        .object({
          id:
            idSchema,

          name: z
            .string()
            .min(1),

          rejectedAt:
            dateTimeSchema,

          reason: z
            .string()
            .nullable(),
        })
        .nullable(),

    payload:
      payloadSchema,

    createdAt:
      dateTimeSchema,

    updatedAt:
      dateTimeSchema,
  });

export const ambulanceDispatchSchema =
  z.object({
    id:
      idSchema,

    eventId: z
      .string()
      .uuid(),

    dispatchNumber: z
      .string()
      .min(1),

    status:
      dispatchStatusSchema,

    recommendationId:
      idSchema,

    assignedDistanceMeters: z
      .number()
      .nonnegative(),

    assignedDistanceKilometers: z
      .number()
      .nonnegative(),

    emergencyCase:
      z.object({
        id:
          idSchema,

        caseNumber: z
          .string()
          .min(1),

        summary: z
          .string()
          .min(1),

        status:
          emergencyStatusSchema,

        governorate:
          z.object({
            id:
              idSchema,

            name: z
              .string()
              .min(1),

            slug: z
              .string()
              .min(1),
          }),

        location:
          locationSchema,
      }),

    ambulance:
      z.object({
        id:
          idSchema,

        code: z
          .string()
          .min(1),

        status:
          ambulanceOperationalStatusSchema,

        isOperational:
          z.boolean(),

        startLocation:
          locationSchema,
      }),

    confirmedBy:
      z.object({
        id:
          idSchema,

        name: z
          .string()
          .min(1),
      }),

    assignedAt:
      dateTimeSchema,

    enRouteAt:
      dateTimeSchema
        .nullable(),

    arrivedAt:
      dateTimeSchema
        .nullable(),

    completedAt:
      dateTimeSchema
        .nullable(),

    cancelledAt:
      dateTimeSchema
        .nullable(),

    cancellationReason: z
      .string()
      .nullable(),

    lastRouteSequenceNumber: z
      .number()
      .int()
      .nonnegative(),

    lastRoutePointAt:
      dateTimeSchema
        .nullable(),

    payload:
      payloadSchema,

    createdAt:
      dateTimeSchema,

    updatedAt:
      dateTimeSchema,
  });

export const generateRecommendationResponseSchema =
  z.object({
    success:
      z.literal(true),

    message:
      z.string(),

    data:
      z.object({
        duplicate:
          z.boolean(),

        reused:
          z.boolean(),

        recommendation:
          dispatchRecommendationSchema,

        emergencyCase:
          emergencyCaseSchema
            .optional(),

        alert:
          operationalAlertSchema
            .nullable()
            .optional(),
      }),
  });

export const latestRecommendationResponseSchema =
  z.object({
    success:
      z.literal(true),

    data:
      z.object({
        recommendation:
          dispatchRecommendationSchema
            .nullable(),
      }),
  });

export const confirmRecommendationResponseSchema =
  z.object({
    success:
      z.literal(true),

    message:
      z.string(),

    data:
      z.object({
        duplicate:
          z.boolean(),

        recommendation:
          dispatchRecommendationSchema,

        dispatch:
          ambulanceDispatchSchema,

        emergencyCase:
          emergencyCaseSchema
            .optional(),

        ambulanceStatus:
          ambulanceStatusResponseSchema
            .optional(),

        alert:
          operationalAlertSchema
            .nullable()
            .optional(),
      }),
  });

export const rejectRecommendationResponseSchema =
  z.object({
    success:
      z.literal(true),

    message:
      z.string(),

    data:
      z.object({
        duplicate:
          z.boolean(),

        recommendation:
          dispatchRecommendationSchema,

        emergencyCase:
          emergencyCaseSchema
            .optional(),

        alert:
          operationalAlertSchema
            .nullable()
            .optional(),
      }),
  });

export const activeDispatchesResponseSchema =
  z.object({
    success:
      z.literal(true),

    data:
      z.object({
        count: z
          .number()
          .int()
          .nonnegative(),

        dispatches:
          z.array(
            ambulanceDispatchSchema,
          ),
      }),
  });

/*
 * Shared response used by:
 *
 * POST /api/dispatches/:dispatchId/start
 * POST /api/dispatches/:dispatchId/arrive
 * POST /api/dispatches/:dispatchId/complete
 *
 * Unknown backend fields such as statusEvent are safely ignored.
 */
export const dispatchLifecycleResponseSchema =
  z.object({
    success:
      z.literal(true),

    message:
      z.string(),

    data:
      z.object({
        duplicate:
          z
            .boolean()
            .optional()
            .default(false),

        dispatch:
          ambulanceDispatchSchema,

        emergencyCase:
          emergencyCaseSchema
            .optional(),

        ambulanceStatus:
          ambulanceStatusResponseSchema
            .optional(),

        alert:
          operationalAlertSchema
            .nullable()
            .optional(),

        alerts:
          z
            .array(
              operationalAlertSchema,
            )
            .optional(),
      }),
  });