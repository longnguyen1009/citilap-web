import { timingSafeEqual } from "node:crypto";
import { adminCapability, canAdmin, type AdminPrincipal } from './admin-permissions';
import { resolveAdmin } from '../server/services/admin-identity.service';

const principals = new WeakMap<Request, AdminPrincipal>();
export function authenticatedAdmin(request: Request): AdminPrincipal {
  const principal = principals.get(request);
  if (!principal) throw new Error('ADMIN_PRINCIPAL_REQUIRED');
  return principal;
}
export async function isAdminRequest(request: Request): Promise<boolean> {
  const principal = await resolveAdmin(request);
  return Boolean(principal && canAdmin(principal, adminCapability(new URL(request.url).pathname)));
}
export async function requireAdmin(request: Request): Promise<Response | null> {
  try {
    const principal = await resolveAdmin(request);
    if (!principal) return Response.json({success:false,error:'Unauthorized'}, {status:401});
    if (!canAdmin(principal, adminCapability(new URL(request.url).pathname))) {
      return Response.json({success:false,error:'Forbidden'}, {status:403});
    }
    principals.set(request, principal);
    return null;
  } catch {
    return Response.json({success:false,error:'Authentication unavailable'}, {status:503});
  }
}

/**
 * Validates Origin and Fetch Metadata headers to prevent CSRF on cookie-authenticated admin mutations.
 */
export function validateMutationOrigin(request: Request): boolean {
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
export async function requireAdminMutation(request: Request): Promise<Response | null> {
  const authDenied = await requireAdmin(request);
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
