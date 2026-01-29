import type { APIRoute } from "astro";
import { aiSuggestSchema } from "@/lib/schemas/aiInteraction.schema";
import { suggestPriority } from "@/lib/services/aiInteraction.service";
import type { ErrorResponseDTO } from "@/types";

export const prerender = false;

export const POST: APIRoute = async ({ locals, request }) => {
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

  // 2. Parse and validate request body
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

  const bodyValidation = aiSuggestSchema.safeParse(body);
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

  // 3. Call service to get AI suggestion
  const result = await suggestPriority(locals.supabase, user.id, bodyValidation.data);

  // 4. Handle result
  if (!result.success) {
    if (result.error === "task_not_found") {
      const errorResponse: ErrorResponseDTO = {
        error: "Not Found",
        message: result.message,
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (result.error === "ai_service_error") {
      const errorResponse: ErrorResponseDTO = {
        error: "Service Unavailable",
        message: result.message,
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    // database_error
    const errorResponse: ErrorResponseDTO = {
      error: "Internal Server Error",
      message: result.message,
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 5. Return success response
  return new Response(JSON.stringify(result.data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
