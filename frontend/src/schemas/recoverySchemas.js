import {
    z,
  } from "zod";
  
  import {
    ambulanceLocationSocketEventSchema,
    facilityOccupancySocketEventSchema,
  } from "./dashboardSchemas.js";
  
  const recoveryStreamSchema =
    (
      eventSchema,
    ) =>
      z
        .object({
          count:
            z.coerce
              .number()
              .int()
              .nonnegative(),
  
          hasMore:
            z.boolean(),
  
          events:
            z.array(
              eventSchema,
            ),
        })
        .strict();
  
  export const liveOperationsRecoveryResponseSchema =
    z
      .object({
        success:
          z.literal(true),
  
        message:
          z.string(),
  
        data:
          z
            .object({
              generatedAt:
                z
                  .string()
                  .datetime({
                    offset: true,
                  }),
  
              facility:
                recoveryStreamSchema(
                  facilityOccupancySocketEventSchema,
                ),
  
              ambulance:
                recoveryStreamSchema(
                  ambulanceLocationSocketEventSchema,
                ),
            })
            .strict(),
      })
      .passthrough();