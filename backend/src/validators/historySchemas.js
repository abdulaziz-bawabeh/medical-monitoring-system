import {
    z,
  } from "zod";
  
  const positiveIdSchema = z
    .string()
    .trim()
    .regex(
      /^\d+$/,
      "Identifier must contain digits only.",
    );
  
  const dateTimeSchema = z
    .string()
    .datetime({
      offset: true,
    });
  
  export const historyOverviewQuerySchema =
    z
      .object({
        from:
          dateTimeSchema
            .optional(),
  
        to:
          dateTimeSchema
            .optional(),
  
        governorateId:
          positiveIdSchema
            .optional(),
      })
      .strict();
  
  export const facilityOccupancyHistoryQuerySchema =
    z
      .object({
        from:
          dateTimeSchema
            .optional(),
  
        to:
          dateTimeSchema
            .optional(),
  
        governorateId:
          positiveIdSchema
            .optional(),
  
        facilityId:
          positiveIdSchema
            .optional(),
  
        limit: z
          .coerce
          .number()
          .int()
          .min(1)
          .max(5000)
          .optional()
          .default(1000),
      })
      .strict();

      const historyLimitSchema = z
      .coerce
      .number()
      .int()
      .min(1)
      .max(5000)
      .optional()
      .default(1000);
    
    const historySequenceSchema = z
      .coerce
      .number()
      .int()
      .min(0)
      .optional()
      .default(0);
    
    const emergencyHistoryStatusSchema =
      z.enum([
        "OPEN",
        "AWAITING_MANAGER_CONFIRMATION",
        "DISPATCHED",
        "RESOLVED",
        "CANCELLED",
      ]);
    
    const dispatchHistoryStatusSchema =
      z.enum([
        "ASSIGNED",
        "EN_ROUTE",
        "ARRIVED",
        "COMPLETED",
        "CANCELLED",
      ]);
    
    export const ambulanceLocationHistoryQuerySchema =
      z
        .object({
          from:
            dateTimeSchema
              .optional(),
    
          to:
            dateTimeSchema
              .optional(),
    
          governorateId:
            positiveIdSchema
              .optional(),
    
          ambulanceId:
            positiveIdSchema
              .optional(),
    
          limit:
            historyLimitSchema,
        })
        .strict();
    
    export const emergencyHistoryQuerySchema =
      z
        .object({
          from:
            dateTimeSchema
              .optional(),
    
          to:
            dateTimeSchema
              .optional(),
    
          governorateId:
            positiveIdSchema
              .optional(),
    
          status:
            emergencyHistoryStatusSchema
              .optional(),
    
          limit:
            historyLimitSchema,
        })
        .strict();
    
    export const dispatchHistoryQuerySchema =
      z
        .object({
          from:
            dateTimeSchema
              .optional(),
    
          to:
            dateTimeSchema
              .optional(),
    
          governorateId:
            positiveIdSchema
              .optional(),
    
          ambulanceId:
            positiveIdSchema
              .optional(),
    
          status:
            dispatchHistoryStatusSchema
              .optional(),
    
          limit:
            historyLimitSchema,
        })
        .strict();
    
    export const dispatchRouteHistoryParameterSchema =
      z
        .object({
          dispatchId:
            positiveIdSchema,
        })
        .strict();
    
    export const dispatchRouteHistoryQuerySchema =
      z
        .object({
          from:
            dateTimeSchema
              .optional(),
    
          to:
            dateTimeSchema
              .optional(),
    
          afterSequence:
            historySequenceSchema,
    
          limit: z
            .coerce
            .number()
            .int()
            .min(1)
            .max(1000)
            .optional()
            .default(500),
        })
        .strict();

        export const historySnapshotQuerySchema =
  z
    .object({
      at:
        dateTimeSchema
          .optional(),

      governorateId:
        positiveIdSchema
          .optional(),
    })
    .strict();