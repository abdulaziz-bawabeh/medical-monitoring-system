import { z } from "zod";

const idSchema = z
  .union([
    z.string(),
    z.number(),
  ])
  .transform((value) => String(value));

const dateTimeSchema = z
  .string()
  .datetime({
    offset: true,
  });

const payloadSchema = z.record(
  z.string(),
  z.unknown(),
);

export const emergencyStatusSchema =
  z.enum([
    "OPEN",
    "AWAITING_MANAGER_CONFIRMATION",
    "DISPATCHED",
    "RESOLVED",
    "CANCELLED",
  ]);

export const alertStatusSchema =
  z.enum([
    "OPEN",
    "ACKNOWLEDGED",
    "RESOLVED",
  ]);

export const alertTypeSchema =
  z.enum([
    "FACILITY_HIGH_OCCUPANCY",
    "EMERGENCY_CASE_CREATED",
    "DISPATCH_CONFIRMATION_REQUIRED",
    "AMBULANCE_OFFLINE",
    "DISPATCH_STATUS_CHANGED",
  ]);

export const emergencyCaseSchema =
  z.object({
    id: idSchema,

    eventId: z.string().uuid(),

    caseNumber: z
      .string()
      .min(1),

    summary: z
      .string()
      .min(1),

    status:
      emergencyStatusSchema,

    createdBy: z.object({
      id: idSchema,

      name: z
        .string()
        .min(1),
    }),

    governorate: z.object({
      id: idSchema,

      name: z
        .string()
        .min(1),

      slug: z
        .string()
        .min(1),
    }),

    location: z.object({
      longitude: z
        .number()
        .min(-180)
        .max(180),

      latitude: z
        .number()
        .min(-90)
        .max(90),
    }),

    reportedAt:
      dateTimeSchema,

    receivedAt:
      dateTimeSchema,

    resolvedAt:
      dateTimeSchema.nullable(),

    payload:
      payloadSchema,

    activeAlertCount: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .default(0),

    createdAt:
      dateTimeSchema,

    updatedAt:
      dateTimeSchema,
  });

const alertEmergencyCaseSchema =
  z.object({
    id: idSchema,

    caseNumber: z
      .string()
      .min(1),
  });

const alertFacilitySchema =
  z.object({
    id: idSchema,

    name: z
      .string()
      .min(1),
  });

const alertAmbulanceSchema =
  z.object({
    id: idSchema,

    code: z
      .string()
      .min(1),
  });

const acknowledgedBySchema =
  z.object({
    id: idSchema,

    name: z
      .string()
      .min(1),

    acknowledgedAt:
      dateTimeSchema,
  });

const resolvedBySchema =
  z.object({
    id: idSchema,

    name: z
      .string()
      .min(1),

    resolvedAt:
      dateTimeSchema,
  });

export const operationalAlertSchema =
  z.object({
    id: idSchema,

    eventId: z.string().uuid(),

    deduplicationKey: z
      .string()
      .min(1),

    alertType:
      alertTypeSchema,

    status:
      alertStatusSchema,

    title: z
      .string()
      .min(1),

    message: z
      .string()
      .min(1),

    emergencyCase:
      alertEmergencyCaseSchema
        .nullable(),

    facility:
      alertFacilitySchema
        .nullable(),

    ambulance:
      alertAmbulanceSchema
        .nullable(),

    acknowledgedBy:
      acknowledgedBySchema
        .nullable(),

    resolvedBy:
      resolvedBySchema
        .nullable(),

    payload:
      payloadSchema,

    createdAt:
      dateTimeSchema,

    updatedAt:
      dateTimeSchema,
  });

export const openEmergenciesResponseSchema =
  z.object({
    success: z.literal(true),

    data: z.object({
      count: z
        .number()
        .int()
        .nonnegative(),

      emergencies: z.array(
        emergencyCaseSchema,
      ),
    }),
  });

export const alertsResponseSchema =
  z.object({
    success: z.literal(true),

    data: z.object({
      count: z
        .number()
        .int()
        .nonnegative(),

      alerts: z.array(
        operationalAlertSchema,
      ),
    }),
  });

export const createEmergencyResponseSchema =
  z.object({
    success: z.literal(true),

    message: z.string(),

    data: z.object({
      duplicate: z.boolean(),

      emergencyCase:
        emergencyCaseSchema,

      alert:
        operationalAlertSchema
          .nullable(),
    }),
  });

export const acknowledgeAlertResponseSchema =
  z.object({
    success: z.literal(true),

    message: z.string(),

    data: z.object({
      changed: z.boolean(),

      alert:
        operationalAlertSchema,
    }),
  });