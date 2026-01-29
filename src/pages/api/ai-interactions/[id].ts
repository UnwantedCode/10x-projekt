import type { APIRoute } from "astro";
import { aiInteractionIdParamSchema, recordAIDecisionSchema } from "@/lib/schemas/aiInteraction.schema";
import { recordDecision } from "@/lib/services/aiInteraction.service";
import type { ErrorResponseDTO } from "@/types";

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

  // 2. Validate interaction ID parameter
  const paramValidation = aiInteractionIdParamSchema.safeParse({ id: params.id });
  if (!paramValidation.success) {
    const errorResponse: ErrorResponseDTO = {
      error: "Bad Request",
      message: "Invalid interaction ID format",
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

  const bodyValidation = recordAIDecisionSchema.safeParse(body);
  if (!bodyValidation.success) {
    const fieldErrors = bodyValidation.error.flatten().fieldErrors;
    const formErrors = bodyValidation.error.flatten().formErrors;
    const details: Record<string, string> = {};

    for (const [field, errors] of Object.entries(fieldErrors)) {
      if (errors && errors.length > 0) {
        details[field] = errors[0];
      }
    }

    // Handle discriminated union errors
    if (formErrors.length > 0) {
      details.decision = formErrors[0];
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

  // 4. Call service to record decision
  const result = await recordDecision(locals.supabase, paramValidation.data.id, bodyValidation.data);

  // 5. Handle result
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

    if (result.error === "already_decided") {
      const errorResponse: ErrorResponseDTO = {
        error: "Conflict",
        message: result.message,
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 409,
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

  // 6. Return success response
  return new Response(JSON.stringify(result.data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
