import { z } from "zod";

export const listsQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int({ message: "limit must be an integer" })
    .min(1, { message: "limit must be at least 1" })
    .max(100, { message: "limit must be at most 100" })
    .default(50),
  offset: z.coerce
    .number()
    .int({ message: "offset must be an integer" })
    .min(0, { message: "offset must be non-negative" })
    .default(0),
});

export type ListsQueryInput = z.infer<typeof listsQuerySchema>;

export const listIdParamSchema = z.object({
  id: z.string().uuid("Invalid list ID format"),
});

export type ListIdParam = z.infer<typeof listIdParamSchema>;

export const createListSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters")
    .trim(),
});

export type CreateListInput = z.infer<typeof createListSchema>;

export const updateListSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters")
    .trim(),
});

export type UpdateListInput = z.infer<typeof updateListSchema>;
