import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  emoji: z.string().min(1, "Emoji is required"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
