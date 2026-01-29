import type { APIRoute } from "astro";
import { taskListIdParamSchema, reorderTasksSchema } from "@/lib/schemas/task.schema";
import { verifyListOwnership, reorderTasks } from "@/lib/services/task.service";
import type { ErrorResponseDTO } from "@/types";

export const prerender = false;

export const POST: APIRoute = async ({ params, locals, request }) => {
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

  // 2. Validate listId parameter
  const paramValidation = taskListIdParamSchema.safeParse({ listId: params.listId });
  if (!paramValidation.success) {
    const errorResponse: ErrorResponseDTO = {
      error: "Bad Request",
      message: "Invalid list ID format",
      details: { listId: paramValidation.error.flatten().fieldErrors.listId?.[0] ?? "Invalid format" },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Verify list exists and belongs to user
  const listCheck = await verifyListOwnership(locals.supabase, paramValidation.data.listId);
  if (!listCheck.success) {
    if (listCheck.error === "not_found") {
      const errorResponse: ErrorResponseDTO = {
        error: "Not Found",
        message: listCheck.message,
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const errorResponse: ErrorResponseDTO = {
      error: "Internal Server Error",
      message: listCheck.message,
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 4. Parse and validate request body
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

  const bodyValidation = reorderTasksSchema.safeParse(body);
  if (!bodyValidation.success) {
    const fieldErrors = bodyValidation.error.flatten().fieldErrors;
    const formErrors = bodyValidation.error.flatten().formErrors;
    const details: Record<string, string> = {};

    for (const [field, errors] of Object.entries(fieldErrors)) {
      if (errors && errors.length > 0) {
        details[field] = errors[0];
      }
    }

    if (formErrors.length > 0) {
      details.taskOrders = formErrors[0];
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

  // 5. Reorder tasks via service
  const result = await reorderTasks(locals.supabase, paramValidation.data.listId, bodyValidation.data);

  // 6. Handle result
  if (!result.success) {
    if (result.error === "invalid_tasks") {
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

  // 7. Return success response
  return new Response(JSON.stringify(result.data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
