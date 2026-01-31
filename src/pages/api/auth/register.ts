import type { APIRoute } from "astro";
import { z } from "zod";

const registerSchema = z
  .object({
    email: z.string().email("Podaj poprawny adres email"),
    password: z.string().min(8, "Hasło musi mieć minimum 8 znaków"),
    confirmPassword: z.string(),
    acceptedTerms: z.literal(true, {
      errorMap: () => ({ message: "Musisz zaakceptować regulamin" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"],
  });

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      const firstError = result.error.errors[0];
      return new Response(
        JSON.stringify({
          error: firstError.message,
          field: firstError.path[0],
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { email, password } = result.data;
    const { data, error } = await locals.supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      const message = error.message.toLowerCase();

      // Mapowanie błędów Supabase
      if (message.includes("user already registered") || message.includes("already exists")) {
        return new Response(
          JSON.stringify({
            error: "Konto z tym adresem email już istnieje",
            code: "USER_EXISTS",
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (message.includes("invalid email")) {
        return new Response(
          JSON.stringify({
            error: "Podany adres email jest nieprawidłowy",
            code: "INVALID_EMAIL",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (message.includes("password") && message.includes("weak")) {
        return new Response(
          JSON.stringify({
            error: "Hasło jest zbyt słabe",
            code: "WEAK_PASSWORD",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (message.includes("signups not allowed") || message.includes("signup disabled")) {
        return new Response(
          JSON.stringify({
            error: "Rejestracja jest obecnie wyłączona",
            code: "SIGNUP_DISABLED",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: "Wystąpił błąd podczas rejestracji. Spróbuj ponownie.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        user: data.user ? { id: data.user.id, email: data.user.email } : null,
        message: "Rejestracja zakończona pomyślnie",
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({
        error: "Wystąpił błąd serwera. Spróbuj ponownie.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
