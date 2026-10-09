import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminSession } from "@/lib/auth";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/rate-limiter";

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(request: Request) {
  // Rate limiting: 5 attempts per 15 minutes per IP
  const rateLimit = await checkRateLimit('login', request, 5, 900);
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit.retryAfter);
  }

  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !password || email.length > 254 || password.length > 200) {
      return NextResponse.json(
        { success: false, error: "Thông tin đăng nhập không hợp lệ" },
        { status: 400, headers: { 'Cache-Control': 'private, no-store, no-cache, must-revalidate' } }
      );
    }

    // Admin credentials must be explicitly configured; never ship a default password.
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminToken = process.env.ADMIN_API_TOKEN;
    if (adminEmail && adminPassword && adminToken && safeEqual(email, adminEmail) && safeEqual(password, adminPassword)) {
      const response = NextResponse.json(
        { success: true, role: "ADMIN" },
        { headers: { 'Cache-Control': 'private, no-store, no-cache, must-revalidate' } }
      );
      response.cookies.set("admin_session", createAdminSession(adminToken), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 8,
      });
      return response;
    }

    return NextResponse.json(
      { success: false, error: "Email hoặc mật khẩu không đúng" },
      { status: 401, headers: { 'Cache-Control': 'private, no-store, no-cache, must-revalidate' } }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Yêu cầu không hợp lệ" },
      { status: 400, headers: { 'Cache-Control': 'private, no-store, no-cache, must-revalidate' } }
    );
  }
}
