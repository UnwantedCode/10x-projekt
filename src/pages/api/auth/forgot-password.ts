import type { APIRoute } from "astro";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("Podaj poprawny adres email"),
});

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, url }) => {
  try {
    const body = await request.json();
    const result = forgotPasswordSchema.safeParse(body);

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error.errors[0].message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { email } = result.data;

    // Always attempt to send reset email
    // We intentionally don't check if email exists to prevent account enumeration
    await locals.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${url.origin}/reset-password`,
    });

    // Always return success to prevent account enumeration
    return new Response(
      JSON.stringify({
        success: true,
        message: "Jeśli konto z podanym adresem email istnieje, wyślemy link do resetowania hasła.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch {
    // Even on error, return success to prevent account enumeration
    return new Response(
      JSON.stringify({
        success: true,
        message: "Jeśli konto z podanym adresem email istnieje, wyślemy link do resetowania hasła.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
