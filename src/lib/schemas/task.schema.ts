import { z } from "zod";

export const taskListIdParamSchema = z.object({
  listId: z.string().uuid("Invalid list ID format"),
});

export type TaskListIdParam = z.infer<typeof taskListIdParamSchema>;

export const getTasksQuerySchema = z.object({
  status: z.coerce.number().int().min(1).max(2).optional(),
  priority: z.coerce.number().int().min(1).max(3).optional(),
  search: z.string().max(200).optional(),
  sort: z.enum(["priority", "sort_order", "created_at"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export type GetTasksQueryInput = z.infer<typeof getTasksQuerySchema>;

export const createTaskSchema = z.object({
  title: z
    .string({ required_error: "Title is required" })
    .min(1, "Title is required")
    .max(500, "Title must be at most 500 characters")
    .trim(),
  description: z
    .string()
    .max(5000, "Description must be at most 5000 characters")
    .trim()
    .nullable()
    .optional()
    .transform((val) => val || null),
  priority: z.coerce.number().int().min(1, "Priority must be 1, 2, or 3").max(3, "Priority must be 1, 2, or 3"),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const taskIdParamSchema = z.object({
  id: z.string().uuid("Invalid task ID format"),
});

export type TaskIdParam = z.infer<typeof taskIdParamSchema>;

export const updateTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be at most 200 characters").trim().optional(),
  description: z.string().nullable().optional(),
  priority: z
    .union([z.literal(1), z.literal(2), z.literal(3)], {
      errorMap: () => ({ message: "Priority must be 1, 2, or 3" }),
    })
    .optional(),
  status: z
    .union([z.literal(1), z.literal(2)], {
      errorMap: () => ({ message: "Status must be 1 or 2" }),
    })
    .optional(),
  sortOrder: z.number().int().positive("Sort order must be a positive integer").optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const taskOrderItemSchema = z.object({
  id: z.string().uuid("Invalid task ID format"),
  sortOrder: z.number().int().positive("Sort order must be a positive integer"),
});

export const reorderTasksSchema = z.object({
  taskOrders: z
    .array(taskOrderItemSchema)
    .min(1, "At least one task order is required")
    .max(500, "Cannot reorder more than 500 tasks at once")
    .refine(
      (items) => {
        const ids = items.map((item) => item.id);
        return new Set(ids).size === ids.length;
      },
      { message: "Duplicate task IDs are not allowed" }
    )
    .refine(
      (items) => {
        const orders = items.map((item) => item.sortOrder);
        return new Set(orders).size === orders.length;
      },
      { message: "Duplicate sort orders are not allowed" }
    ),
});

export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>;
