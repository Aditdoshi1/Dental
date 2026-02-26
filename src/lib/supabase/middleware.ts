import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Skip auth checks for public routes (QR scan, landing pages, API, static)
  const path = request.nextUrl.pathname;
  if (
    path.startsWith("/r/") ||
    path.startsWith("/s/") ||
    path.startsWith("/p/") ||
    path.startsWith("/api/") ||
    path === "/" ||
    path === "/privacy"
  ) {
    return supabaseResponse;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Admin routes are now under /app/[shopSlug]/...
  const isAdminRoute = request.nextUrl.pathname.startsWith("/app/");
  const isSetupRoute = request.nextUrl.pathname.startsWith("/setup");

  // Protect admin and setup routes
  if ((isAdminRoute || isSetupRoute) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users from login to setup (they'll get redirected from there)
  if (request.nextUrl.pathname === "/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/setup";
    return NextResponse.redirect(url);
  }

  // Redirect old routes (pre-multi-tenant) to the new structure
  const oldAdminRoutes = ["/dashboard", "/collections", "/qr-codes", "/analytics", "/team", "/settings"];
  const matchesOld = oldAdminRoutes.some(
    (route) => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route + "/")
  );
  if (matchesOld) {
    const url = request.nextUrl.clone();
    if (user) {
      url.pathname = "/setup";
    } else {
      url.pathname = "/login";
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
