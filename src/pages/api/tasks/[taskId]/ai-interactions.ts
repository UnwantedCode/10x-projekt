import type { APIRoute } from "astro";
import { taskIdPathParamSchema, aiInteractionsQuerySchema } from "@/lib/schemas/aiInteraction.schema";
import { verifyTaskExists, getAIInteractionsForTask } from "@/lib/services/aiInteraction.service";
import type { ErrorResponseDTO } from "@/types";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals, url }) => {
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

  // 2. Validate taskId path parameter
  const paramValidation = taskIdPathParamSchema.safeParse({ taskId: params.taskId });
  if (!paramValidation.success) {
    const errorResponse: ErrorResponseDTO = {
      error: "Bad Request",
      message: "Invalid task ID format",
      details: { taskId: paramValidation.error.flatten().fieldErrors.taskId?.[0] ?? "Invalid format" },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Validate query parameters
  const queryParams = Object.fromEntries(url.searchParams);
  const queryValidation = aiInteractionsQuerySchema.safeParse(queryParams);

  if (!queryValidation.success) {
    const fieldErrors = queryValidation.error.flatten().fieldErrors;
    const errorResponse: ErrorResponseDTO = {
      error: "Bad Request",
      message: "Invalid query parameters",
      details: Object.fromEntries(Object.entries(fieldErrors).map(([key, value]) => [key, value?.join(", ") ?? ""])),
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 4. Verify task exists and belongs to user (RLS handles ownership)
  try {
    const taskExists = await verifyTaskExists(locals.supabase, paramValidation.data.taskId);
    if (!taskExists) {
      const errorResponse: ErrorResponseDTO = {
        error: "Not Found",
        message: "Task not found",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Error verifying task:", error);
    const errorResponse: ErrorResponseDTO = {
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 5. Fetch AI interactions for task
  try {
    const result = await getAIInteractionsForTask(locals.supabase, paramValidation.data.taskId, queryValidation.data);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching AI interactions:", error);
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
