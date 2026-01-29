import { z } from "zod";

export const updateProfileSchema = z.object({
  activeListId: z.string().uuid("Invalid UUID format").nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const completeOnboardingSchema = z.object({
  version: z
    .number({
      required_error: "Version is required",
      invalid_type_error: "Version must be a number",
    })
    .int("Version must be an integer")
    .positive("Version must be greater than 0")
    .max(32767, "Version must be at most 32767"),
});

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
