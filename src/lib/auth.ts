import { createHmac, timingSafeEqual } from "node:crypto";

/** Protects server-side admin mutations with a bearer token or HttpOnly cookie.
 * Set ADMIN_API_TOKEN in the deployment environment. Never use a fallback token.
 */
export function isAdminRequest(request: Request): boolean {
  const configured = process.env.ADMIN_API_TOKEN;
  if (!configured || configured.length < 32) return false;

  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  const cookie = request.headers.get("cookie")?.match(/(?:^|;\s*)admin_session=([^;]+)/)?.[1];
  if (!bearer && cookie && verifyAdminSession(cookie, configured)) return true;
  const supplied = bearer;
  if (!supplied || supplied.length !== configured.length) return false;

  try {
    return timingSafeEqual(Buffer.from(supplied), Buffer.from(configured));
  } catch {
    return false;
  }
}

export function createAdminSession(configured = process.env.ADMIN_API_TOKEN): string {
  if (!configured || configured.length < 32) throw new Error("ADMIN_API_TOKEN is not configured");
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 8;
  const signature = createHmac("sha256", configured).update(String(expires)).digest("base64url");
  return `${expires}.${signature}`;
}

function verifyAdminSession(value: string, configured: string): boolean {
  const [expiresText, signature] = value.split(".");
  const expires = Number(expiresText);
  if (!Number.isInteger(expires) || expires < Math.floor(Date.now() / 1000) || !signature) return false;
  const expected = createHmac("sha256", configured).update(String(expires)).digest("base64url");
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function requireAdmin(request: Request): Response | null {
  if (isAdminRequest(request)) return null;
  return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
}

/**
 * Validates Origin and Fetch Metadata headers to prevent CSRF on cookie-authenticated admin mutations.
 */
export function validateMutationOrigin(request: Request): boolean {
  // If authorization is via Bearer token (API client), ambient cookie CSRF does not apply
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return true;
  }

  // Fetch Metadata defense: modern browsers strictly identify cross-site requests
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite && secFetchSite === "cross-site") {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    // Check Referer header if Origin is omitted
    const referer = request.headers.get("referer");
    if (!referer) {
      // In cookie-authenticated mutations, lack of both Origin and Referer is rejected
      const cookie = request.headers.get("cookie");
      if (cookie && cookie.includes("admin_session")) {
        return false;
      }
      return true;
    }
    try {
      const refererUrl = new URL(referer);
      const requestUrl = new URL(request.url);
      return refererUrl.origin === requestUrl.origin;
    } catch {
      return false;
    }
  }

  try {
    const requestUrl = new URL(request.url);
    if (origin === requestUrl.origin) return true;

    // Allowed local dev/test origins in non-production
    const allowedLocal = [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:8787",
      "http://localhost:8787",
    ];
    if (process.env.NODE_ENV !== "production" && allowedLocal.includes(origin)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Enforces admin authorization AND CSRF protection (Origin & Fetch Metadata validation) for mutations.
 */
export function requireAdminMutation(request: Request): Response | null {
  const authDenied = requireAdmin(request);
  if (authDenied) return authDenied;

  if (!validateMutationOrigin(request)) {
    return Response.json(
      { success: false, error: "CSRF check failed: Cross-origin mutation rejected" },
      { status: 403 }
    );
  }

  return null;
}

export function requireCronSecret(request: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) {
    return Response.json({ success: false, error: "Cron is not configured" }, { status: 503 });
  }
  const supplied = request.headers.get("x-cron-secret");
  if (!supplied || supplied.length !== secret.length) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    if (!timingSafeEqual(Buffer.from(supplied), Buffer.from(secret))) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
