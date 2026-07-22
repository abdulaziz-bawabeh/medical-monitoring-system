import { z } from "zod";

const eventPayloadSchema = z
  .record(
    z.string(),
    z.unknown(),
  )
  .optional()
  .default({});

/*
 * Data required to register a new emergency case.
 *
 * governorateId is intentionally not accepted.
 * The Backend determines the governorate spatially.
 */
export const createEmergencyCaseSchema = z
  .object({
    eventId: z
      .string()
      .uuid(
        "Event ID must be a valid UUID.",
      ),

    summary: z
      .string()
      .trim()
      .min(
        5,
        "Emergency summary must contain at least 5 characters.",
      )
      .max(
        500,
        "Emergency summary must not exceed 500 characters.",
      ),

    longitude: z
      .number()
      .min(
        -180,
        "Longitude must not be less than -180.",
      )
      .max(
        180,
        "Longitude must not exceed 180.",
      ),

    latitude: z
      .number()
      .min(
        -90,
        "Latitude must not be less than -90.",
      )
      .max(
        90,
        "Latitude must not exceed 90.",
      ),

    reportedAt: z
      .string()
      .datetime({
        offset: true,
      }),

    payload:
      eventPayloadSchema,
  })
  .strict();

export const emergencyCaseListQuerySchema =
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

export const alertListQuerySchema =
  z.object({
    status: z
      .enum([
        "OPEN",
        "ACKNOWLEDGED",
        "RESOLVED",
      ])
      .optional(),

    alertType: z
      .enum([
        "FACILITY_HIGH_OCCUPANCY",
        "EMERGENCY_CASE_CREATED",
        "DISPATCH_CONFIRMATION_REQUIRED",
        "AMBULANCE_OFFLINE",
        "DISPATCH_STATUS_CHANGED",
      ])
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

export const alertIdParameterSchema =
  z.object({
    alertId: z
      .string()
      .trim()
      .regex(
        /^\d+$/,
        "Alert ID must contain digits only.",
      )
      .transform(
        (value) => value,
      ),
  });