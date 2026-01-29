import type { APIRoute } from "astro";
import { listIdParamSchema, updateListSchema } from "@/lib/schemas/list.schema";
import { getListById, updateList, deleteList } from "@/lib/services/list.service";
import type { ErrorResponseDTO, SuccessResponseDTO } from "@/types";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
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

  // 2. Validate ID parameter
  const validation = listIdParamSchema.safeParse({ id: params.id });
  if (!validation.success) {
    const errorResponse: ErrorResponseDTO = {
      error: "Bad Request",
      message: "Invalid list ID format",
      details: Object.fromEntries(
        Object.entries(validation.error.flatten().fieldErrors).map(([key, value]) => [key, value?.join(", ") ?? ""])
      ),
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 3. Fetch list from database
    const list = await getListById(locals.supabase, validation.data.id);

    // 4. Check if list exists (RLS ensures user can only see their own lists)
    if (!list) {
      const errorResponse: ErrorResponseDTO = {
        error: "Not Found",
        message: "List not found",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 5. Return list
    return new Response(JSON.stringify(list), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching list:", error);

    const errorResponse: ErrorResponseDTO = {
      error: "Internal Server Error",
      message: "Internal server error",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

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

  // 2. Validate ID parameter
  const paramValidation = listIdParamSchema.safeParse({ id: params.id });
  if (!paramValidation.success) {
    const errorResponse: ErrorResponseDTO = {
      error: "Bad Request",
      message: "Invalid list ID format",
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

  const bodyValidation = updateListSchema.safeParse(body);
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

  // 4. Update list via service
  const result = await updateList(locals.supabase, paramValidation.data.id, bodyValidation.data);

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

    if (result.error === "duplicate_name") {
      const errorResponse: ErrorResponseDTO = {
        error: "Bad Request",
        message: result.message,
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
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

  // 6. Return updated list
  return new Response(JSON.stringify(result.data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
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
      message: "User not authenticated",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Validate ID parameter
  const validation = listIdParamSchema.safeParse({ id: params.id });
  if (!validation.success) {
    const errorResponse: ErrorResponseDTO = {
      error: "Bad Request",
      message: "Invalid list ID format",
      details: { id: validation.error.flatten().fieldErrors.id?.[0] ?? "Invalid format" },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Delete list via service (cascades to tasks and ai_interactions)
  const result = await deleteList(locals.supabase, validation.data.id);

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
