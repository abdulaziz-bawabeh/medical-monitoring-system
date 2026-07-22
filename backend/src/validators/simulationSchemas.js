import {
    z,
  } from "zod";
  
  export const startSimulationBodySchema =
    z
      .object({
        tickIntervalMs: z
          .number()
          .int()
          .min(500)
          .max(60000)
          .default(1000),
  
        occupancyEveryTicks: z
          .number()
          .int()
          .min(1)
          .max(3600)
          .default(5),
  
        emergencyEveryTicks: z
          .number()
          .int()
          .min(1)
          .max(3600)
          .default(20),
  
        ambulanceMovementEveryTicks: z
          .number()
          .int()
          .min(1)
          .max(60)
          .default(1),
  
        maxActiveEmergencies: z
          .number()
          .int()
          .min(1)
          .max(20)
          .default(3),
  
        autoConfirmDispatch: z
          .boolean()
          .default(false),
      })
      .strict();
  
  export const stopSimulationBodySchema =
    z
      .object({
        reason: z
          .string()
          .trim()
          .min(1)
          .max(500)
          .optional(),
      })
      .strict();

      export const resetSimulationBodySchema =
  z
    .object({
      confirmation: z
        .literal(
          "RESET_SIMULATION_OPERATIONS",
        ),
    })
    .strict();