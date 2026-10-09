/**
 * Cloudflare Turnstile Server-Side Verification (STORE-14 Hardened)
 * 
 * Official Cloudflare test keys:
 * - Always passes sitekey: 1x00000000000000000000AA
 * - Always passes secret:  1x0000000000000000000000000000000AA
 * - Always blocks sitekey: 2x00000000000000000000AB
 * - Always blocks secret:  2x0000000000000000000000000000000AB
 * - Spent token sitekey:   3x00000000000000000000FF
 * - Spent token secret:    3x0000000000000000000000000000000FF
 */

export interface TurnstileVerifyOptions {
  action?: string;
  expectedHostname?: string;
  maxAgeSeconds?: number;
}

export interface TurnstileVerifyResult {
  success: boolean;
  error?: string;
  errorCode?: string;
  isBypassMode?: boolean;
  hostname?: string;
  action?: string;
  challengeTs?: string;
}

const DUMMY_TEST_SECRETS = new Set([
  '1x0000000000000000000000000000000AA',
  '2x0000000000000000000000000000000AB',
  '3x0000000000000000000000000000000FF',
]);

/**
 * Validates a Turnstile token against Cloudflare Siteverify API.
 * 
 * Security Policies:
 * 1. Fail-Closed in Production & Staging: If Turnstile is enforced or running in production/staging
 *    and secret key is missing, reject immediately. Never silently bypass in production!
 * 2. Dummy Key Prevention: Dummy test keys are strictly blocked in production environments.
 * 3. Freshness & Timestamp check: Verifies token was issued within maxAgeSeconds (default 300s).
 * 4. Error Code Mapping: Maps Cloudflare error codes to safe user-friendly messages without leaking secrets.
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  clientIp?: string,
  options?: TurnstileVerifyOptions
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY || process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  const isEnforced =
    process.env.TURNSTILE_ENFORCED === 'true' ||
    process.env.APP_ENV === 'production' ||
    process.env.APP_ENV === 'staging';
  const isProduction =
    process.env.APP_ENV === 'production' ||
    (process.env.NODE_ENV === 'production' && process.env.APP_ENV !== 'development');

  // 1. Missing Secret in Staging/Production -> FAIL-CLOSED
  if (!secret) {
    if (isEnforced) {
      console.error('[Turnstile Security Alert] Enforced Turnstile verification called without TURNSTILE_SECRET_KEY configured!');
      return {
        success: false,
        error: 'Hệ thống bảo mật Turnstile chưa được cấu hình cho môi trường này.',
        errorCode: 'TURNSTILE_SECRET_MISSING',
      };
    }
    // Permitted only in local development / test environments when not explicitly enforced
    return { success: true, isBypassMode: true };
  }

  // 2. Strict Prohibition: Dummy test secrets in Production
  if (isProduction && DUMMY_TEST_SECRETS.has(secret)) {
    console.error('[Turnstile Security Alert] Dummy test secret detected in production environment!');
    return {
      success: false,
      error: 'Cấu hình bảo mật production không hợp lệ.',
      errorCode: 'DUMMY_KEY_IN_PRODUCTION',
    };
  }

  // 3. Token Missing / Empty Check
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return {
      success: false,
      error: 'Vui lòng hoàn tất xác thực bảo mật trước khi tiếp tục.',
      errorCode: 'missing-input-response',
    };
  }

  const cleanToken = token.trim();

  // 4. Test Key Handling (Non-production test environments)
  if (!isProduction) {
    if (secret === '1x0000000000000000000000000000000AA') {
      if (cleanToken === 'invalid-token-test') {
        return { success: false, error: 'Mã xác thực không hợp lệ.', errorCode: 'invalid-input-response' };
      }
      if (cleanToken === 'expired-token-test') {
        return { success: false, error: 'Mã xác thực đã hết hạn hoặc đã được sử dụng.', errorCode: 'timeout-or-duplicate' };
      }
      return { success: true, challengeTs: new Date().toISOString() };
    }
    if (secret === '2x0000000000000000000000000000000AB') {
      return { success: false, error: 'Xác thực bảo mật bị từ chối.', errorCode: 'invalid-input-response' };
    }
    if (secret === '3x0000000000000000000000000000000FF') {
      return { success: false, error: 'Mã xác thực đã hết hạn hoặc đã được sử dụng.', errorCode: 'timeout-or-duplicate' };
    }
  }

  // 5. Cloudflare Siteverify Upstream Call
  try {
    const formData = new URLSearchParams();
    formData.append('secret', secret);
    formData.append('response', cleanToken);
    if (clientIp) {
      formData.append('remoteip', clientIp);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      console.error('[Turnstile] Cloudflare siteverify HTTP error:', response.status);
      return {
        success: false,
        error: 'Máy chủ xác thực bảo mật phản hồi lỗi. Vui lòng thử lại sau.',
        errorCode: 'SITEVERIFY_HTTP_ERROR',
      };
    }

    interface CloudflareSiteverifyResponse {
      success: boolean;
      'error-codes'?: string[];
      challenge_ts?: string;
      hostname?: string;
      action?: string;
      cdata?: string;
    }

    const data = (await response.json()) as CloudflareSiteverifyResponse;

    if (!data.success) {
      const errCodes = data['error-codes'] || [];
      const primaryErr = errCodes[0] || 'verification-failed';
      let userMessage = 'Xác thực bảo mật không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.';

      if (errCodes.includes('timeout-or-duplicate')) {
        userMessage = 'Mã bảo mật đã hết hạn hoặc đã được sử dụng. Vui lòng thử lại.';
      } else if (errCodes.includes('missing-input-response')) {
        userMessage = 'Thiếu mã bảo mật. Vui lòng hoàn tất xác thực.';
      }

      return {
        success: false,
        error: userMessage,
        errorCode: primaryErr,
      };
    }

    // 6. Token Age & Freshness Validation
    if (data.challenge_ts) {
      const challengeTime = new Date(data.challenge_ts).getTime();
      const maxAge = (options?.maxAgeSeconds ?? 300) * 1000;
      if (Date.now() - challengeTime > maxAge) {
        return {
          success: false,
          error: 'Mã bảo mật đã quá thời gian cho phép. Vui lòng xác thực lại.',
          errorCode: 'token-expired',
        };
      }
    }

    // 7. Action Validation (if specified)
    if (options?.action && data.action && data.action !== options.action) {
      return {
        success: false,
        error: 'Hành động xác thực không khớp.',
        errorCode: 'action-mismatch',
      };
    }

    // 8. Hostname Validation (if specified)
    if (options?.expectedHostname && data.hostname && data.hostname !== options.expectedHostname) {
      return {
        success: false,
        error: 'Tên miền xác thực không khớp.',
        errorCode: 'hostname-mismatch',
      };
    }

    return {
      success: true,
      hostname: data.hostname,
      action: data.action,
      challengeTs: data.challenge_ts,
    };
  } catch (error) {
    console.error('[Turnstile] Network exception calling Cloudflare Siteverify:', error);
    // Fail-Closed: Never treat a network error as a pass!
    return {
      success: false,
      error: 'Không thể kết nối đến máy chủ xác thực bảo mật. Vui lòng thử lại.',
      errorCode: 'SITEVERIFY_NETWORK_ERROR',
    };
  }
}
