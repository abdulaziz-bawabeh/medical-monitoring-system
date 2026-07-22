import { z } from "zod";

/**
 * Validates the Login form before sending it to the Backend.
 *
 * Backend validation remains mandatory because browser-side
 * validation can always be bypassed.
 */
export const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required.")
    .email("Enter a valid email address.")
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(1, "Password is required.")
    .min(8, "Password must be at least 8 characters.")
    .max(200, "Password exceeds the allowed length."),

  rememberMe: z.boolean(),
});

/**
 * PostgreSQL BIGINT values may be returned by pg as strings.
 * The transform ensures that the Frontend always keeps the ID
 * as a string.
 */
export const authenticatedUserSchema = z.object({
  id: z
    .union([z.string(), z.number()])
    .transform((value) => String(value)),

  email: z.string().email(),

  fullName: z.string().min(1),

  role: z.literal("health_manager"),

  lastLoginAt: z.string().nullable(),
});

export const loginResponseSchema = z.object({
  success: z.literal(true),

  message: z.string(),

  data: z.object({
    user: authenticatedUserSchema,
  }),
});

export const currentUserResponseSchema = z.object({
  success: z.literal(true),

  data: z.object({
    user: authenticatedUserSchema,
  }),
});

export const logoutResponseSchema = z.object({
  success: z.literal(true),

  message: z.string(),
});