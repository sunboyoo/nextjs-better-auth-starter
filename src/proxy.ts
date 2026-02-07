import { isPublicPath } from "@/lib/public-paths";
import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Fast cookie presence check for protected-route redirects.
  const sessionCookie = getSessionCookie(request);

  // Public paths are always accessible (including /auth/sign-in).
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Redirect obviously unauthenticated requests to sign-in.
  if (!sessionCookie) {
    const loginUrl = new URL("/auth/sign-in", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Match all routes except for static files and Next.js internal routes
export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
