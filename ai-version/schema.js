import { z } from "zod";

export const inputSchema = z.object({
  text: z
    .string()
    .min(1, "text must not be empty")
    .max(2000, "text must not exceed 2000 characters"),
}).strict();

export const outputSchema = z.object({
  category: z.enum([
    "billing",
    "bug",
    "feature",
    "other",
  ]),

  urgency: z.enum([
    "low",
    "normal",
    "high",
  ]),

  confidence: z
    .number()
    .min(0)
    .max(1),

  reason: z
    .string()
    .min(1),
}).strict();

export function validateInput(value) {
  return inputSchema.parse(value);
}

export function validateOutput(value) {
  return outputSchema.parse(value);
}