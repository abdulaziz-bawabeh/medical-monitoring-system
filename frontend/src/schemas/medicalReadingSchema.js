import { z } from "zod";

const isoDateString = z.string().refine(
  (value) => !Number.isNaN(Date.parse(value)),
  {
    message: "Invalid ISO date string",
  },
);

export const medicalReadingSchema = z.object({
  eventId: z.string().min(1),
  patientId: z.string().min(1),

  sequence: z.number().int().nonnegative(),

  recordedAt: isoDateString,

  heartRate: z.number().int().min(20).max(250),

  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const confirmedMedicalReadingSchema =
  medicalReadingSchema.extend({
    serverReceivedAt: isoDateString,
  });