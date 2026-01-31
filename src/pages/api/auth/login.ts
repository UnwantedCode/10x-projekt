import type { APIRoute } from "astro";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Nieprawidłowy format adresu email"),
  password: z.string().min(6, "Hasło musi mieć co najmniej 6 znaków"),
});

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error.errors[0].message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { email, password } = result.data;
    const { data, error } = await locals.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Mapowanie błędów Supabase
      if (error.message.includes("Email not confirmed")) {
        return new Response(
          JSON.stringify({
            error: "Adres email nie został potwierdzony. Sprawdź swoją skrzynkę.",
            code: "EMAIL_NOT_CONFIRMED",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Generyczny komunikat dla bezpieczeństwa (zapobiega enumeracji kont)
      return new Response(JSON.stringify({ error: "Nieprawidłowy email lub hasło" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        user: { id: data.user.id, email: data.user.email },
        redirectTo: "/app",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch {
    return new Response(JSON.stringify({ error: "Wystąpił błąd serwera. Spróbuj ponownie." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
