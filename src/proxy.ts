import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/server/auth/constants";

/**
 * Convenience redirect for signed-out visitors opening admin pages. It only
 * checks that a session cookie exists: the real check (is the session valid
 * and unexpired in the database?) happens in every admin page, server action
 * and API route via getCurrentAdmin().
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Server actions are POSTs; let them reach the action, which returns a proper error.
  if (request.method !== "GET" || pathname === "/admin/login") return NextResponse.next();
  if (request.cookies.has(SESSION_COOKIE_NAME)) return NextResponse.next();

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
