import { NextRequest, NextResponse } from "next/server";

/**
 * Minimal route-level guard for /admin/* pages.
 * This only prevents accidental direct browsing; real enforcement is in API routes.
 */

async function verifySession(value: string): Promise<boolean> {
  const [expiresText, signature] = value.split(".");
  const expires = Number(expiresText);
  const secret = process.env.ADMIN_API_TOKEN;
  if (!secret || !Number.isInteger(expires) || expires <= Math.floor(Date.now() / 1000) || !signature) return false;
  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(String(expires))));
    let encoded = "";
    for (const byte of digest) encoded += String.fromCharCode(byte);
    const expected = btoa(encoded).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return signature === expected;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const session = request.cookies.get("admin_session");
    if (!session?.value || !(await verifySession(session.value))) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
