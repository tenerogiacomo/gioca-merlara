import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicSupabaseEnv } from "@/lib/supabase/env";

/**
 * Aggiorna la sessione Supabase a ogni richiesta e riscrive i cookie.
 * Non è un controllo di autorizzazione: pagine, server actions e route
 * verificano sempre la sessione da sé.
 */
export async function proxy(request: NextRequest) {
  const { url, publishableKey } = publicSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet)
          request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers))
          response.headers.set(key, value);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();

  // Area di gestione: per chi non è superadmin la pagina non esiste, con un vero 404.
  // Pagine e server actions ricontrollano comunque il ruolo (requireSuperadmin).
  const { pathname } = request.nextUrl;
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  if (isAdminArea && data?.claims?.app_metadata?.role !== "superadmin") {
    return NextResponse.rewrite(new URL("/pagina-non-trovata", request.url), {
      status: 404,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
