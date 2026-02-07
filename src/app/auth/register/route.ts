import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const redirectUrl = new URL("/auth/sign-in", request.url);
  redirectUrl.search = request.nextUrl.search;
  return NextResponse.redirect(redirectUrl);
}

export const HEAD = GET;
