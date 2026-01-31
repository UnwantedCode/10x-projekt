import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.client";

// Trasy publiczne - dostępne bez logowania
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
];

// Trasy auth - przekierowanie zalogowanych do /app
const AUTH_PATHS = ["/login", "/register", "/forgot-password"];

export const onRequest = defineMiddleware(async ({ locals, cookies, url, request, redirect }, next) => {
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  locals.supabase = supabase;

  // Pobierz użytkownika (bezpieczniejsze niż getSession - weryfikuje JWT)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    locals.user = {
      id: user.id,
      email: user.email,
    };
  } else {
    locals.user = null;
  }

  const isPublicPath = PUBLIC_PATHS.includes(url.pathname);
  const isAuthPath = AUTH_PATHS.includes(url.pathname);
  const isApiRoute = url.pathname.startsWith("/api/");

  // Zalogowany użytkownik na stronie auth -> przekieruj do /app
  if (user && isAuthPath) {
    return redirect("/app");
  }

  // Niezalogowany użytkownik na chronionej trasie
  if (!user && !isPublicPath) {
    if (isApiRoute) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return redirect(`/login?redirectTo=${encodeURIComponent(url.pathname)}`);
  }

  return next();
});
