import {
    z,
  } from "zod";
  
  import {
    dispatchStatusSchema,
  } from "./dispatchSchemas.js";
  
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
  
  const payloadSchema = z.record(
    z.string(),
    z.unknown(),
  );
  
  export const dispatchRoutePointSchema =
    z.object({
      id: idSchema,
  
      eventId: z
        .string()
        .uuid(),
  
      dispatchId:
        idSchema,
  
      dispatchNumber: z
        .string()
        .nullable(),
  
      ambulanceId:
        idSchema,
  
      ambulanceCode: z
        .string()
        .nullable(),
  
      sequenceNumber: z
        .number()
        .int()
        .positive(),
  
      location:
        locationSchema,
  
      speedKmh: z
        .number()
        .nonnegative()
        .nullable(),
  
      headingDegrees: z
        .number()
        .min(0)
        .lt(360)
        .nullable(),
  
      recordedAt:
        dateTimeSchema,
  
      receivedAt:
        dateTimeSchema,
  
      isRecovered:
        z.boolean(),
  
      source: z
        .string()
        .min(1),
  
      payload:
        payloadSchema,
    });
  
  export const dispatchRouteMetadataSchema =
    z.object({
      id:
        idSchema,
  
      dispatchNumber: z
        .string()
        .min(1),
  
      status:
        dispatchStatusSchema,
  
      lastRouteSequenceNumber: z
        .number()
        .int()
        .nonnegative(),
  
      lastRoutePointAt:
        dateTimeSchema
          .nullable(),
  
      ambulance: z.object({
        id:
          idSchema,
  
        code: z
          .string()
          .min(1),
      }),
  
      emergencyCase: z.object({
        id:
          idSchema,
  
        caseNumber: z
          .string()
          .min(1),
  
        location:
          locationSchema,
      }),
    });
  
  export const dispatchRouteResponseSchema =
    z.object({
      success:
        z.literal(true),
  
      data: z.object({
        dispatch:
          dispatchRouteMetadataSchema,
  
        afterSequence: z
          .number()
          .int()
          .nonnegative(),
  
        count: z
          .number()
          .int()
          .nonnegative(),
  
        hasMore:
          z.boolean(),
  
        nextAfterSequence: z
          .number()
          .int()
          .nonnegative(),
  
        points: z.array(
          dispatchRoutePointSchema,
        ),
      }),
    });
  
  const routeAmbulanceSchema =
    z.object({
      id:
        idSchema,
  
      code: z
        .string()
        .min(1),
  
      status: z
        .string()
        .min(1),
  
      isOperational:
        z.boolean(),
  
      location:
        locationSchema,
  
      lastLocationAt:
        dateTimeSchema,
  
      lastSequenceNumber: z
        .number()
        .int()
        .nonnegative(),
  
      updatedAt:
        dateTimeSchema,
    });
  
  export const createDispatchRoutePointResponseSchema =
    z.object({
      success:
        z.literal(true),
  
      message:
        z.string(),
  
      data: z.object({
        duplicate:
          z.boolean(),
  
        routePoint:
          dispatchRoutePointSchema,
  
        /*
         * Duplicate responses may not contain the ambulance
         * object because the location was already processed.
         */
        ambulance:
          routeAmbulanceSchema
            .nullable()
            .optional(),
      }),
    });