import {
    z,
  } from "zod";
  
  const nullableDateTimeSchema =
    z
      .string()
      .datetime({
        offset: true,
      })
      .nullable();
  
  const simulationSettingsSchema =
    z
      .object({
        tickIntervalMs: z
          .coerce
          .number()
          .int()
          .min(500)
          .max(60_000),
  
        occupancyEveryTicks: z
          .coerce
          .number()
          .int()
          .min(1)
          .max(3_600),
  
        emergencyEveryTicks: z
          .coerce
          .number()
          .int()
          .min(1)
          .max(3_600),
  
        ambulanceMovementEveryTicks:
          z
            .coerce
            .number()
            .int()
            .min(1)
            .max(60),
  
        maxActiveEmergencies: z
          .coerce
          .number()
          .int()
          .min(1)
          .max(20),
  
        autoConfirmDispatch:
          z.boolean(),
      })
      .passthrough();
  
  const simulationRunSchema =
    z
      .object({
        id:
          z.string(),
  
        status:
          z.string(),
  
        tickCount:
          z.coerce
            .number()
            .int()
            .nonnegative(),
  
        settings:
          z
            .record(
              z.string(),
              z.unknown(),
            )
            .default({}),
  
        startedAt:
          nullableDateTimeSchema,
  
        stoppedAt:
          nullableDateTimeSchema,
  
        failureMessage:
          z
            .string()
            .nullable()
            .optional(),
      })
      .passthrough();
  
  export const simulationStatusSchema =
    z
      .object({
        generatedAt:
          z
            .string()
            .datetime({
              offset: true,
            }),
  
        simulation:
          z
            .object({
              status:
                z.string(),
  
              isRunning:
                z.boolean(),
  
              processTimerActive:
                z.boolean(),
  
              tickIntervalMs:
                z.coerce
                  .number()
                  .int()
                  .positive(),
  
              startedAt:
                nullableDateTimeSchema,
  
              stoppedAt:
                nullableDateTimeSchema,
  
              lastTickAt:
                nullableDateTimeSchema,
  
              version:
                z.coerce
                  .number()
                  .int()
                  .nonnegative(),
  
              updatedAt:
                nullableDateTimeSchema,
  
              activeRun:
                simulationRunSchema
                  .nullable(),
  
              latestRun:
                simulationRunSchema
                  .nullable(),
            })
            .passthrough(),
      })
      .passthrough();
  
  export const simulationApiResponseSchema =
    z
      .object({
        success:
          z.literal(true),
  
        message:
          z
            .string()
            .optional(),
  
        data:
          simulationStatusSchema,
      })
      .passthrough();
  
  export const simulationStartSettingsSchema =
    simulationSettingsSchema;
  
  export const simulationStopRequestSchema =
    z
      .object({
        reason:
          z
            .string()
            .trim()
            .min(1)
            .max(500),
      })
      .strict();

      export const simulationResetRequestSchema =
  z
    .object({
      confirmation:
        z.literal(
          "RESET_SIMULATION_OPERATIONS",
        ),
    })
    .strict();

export const simulationResetResponseSchema =
  z
    .object({
      success:
        z.literal(true),

      message:
        z.string(),

      data:
        z
          .object({
            resetAt:
              z
                .string()
                .datetime({
                  offset: true,
                }),

            resetByUserId:
              z.string(),

            deleted:
              z.object({
                emergencies:
                  z.coerce
                    .number()
                    .int()
                    .nonnegative(),

                alerts:
                  z.coerce
                    .number()
                    .int()
                    .nonnegative(),

                recommendations:
                  z.coerce
                    .number()
                    .int()
                    .nonnegative(),

                dispatches:
                  z.coerce
                    .number()
                    .int()
                    .nonnegative(),

                dispatchStatusEvents:
                  z.coerce
                    .number()
                    .int()
                    .nonnegative(),

                routePoints:
                  z.coerce
                    .number()
                    .int()
                    .nonnegative(),
              })
              .strict(),

            releasedAmbulances:
              z.coerce
                .number()
                .int()
                .nonnegative(),
          })
          .strict(),
    })
    .passthrough();