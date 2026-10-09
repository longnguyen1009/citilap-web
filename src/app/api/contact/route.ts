import { NextResponse } from 'next/server';
import { getClientIp, checkRateLimit, rateLimitExceededResponse } from '@/lib/rate-limiter';
import { submitContactMessage } from '@/server/services/contact.service';
import { verifyTurnstileToken } from '@/lib/turnstile';

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);

    // 1. Rate limiting: Max 3 submissions per 10 minutes (600s) per IP
    const rateLimit = await checkRateLimit('contact', request, 3, 600);
    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(rateLimit.retryAfter);
    }

    // 2. Parse payload from JSON or FormData
    let body: Record<string, unknown> = {};
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData().catch(() => null);
      if (formData) {
        body = Object.fromEntries(formData.entries());
      }
    }

    // 2.5 Turnstile validation (Fail-closed in Staging/Production if enforced or secret configured)
    const turnstileToken =
      request.headers.get('cf-turnstile-response') ||
      (typeof body.turnstileToken === 'string' ? body.turnstileToken : null);
    const turnstileCheck = await verifyTurnstileToken(turnstileToken, clientIp, { action: 'contact' });
    if (!turnstileCheck.success) {
      return NextResponse.json(
        { success: false, error: turnstileCheck.error || 'Xác thực bảo mật không hợp lệ hoặc đã hết hạn.' },
        { status: 403, headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    // 3. Process, validate and persist to D1
    const result = await submitContactMessage(body, clientIp);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        {
          status: 400,
          headers: { 'Cache-Control': 'private, no-store' },
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        id: result.id,
      },
      {
        status: 201,
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
  } catch (error) {
    console.error('[ContactAPI] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Đã có lỗi xảy ra. Vui lòng liên hệ hotline 0899.188.186.' },
      {
        status: 500,
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
  }
}
