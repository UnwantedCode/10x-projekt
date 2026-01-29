import type { APIRoute } from "astro";
import { getProfile, updateProfile } from "@/lib/services/profile.service";
import { updateProfileSchema } from "@/lib/schemas/profile.schema";
import type { ErrorResponseDTO } from "@/types";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  // 1. Check user session
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

  // 2. Fetch profile via service
  const result = await getProfile(locals.supabase, user.id);

  // 3. Handle result
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

  // 4. Return profile
  return new Response(JSON.stringify(result.data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const PATCH: APIRoute = async ({ locals, request }) => {
  // 1. Check user session
  const {
    data: { user },
    error: authError,
  } = await locals.supabase.auth.getUser();

  if (authError || !user) {
    const errorResponse: ErrorResponseDTO = {
      error: "UNAUTHORIZED",
      message: "User not authenticated",
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
      error: "VALIDATION_ERROR",
      message: "Invalid JSON body",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parseResult = updateProfileSchema.safeParse(body);
  if (!parseResult.success) {
    const fieldErrors = parseResult.error.flatten().fieldErrors;
    const errorResponse: ErrorResponseDTO = {
      error: "VALIDATION_ERROR",
      message: "Invalid request body",
      details: Object.fromEntries(Object.entries(fieldErrors).map(([key, value]) => [key, value?.join(", ") ?? ""])),
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Update profile via service
  const result = await updateProfile(locals.supabase, user.id, parseResult.data);

  // 4. Handle result
  if (!result.success) {
    if (result.error === "invalid_list") {
      const errorResponse: ErrorResponseDTO = {
        error: "INVALID_LIST",
        message: result.message,
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const errorResponse: ErrorResponseDTO = {
      error: "INTERNAL_ERROR",
      message: "Internal server error",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 5. Return updated profile
  return new Response(JSON.stringify(result.data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
