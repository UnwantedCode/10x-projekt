import type { APIRoute } from "astro";
import { completeOnboarding } from "@/lib/services/profile.service";
import { completeOnboardingSchema } from "@/lib/schemas/profile.schema";
import type { ErrorResponseDTO } from "@/types";

export const prerender = false;

export const POST: APIRoute = async ({ locals, request }) => {
  // 1. Parse JSON body
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

  // 2. Validate input data
  const validationResult = completeOnboardingSchema.safeParse(body);
  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors;
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

  // 3. Check user session
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

  // 4. Complete onboarding via service
  const result = await completeOnboarding(locals.supabase, user.id, validationResult.data);

  // 5. Handle result
  if (!result.success) {
    const status = result.error === "not_found" ? 404 : 500;
    const errorResponse: ErrorResponseDTO = {
      error: result.error === "not_found" ? "Not Found" : "Internal Server Error",
      message: result.message,
    };
    return new Response(JSON.stringify(errorResponse), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 6. Return updated profile
  return new Response(JSON.stringify(result.data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
