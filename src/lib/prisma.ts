import type { D1Database } from '@cloudflare/workers-types';
import { PrismaClient } from '../../generated/prisma/client';
export { PrismaClient };
import { PrismaD1 } from '@prisma/adapter-d1';

// WeakMap cache for PrismaClient instances keyed by D1Database binding instance
const clientCache = new WeakMap<D1Database, PrismaClient>();
let explicitlyConfiguredD1: D1Database | undefined;
let cachedFallbackClient: PrismaClient | undefined;
let cachedFallbackUrl: string | undefined;

/**
 * Creates or retrieves a cached Cloudflare D1-native Prisma Client using @prisma/adapter-d1.
 * Recommended for Cloudflare Workers request handlers and scheduled tasks.
 */
export function createPrismaD1Client(d1: D1Database): PrismaClient {
  const existing = clientCache.get(d1);
  if (existing) return existing;

  const adapter = new PrismaD1(d1);
  const client = new PrismaClient({ adapter });
  clientCache.set(d1, client);
  return client;
}

/**
 * Explicitly sets the active D1Database instance for the current execution context.
 */
export function setD1Database(d1: D1Database): void {
  explicitlyConfiguredD1 = d1;
}

let nodeReq: ((id: string) => unknown) | undefined;
function safeRequire<T>(moduleName: string): T | undefined {
  if (typeof require === 'function') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require(moduleName) as T;
    } catch {}
  }
  if (!nodeReq && typeof process !== 'undefined' && process.versions?.node) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createRequire } = require('node:module');
      nodeReq = createRequire(process.cwd() + '/');
    } catch {
      try {
        const reqLoader = new Function('return require("node:module")');
        const { createRequire } = reqLoader();
        nodeReq = createRequire(process.cwd() + '/');
      } catch {}
    }
  }
  if (nodeReq) {
    try {
      return nodeReq(moduleName) as T;
    } catch {}
  }
  return undefined;
}

/**
 * Resolves the active D1 binding without relying on arbitrary global state.
 * Priority:
 * 1. Explicitly configured D1 from request context (setD1Database)
 * 2. Official Cloudflare Workers nodejs_compat env (cloudflare:workers)
 * 3. Worker global env fallback (when passed via runtime context)
 */
export function resolveD1Binding(): D1Database | undefined {
  if (explicitlyConfiguredD1) return explicitlyConfiguredD1;

  // 1. Official Cloudflare Workers nodejs_compat env access
  const cf = safeRequire<{ env?: Env }>('cloudflare:workers');
  if (cf?.env?.DB) return cf.env.DB;

  // 2. Context global env fallback (when attached to worker global scope)
  const workerGlobalEnv = (globalThis as unknown as { env?: Env }).env;
  if (workerGlobalEnv?.DB) return workerGlobalEnv.DB;

  // 3. Global binding fallback
  if ((globalThis as unknown as { DB?: D1Database }).DB) {
    return (globalThis as unknown as { DB?: D1Database }).DB;
  }

  return undefined;
}

export function getD1Database(): D1Database | undefined {
  return resolveD1Binding();
}

/**
 * Resolves the appropriate PrismaClient instance.
 * Priority order:
 * 1. Explicit D1Database passed as argument
 * 2. Resolved Cloudflare D1 binding (DB)
 * 3. Existing Node DATABASE_URL (via dynamic require for migration/scripts fallback)
 */
export function getPrismaClient(d1?: D1Database): PrismaClient {
  if (d1) {
    return createPrismaD1Client(d1);
  }

  const activeD1 = resolveD1Binding();
  if (activeD1) {
    return createPrismaD1Client(activeD1);
  }

  // Local Node environment fallback: explicit DATABASE_URL or local D1 SQLite file
  let url = process.env.DATABASE_URL || cachedFallbackUrl;
  if (!url) {
    try {
      const fs = safeRequire<{ existsSync: (p: string) => boolean; readdirSync: (p: string) => string[] }>('node:fs');
      const path = safeRequire<{ resolve: (...args: string[]) => string }>('node:path');
      if (fs && path) {
        const d1Dir = path.resolve(process.cwd(), '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
        if (fs.existsSync(/*turbopackIgnore: true*/ d1Dir)) {
          const files = fs.readdirSync(/*turbopackIgnore: true*/ d1Dir);
          // Look for table-populated D1 database (skip metadata)
          const sqliteFiles = files.filter(f => f.endsWith('.sqlite') && !f.startsWith('metadata'));
          const targetFile = sqliteFiles.find(f => f.startsWith('b65da93e')) || sqliteFiles[0];
          if (targetFile) {
            url = `file:${path.resolve(d1Dir, targetFile)}`;
            cachedFallbackUrl = url;
          }
        }
      }
    } catch {
      // Ignore if not in Node
    }
  }

  if (url && url.trim() !== '') {
    if (cachedFallbackClient && cachedFallbackUrl === url) {
      return cachedFallbackClient;
    }
    try {
      const libsql = safeRequire<{ PrismaLibSql: new (args: { url: string; authToken?: string }) => unknown }>('@prisma/adapter-libsql');
      if (libsql?.PrismaLibSql) {
        const adapter = new libsql.PrismaLibSql({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
        const client = new PrismaClient({ adapter } as never) as unknown as PrismaClient;
        cachedFallbackClient = client;
        cachedFallbackUrl = url;
        return client;
      }
    } catch {
      // Ignore if adapter-libsql is not available in current runtime
    }
  }

  throw new Error(
    'No database connection found. Ensure Cloudflare D1 binding (DB) is provided or DATABASE_URL is configured.'
  );
}

/**
 * Transparent proxy to the active PrismaClient instance.
 * Preserves compatibility with existing call sites (`import { prisma } from "@/lib/prisma"`)
 * while routing database operations through Cloudflare D1.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
