import {
    z,
  } from "zod";
  
  const identifierSchema = z
    .union([
      z.string(),
      z.number(),
    ])
    .transform(
      (value) => String(value),
    )
    .refine(
      (value) => /^\d+$/.test(value),
      "Identifier must contain digits only.",
    );
  
  export const dispatchRoutePointBodySchema =
    z
      .object({
        eventId: z
          .string()
          .uuid(
            "Route point event ID must be a valid UUID.",
          ),
  
        dispatchId:
          identifierSchema,
  
        ambulanceId:
          identifierSchema,
  
        sequenceNumber: z
          .number()
          .int()
          .positive(
            "Sequence number must be greater than zero.",
          ),
  
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
          .min(0)
          .max(250)
          .optional()
          .default(0),
  
        headingDegrees: z
          .number()
          .min(0)
          .lt(360)
          .nullable()
          .optional()
          .default(null),
  
        payload: z
          .record(
            z.string(),
            z.unknown(),
          )
          .optional()
          .default({}),
      })
      .strict();
  
  export const dispatchRouteParameterSchema =
    z.object({
      dispatchId:
        identifierSchema,
    });
  
  export const dispatchRouteQuerySchema =
    z.object({
      afterSequence: z
        .coerce
        .number()
        .int()
        .min(0)
        .optional()
        .default(0),
  
      limit: z
        .coerce
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .default(500),
    });