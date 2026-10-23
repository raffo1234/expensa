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
    // Send them to sign in, remembering the page they asked for so they land
    // back on it afterwards (validated in safeCallbackPath).
    const login = new URL("/session/new", req.url);
    login.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
