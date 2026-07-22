import {
    z,
  } from "zod";
  
  const recoveryCheckpointSchema =
    z
      .object({
        resourceId: z
          .coerce
          .number()
          .int()
          .positive(),
  
        sequenceNumber: z
          .coerce
          .number()
          .int()
          .min(0),
      })
      .strict();
  
  export const liveOperationsRecoveryBodySchema =
    z
      .object({
        facilityCheckpoints: z
          .array(
            recoveryCheckpointSchema,
          )
          .max(500)
          .default([]),
  
        ambulanceCheckpoints: z
          .array(
            recoveryCheckpointSchema,
          )
          .max(500)
          .default([]),
  
        limitPerResource: z
          .coerce
          .number()
          .int()
          .min(1)
          .max(1000)
          .default(500),
      })
      .strict();