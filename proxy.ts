import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login"];

/**
 * Edge gate (Next 16 `proxy` convention): bounce unauthenticated requests to
 * /login before any page renders. Full JWT verification + role checks happen in
 * server components/actions; this is a cheap cookie-presence guard so protected
 * routes never flash.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  const hasSession = Boolean(req.cookies.get("pp_session")?.value);
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Protect everything except Next internals, the API, and public static assets
  // (the phone needs the manifest and icons before login to install the app).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon-|apple-touch-icon).*)"],
};
