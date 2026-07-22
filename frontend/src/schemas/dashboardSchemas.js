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

const governorateSchema = z.object({
  id: idSchema,

  name: z.string().min(1),

  slug: z.string().min(1),

  hasBoundary: z.boolean(),
});

const locationSchema = z.object({
  longitude: z.number().min(-180).max(180),

  latitude: z.number().min(-90).max(90),
});

const facilityOccupancySchema = z.object({
  eventId: z.string().uuid(),

  sourceDeviceId: z.string().min(1),

  sequenceNumber: z.string(),

  totalBeds: z.number().int().positive(),

  occupiedBeds: z.number().int().nonnegative(),

  availableBeds: z.number().int().nonnegative(),

  occupancyPercentage: z.number().min(0).max(100),

  status: z.enum([
    "GREEN",
    "RED",
  ]),

  recordedAt: dateTimeSchema,
});

const socketResourceIdSchema =
  z
    .union([
      z.string(),
      z.number(),
    ])
    .transform(
      (value) =>
        String(value),
    );

const socketDateTimeSchema =
  z
    .string()
    .datetime({
      offset:
        true,
    });

const facilitySchema = z.object({
  id: idSchema,

  code: z.string().min(1),

  name: z.string().min(1),

  facilityType: z.enum([
    "CENTRAL_HOSPITAL",
    "CLINIC",
    "FIELD_MEDICAL_POINT",
  ]),

  address: z.string().nullable(),

  totalBeds: z.number().int().nonnegative(),

  isOperational: z.boolean(),

  governorate: z.object({
    id: idSchema,

    name: z.string().min(1),

    slug: z.string().min(1),
  }),

  location: locationSchema,

  occupancy:
    facilityOccupancySchema.nullable(),
});

const ambulanceSchema = z.object({
  id: idSchema,

  code: z.string().min(1),

  deviceId: z.string().min(1),

  status: z.enum([
    "AVAILABLE",
    "BUSY",
    "OFFLINE",
    "MAINTENANCE",
  ]),

  isOperational: z.boolean(),

  governorate: z.object({
    id: idSchema,

    name: z.string().min(1),

    slug: z.string().min(1),
  }),

  baseFacility: z
    .object({
      id: idSchema,

      name: z.string().min(1),
    })
    .nullable(),

  location: locationSchema.nullable(),

  lastLocationAt:
    dateTimeSchema.nullable(),

  lastSequenceNumber: z.string(),
});

const summarySchema = z.object({
  facilities: z.object({
    total: z.number().int().nonnegative(),

    green: z.number().int().nonnegative(),

    red: z.number().int().nonnegative(),

    withoutOccupancyData:
      z.number().int().nonnegative(),
  }),

  ambulances: z.object({
    total: z.number().int().nonnegative(),

    available: z.number().int().nonnegative(),

    busy: z.number().int().nonnegative(),

    offline: z.number().int().nonnegative(),

    maintenance: z.number().int().nonnegative(),
  }),
});

export const dashboardSnapshotResponseSchema =
  z.object({
    success: z.literal(true),

    data: z.object({
      generatedAt: dateTimeSchema,

      filters: z.object({
        governorateId:
          idSchema.nullable(),
      }),

      summary: summarySchema,

      governorates:
        z.array(governorateSchema),

      facilities:
        z.array(facilitySchema),

      ambulances:
        z.array(ambulanceSchema),
    }),
  });

  export const facilityOccupancySocketEventSchema =
  z
    .object({
      eventId: z
        .string()
        .uuid(),

      facilityId:
        socketResourceIdSchema,

      sourceDeviceId: z
        .string()
        .min(1),

      sequenceNumber: z
        .coerce
        .number()
        .int()
        .nonnegative(),

      totalBeds: z
        .coerce
        .number()
        .int()
        .nonnegative(),

      occupiedBeds: z
        .coerce
        .number()
        .int()
        .nonnegative(),

      availableBeds: z
        .coerce
        .number()
        .int()
        .nonnegative(),

      occupancyPercentage: z
        .coerce
        .number()
        .min(0)
        .max(100),

      status: z.enum([
        "GREEN",
        "RED",
      ]),

      recordedAt:
        socketDateTimeSchema,

      receivedAt:
        socketDateTimeSchema,
    })
    .passthrough();
    
export const ambulanceLocationSocketEventSchema =
  z.object({
    id: idSchema,

    eventId: z.string().uuid(),

    ambulanceId: idSchema,

    ambulanceCode: z.string().min(1),

    deviceId: z.string().min(1),

    governorateId: idSchema,

    sequenceNumber: z.string(),

    longitude: z.number().min(-180).max(180),

    latitude: z.number().min(-90).max(90),

    speedKmh: z.number().nullable(),

    headingDegrees: z.number().nullable(),

    status: z.enum([
      "AVAILABLE",
      "BUSY",
      "OFFLINE",
      "MAINTENANCE",
    ]),

    isOperational: z.boolean(),

    recordedAt: dateTimeSchema,

    receivedAt: dateTimeSchema,

    currentStateUpdated: z.boolean(),

    payload: z
      .record(
        z.string(),
        z.unknown(),
      )
      .optional(),
  });