import type { APIRoute } from "astro";
import { taskIdParamSchema, updateTaskSchema } from "@/lib/schemas/task.schema";
import { updateTask, deleteTask, getTaskById, checkSortOrderConflict } from "@/lib/services/task.service";
import type { ErrorResponseDTO, SuccessResponseDTO } from "@/types";

export const prerender = false;

export const PATCH: APIRoute = async ({ params, locals, request }) => {
  // 1. Check authentication
  const {
    data: { user },
    error: authError,
  } = await locals.supabase.auth.getUser();

  if (authError || !user) {
    const errorResponse: ErrorResponseDTO = {
      error: "Unauthorized",
      message: "Authentication required",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Validate task ID parameter
  const paramValidation = taskIdParamSchema.safeParse({ id: params.id });
  if (!paramValidation.success) {
    const errorResponse: ErrorResponseDTO = {
      error: "Bad Request",
      message: "Invalid task ID format",
      details: { id: paramValidation.error.flatten().fieldErrors.id?.[0] ?? "Invalid format" },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const errorResponse: ErrorResponseDTO = {
      error: "Bad Request",
      message: "Invalid JSON body",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const bodyValidation = updateTaskSchema.safeParse(body);
  if (!bodyValidation.success) {
    const fieldErrors = bodyValidation.error.flatten().fieldErrors;
    const details: Record<string, string> = {};
    for (const [field, errors] of Object.entries(fieldErrors)) {
      if (errors && errors.length > 0) {
        details[field] = errors[0];
      }
    }

    const errorResponse: ErrorResponseDTO = {
      error: "Bad Request",
      message: "Validation failed",
      details,
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const taskId = paramValidation.data.id;
  const command = bodyValidation.data;

  try {
    // 4. Fetch task and verify existence
    const existingTask = await getTaskById(locals.supabase, taskId);
    if (!existingTask) {
      const errorResponse: ErrorResponseDTO = {
        error: "Not Found",
        message: "Task not found",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 5. Check sort order conflict if sortOrder is being updated
    if (command.sortOrder !== undefined) {
      const hasConflict = await checkSortOrderConflict(
        locals.supabase,
        existingTask.list_id,
        command.sortOrder,
        taskId
      );
      if (hasConflict) {
        const errorResponse: ErrorResponseDTO = {
          error: "Conflict",
          message: "Sort order already exists in this list",
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // 6. Update task via service
    const result = await updateTask(locals.supabase, taskId, command);

    // 7. Handle result
    if (!result.success) {
      if (result.error === "not_found") {
        const errorResponse: ErrorResponseDTO = {
          error: "Not Found",
          message: result.message,
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (result.error === "sort_order_conflict") {
        const errorResponse: ErrorResponseDTO = {
          error: "Conflict",
          message: result.message,
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }

      const errorResponse: ErrorResponseDTO = {
        error: "Internal Server Error",
        message: result.message,
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 8. Return updated task
    return new Response(JSON.stringify(result.data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[PATCH /api/tasks/:id] Unexpected error:", error);
    const errorResponse: ErrorResponseDTO = {
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  // 1. Check authentication
  const {
    data: { user },
    error: authError,
  } = await locals.supabase.auth.getUser();

  if (authError || !user) {
    const errorResponse: ErrorResponseDTO = {
      error: "Unauthorized",
      message: "Authentication required",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Validate task ID parameter
  const paramValidation = taskIdParamSchema.safeParse({ id: params.id });
  if (!paramValidation.success) {
    const errorResponse: ErrorResponseDTO = {
      error: "Bad Request",
      message: "Invalid task ID format",
      details: { id: paramValidation.error.flatten().fieldErrors.id?.[0] ?? "Invalid format" },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Delete task via service
  const result = await deleteTask(locals.supabase, paramValidation.data.id);

  // 4. Handle result
  if (!result.success) {
    if (result.error === "not_found") {
      const errorResponse: ErrorResponseDTO = {
        error: "Not Found",
        message: result.message,
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const errorResponse: ErrorResponseDTO = {
      error: "Internal Server Error",
      message: result.message,
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 5. Return success
  const successResponse: SuccessResponseDTO = { success: true };
  return new Response(JSON.stringify(successResponse), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
