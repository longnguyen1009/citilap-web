import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getD1Database } from '@/lib/prisma';
import type { D1Database } from '@cloudflare/workers-types';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

// In-memory sliding window cache for read endpoints (e.g. search suggestions)
// and fallback when database is unavailable.
interface MemoryEntry {
  count: number;
  expiresAt: number;
}
const memoryCache = new Map<string, MemoryEntry>();

// Periodic memory cache cleanup
let lastCleanup = Date.now();
function cleanupMemoryCache() {
  const now = Date.now();
  if (now - lastCleanup < 60000) return;
  lastCleanup = now;
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Extracts normalized client IP address from request headers
 */
export function getClientIp(request: Request): string {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  const xForwarded = request.headers.get('x-forwarded-for');
  if (xForwarded) {
    const firstIp = xForwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();

  return '127.0.0.1';
}

/**
 * Generates an anonymized keyed hash of client IP for privacy preservation and anti-rainbow-table security
 */
export function hashIp(ip: string): string {
  const pepper = process.env.RATE_LIMIT_PEPPER || process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'citilap-rate-limit-pepper-2026';
  return createHash('sha256')
    .update(`${ip}:${pepper}`)
    .digest('hex')
    .slice(0, 16);
}

/**
 * In-memory rate limiting check (Ideal for fast read endpoints like search suggestions)
 */
export function checkInMemoryRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  cleanupMemoryCache();
  const now = Date.now();
  const entry = memoryCache.get(key);

  if (!entry || entry.expiresAt <= now) {
    const expiresAt = now + windowSeconds * 1000;
    memoryCache.set(key, { count: 1, expiresAt });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  if (entry.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((entry.expiresAt - now) / 1000));
    return { allowed: false, remaining: 0, retryAfter };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, retryAfter: 0 };
}

/**
 * Database-backed rate limiting check for sensitive write mutations (Orders, Contact, Login)
 * Uses D1 when available so rate limits persist across multiple Cloudflare Edge isolates.
 */
export async function checkRateLimit(
  action: 'order' | 'contact' | 'login' | 'checkout-quote' | 'storefront-metrics',
  request: Request,
  limit: number,
  windowSeconds: number,
  d1Database?: D1Database
): Promise<RateLimitResult> {
  const ip = getClientIp(request);
  const ipKey = hashIp(ip);
  const key = `rl:${action}:${ipKey}`;
  const now = Date.now();
  const expiresAt = now + windowSeconds * 1000;
  try {
    const db = d1Database || getD1Database();
    if (!db) throw new Error('Rate limit database unavailable');
    // One statement claims each slot; concurrent callers cannot share a remaining slot.
    const expiry = "CASE WHEN typeof(expiresAt) IN ('integer','real') THEN expiresAt ELSE (julianday(expiresAt)-2440587.5)*86400000 END";
    const row = await db.prepare(`INSERT INTO RateLimitRecord(key,count,expiresAt) VALUES(?,1,?)
      ON CONFLICT(key) DO UPDATE SET
        count=CASE WHEN (${expiry})<=? THEN 1 ELSE min(count+1,?) END,
        expiresAt=CASE WHEN (${expiry})<=? THEN excluded.expiresAt ELSE expiresAt END
      RETURNING count,(${expiry}) AS expiry`)
      .bind(key, expiresAt, now, limit + 1, now).first<{ count: number; expiry: number }>();
    if (!row) throw new Error('Rate limit claim failed');
    // Opportunistic cleanup (~2%) keeps the table small; failures never affect the decision.
    if (Math.random() < 0.02) {
      await db.prepare(`DELETE FROM RateLimitRecord WHERE (${expiry})<=?`).bind(now).run().catch(() => {});
    }
    return { allowed: row.count <= limit, remaining: Math.max(0, limit - row.count),
      retryAfter: row.count <= limit ? 0 : Math.max(1, Math.ceil((row.expiry - now) / 1000)) };
  } catch {
    // Sensitive writes fail closed if the shared limiter is unavailable.
    return { allowed: false, remaining: 0, retryAfter: 60 };
  }
}

/**
 * Standard HTTP 429 Too Many Requests response
 */
export function rateLimitExceededResponse(retryAfter = 60): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Hệ thống đang tiếp nhận quá nhiều yêu cầu từ kết nối của bạn. Quý khách vui lòng thử lại sau ít phút hoặc liên hệ hotline 0899.188.186 để được hỗ trợ trực tiếp.',
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'Cache-Control': 'no-store, private',
      },
    }
  );
}
