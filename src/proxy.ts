import { isPublicPath } from "@/lib/public-paths";
import { getSafeCallbackUrl } from "@/lib/auth-callback";
import { DEFAULT_LOGIN_REDIRECT } from "@/lib/config";
import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Get authentication status for all routes
  const sessionCookie = getSessionCookie(request);

  // If user is already logged in and trying to access auth pages, redirect to dashboard
  if (sessionCookie && pathname.startsWith("/auth/")) {
    const safeCallbackUrl = getSafeCallbackUrl(
      request.nextUrl.searchParams.get("callbackUrl"),
      DEFAULT_LOGIN_REDIRECT,
    );
    return NextResponse.redirect(new URL(safeCallbackUrl, request.url));
  }

  // Allow access to public paths without authentication
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // For protected paths, check authentication
  if (!sessionCookie) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Match all routes except for static files and Next.js internal routes
export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
