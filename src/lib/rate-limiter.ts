import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getPrismaClient } from '@/lib/prisma';
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
  action: 'order' | 'contact' | 'login',
  request: Request,
  limit: number,
  windowSeconds: number,
  d1Database?: D1Database
): Promise<RateLimitResult> {
  const ip = getClientIp(request);
  const ipKey = hashIp(ip);
  const key = `rl:${action}:${ipKey}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);

  try {
    const prisma = getPrismaClient(d1Database);

    // Opportunistic cleanup of expired records (5% sample rate to keep D1 lean)
    if (Math.random() < 0.05) {
      prisma.rateLimitRecord.deleteMany({
        where: { expiresAt: { lt: now } },
      }).catch(() => {});
    }

    const existing = await prisma.rateLimitRecord.findUnique({
      where: { key },
    });

    if (!existing || existing.expiresAt <= now) {
      await prisma.rateLimitRecord.upsert({
        where: { key },
        create: {
          key,
          count: 1,
          expiresAt,
        },
        update: {
          count: 1,
          expiresAt,
        },
      });
      return { allowed: true, remaining: limit - 1, retryAfter: 0 };
    }

    if (existing.count >= limit) {
      const retryAfter = Math.max(1, Math.ceil((existing.expiresAt.getTime() - now.getTime()) / 1000));
      return { allowed: false, remaining: 0, retryAfter };
    }

    await prisma.rateLimitRecord.update({
      where: { key },
      data: { count: { increment: 1 } },
    });

    return { allowed: true, remaining: limit - (existing.count + 1), retryAfter: 0 };
  } catch {
    // Graceful fallback to memory check if database query fails or is not accessible
    return checkInMemoryRateLimit(key, limit, windowSeconds);
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
