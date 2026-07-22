import { z } from "zod";

const sequenceNumberSchema = z
  .union([
    z
      .string()
      .trim()
      .regex(
        /^\d+$/,
        "Sequence number must contain digits only.",
      ),

    z
      .number()
      .int()
      .nonnegative(),
  ])
  .transform((value) => String(value));

const eventPayloadSchema = z
  .record(
    z.string(),
    z.unknown(),
  )
  .optional()
  .default({});

export const facilityOccupancyEventSchema = z
  .object({
    eventId: z
      .string()
      .uuid(
        "Event ID must be a valid UUID.",
      ),

    facilityCode: z
      .string()
      .trim()
      .min(
        1,
        "Facility code is required.",
      )
      .max(100)
      .regex(
        /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/,
        "Facility code has an invalid format.",
      ),

    sourceDeviceId: z
      .string()
      .trim()
      .min(
        1,
        "Source device ID is required.",
      )
      .max(200),

    sequenceNumber:
      sequenceNumberSchema,

    recordedAt: z
      .string()
      .datetime({
        offset: true,
      }),

    occupiedBeds: z
      .number()
      .int()
      .nonnegative(),

    payload: eventPayloadSchema,
  })
  .strict();

export const ambulanceLocationEventSchema = z
  .object({
    eventId: z
      .string()
      .uuid(
        "Event ID must be a valid UUID.",
      ),

    deviceId: z
      .string()
      .trim()
      .min(
        1,
        "Device ID is required.",
      )
      .max(200),

    sequenceNumber:
      sequenceNumberSchema,

    recordedAt: z
      .string()
      .datetime({
        offset: true,
      }),

    longitude: z
      .number()
      .min(-180)
      .max(180),

    latitude: z
      .number()
      .min(-90)
      .max(90),

    speedKmh: z
      .number()
      .nonnegative()
      .max(300)
      .nullable()
      .optional()
      .default(null),

    headingDegrees: z
      .number()
      .min(0)
      .lt(360)
      .nullable()
      .optional()
      .default(null),

    payload: eventPayloadSchema,
  })
  .strict();

export const dashboardSnapshotQuerySchema = z.object({
  governorateId: z
    .coerce
    .number()
    .int()
    .positive()
    .optional(),
});