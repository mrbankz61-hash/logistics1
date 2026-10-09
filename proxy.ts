import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authCookieOptions, isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

/**
 * Keeps the Supabase session cookies fresh (Server Components can't write
 * cookies) and sends signed-out visitors away from the dashboard. Staff role
 * and disabled checks happen server-side on every page, action and route.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedPath = pathname.startsWith("/admin") || pathname.startsWith("/account");

  let response = NextResponse.next({ request });
  let signedIn = false;

  if (isSupabaseConfigured) {
    const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
      cookieOptions: authCookieOptions,
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    // Validates the JWT and refreshes it when it's about to expire.
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims?.sub);
  }

  if (protectedPath && !signedIn) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/login"],
};
