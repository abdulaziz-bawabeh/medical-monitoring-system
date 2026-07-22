import { z } from "zod";

export const loginRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required.")
    .email("Enter a valid email address.")
    .transform((value) =>
      value.toLowerCase(),
    ),

  password: z
    .string()
    .min(1, "Password is required.")
    .max(
      200,
      "Password exceeds the allowed length.",
    ),

  rememberMe: z
    .boolean()
    .optional()
    .default(false),
});