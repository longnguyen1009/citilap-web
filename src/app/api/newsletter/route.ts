import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = request.headers.get("content-type")?.includes("application/json") ? await request.json().catch(() => null) : Object.fromEntries((await request.formData()).entries());
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({ success: false, error: "Invalid email" }, { status: 400 });
    return NextResponse.json({ success: false, error: "Newsletter subscriptions are not available yet" }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 }); }
}
