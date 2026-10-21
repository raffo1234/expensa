import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// API routes that must work without a session (the sign-in flow itself).
const PUBLIC_API_PREFIXES = ["/api/auth"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;

  if (pathname.startsWith("/api")) {
    const isPublic = PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
    if (!isPublic && !isAuthenticated) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") && !isAuthenticated) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
