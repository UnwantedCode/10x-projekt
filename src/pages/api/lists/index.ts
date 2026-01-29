import type { APIRoute } from "astro";
import { listsQuerySchema, createListSchema } from "@/lib/schemas/list.schema";
import { getLists, createList } from "@/lib/services/list.service";
import type { ErrorResponseDTO } from "@/types";

export const prerender = false;

export const GET: APIRoute = async ({ locals, url }) => {
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

  // 2. Parse and validate query parameters
  const queryParams = Object.fromEntries(url.searchParams);
  const parseResult = listsQuerySchema.safeParse(queryParams);

  if (!parseResult.success) {
    const fieldErrors = parseResult.error.flatten().fieldErrors;
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

  const { limit, offset } = parseResult.data;

  // 3. Fetch lists from database
  try {
    const response = await getLists(locals.supabase, { limit, offset });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching lists:", error);

    const errorResponse: ErrorResponseDTO = {
      error: "Internal Server Error",
      message: "Failed to retrieve lists",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST: APIRoute = async ({ locals, request }) => {
  // 1. Check authentication
  const {
    data: { user },
    error: authError,
  } = await locals.supabase.auth.getUser();

  if (authError || !user) {
    const errorResponse: ErrorResponseDTO = {
      error: "UNAUTHORIZED",
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
      error: "VALIDATION_ERROR",
      message: "Invalid JSON body",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const validationResult = createListSchema.safeParse(body);
  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors;
    const details: Record<string, string> = {};
    for (const [field, errors] of Object.entries(fieldErrors)) {
      if (errors && errors.length > 0) {
        details[field] = errors[0];
      }
    }

    const errorResponse: ErrorResponseDTO = {
      error: "VALIDATION_ERROR",
      message: "Invalid request data",
      details,
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Create list via service
  const result = await createList(locals.supabase, user.id, validationResult.data);

  if (!result.success) {
    const status = result.error === "duplicate_name" ? 400 : 500;
    const errorResponse: ErrorResponseDTO = {
      error: result.error === "duplicate_name" ? "DUPLICATE_NAME" : "INTERNAL_ERROR",
      message: result.message,
    };
    return new Response(JSON.stringify(errorResponse), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 4. Return created list
  return new Response(JSON.stringify(result.data), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};
