import type { D1Database } from '@cloudflare/workers-types';
import { z } from 'zod';
import type { AdminPrincipal, AdminRole } from '../../lib/admin-permissions';
import { adminRequestId } from '../admin-context';

const roles = ['OWNER', 'EDITOR', 'SALES'] as const;
const ITERATIONS = 100_000; // ponytail: Workers WebCrypto PBKDF2 ceiling; upgrade with a supported password KDF when runtime permits.
const encoder = new TextEncoder();
const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

export class AdminIdentityError extends Error {
  constructor(public code: string, public status: number) { super(code); }
}

async function dbOrBinding(db?: D1Database): Promise<D1Database> {
  return db || (await import('../media-http')).mediaEnvironment().then(env => env.DB);
}

async function derive(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' }, key, 256);
  return hex(new Uint8Array(bits));
}

export async function hashAdminPassword(password: string): Promise<string> {
  if (typeof password !== 'string' || password.length < 12 || password.length > 200) throw new AdminIdentityError('PASSWORD_LENGTH_12_200', 400);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256$${ITERATIONS}$${hex(salt)}$${await derive(password, salt)}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts[0] !== 'pbkdf2-sha256' || parts[1] !== String(ITERATIONS) || !/^[a-f0-9]{32}$/.test(parts[2] || '') || !/^[a-f0-9]{64}$/.test(parts[3] || '')) return false;
  const salt = Uint8Array.from(parts[2].match(/../g)!, s => parseInt(s, 16));
  const actual = await derive(password, salt);
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ parts[3].charCodeAt(i);
  return diff === 0;
}

async function tokenHash(token: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(token))));
}

export function adminCookie(request: Request): string | null {
  const token = request.headers.get('cookie')?.match(/(?:^|;\s*)admin_session=([^;]+)/)?.[1];
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}

export async function resolveAdmin(request: Request, explicitDb?: D1Database): Promise<AdminPrincipal | null> {
  const token = adminCookie(request);
  if (!token) return null; // Legacy signed cookies and shared bearer tokens no longer authorize requests.
  const db = await dbOrBinding(explicitDb);
  const row = await db.prepare(`SELECT u.id,u.email,u.name,u.role,u.piiExport,u.adminVersion AS version
    FROM AdminSession s JOIN User u ON u.id=s.userId
    WHERE s.tokenHash=? AND s.expiresAt>? AND s.version=u.adminVersion AND u.adminDisabled=0
      AND u.role IN ('OWNER','EDITOR','SALES')`).bind(await tokenHash(token), Date.now()).first<{
    id: string; email: string; name: string | null; role: AdminRole; piiExport: number; version: number;
  }>();
  return row ? { ...row, piiExport: Boolean(row.piiExport) } : null;
}

function audit(db: D1Database, actorId: string, action: string, entityId: string, summary: string, before: number | null = null, after: number | null = null) {
  return db.prepare('INSERT INTO AdminAudit(id,actorId,action,entityId,summary,requestId,entityType,beforeRevision,afterRevision) VALUES(?,?,?,?,?,?,?,?,?)')
    .bind(crypto.randomUUID(), actorId, action, entityId, summary, adminRequestId.getStore() ?? crypto.randomUUID(), action.split('.')[0],before,after);
}

const loginSchema = z.object({ email: z.string().email().max(254).transform(v => v.trim().toLowerCase()), password: z.string().min(1).max(200) });

export async function loginAdmin(input: unknown, explicitDb?: D1Database): Promise<{ token: string; principal: AdminPrincipal }> {
  const { email, password } = loginSchema.parse(input);
  const db = await dbOrBinding(explicitDb);
  let row = await db.prepare('SELECT * FROM User WHERE lower(email)=?').bind(email).first<{
    id: string; email: string; name: string | null; role: AdminRole; password: string; adminDisabled: number; adminVersion: number; piiExport: number;
  }>();
  const owner = await db.prepare("SELECT id FROM User WHERE role='OWNER' LIMIT 1").first();
  // Explicit operator-configured credentials bootstrap only the first Owner; never overwrite a legacy/customer account.
  if (!owner && !row && email === process.env.ADMIN_EMAIL?.trim().toLowerCase() && process.env.ADMIN_PASSWORD) {
    const { timingSafeEqual } = await import('node:crypto');
    const supplied = encoder.encode(password), expected = encoder.encode(process.env.ADMIN_PASSWORD);
    if (supplied.length === expected.length && timingSafeEqual(supplied, expected)) {
      const id = crypto.randomUUID(), guardId = crypto.randomUUID();
      const hashed = await hashAdminPassword(password);
      await db.batch([
        db.prepare("INSERT INTO AdminMutationGuard(id,allowed) SELECT ?,CASE WHEN NOT EXISTS(SELECT 1 FROM User WHERE role='OWNER') THEN 1 ELSE 0 END").bind(guardId),
        db.prepare("INSERT INTO User(id,email,password,name,role,updatedAt) VALUES(?,?,?,'Chủ cửa hàng','OWNER',CURRENT_TIMESTAMP)").bind(id, email, hashed),
        audit(db, id, 'owner.bootstrap', id, 'Owner đầu tiên từ cấu hình operator'),
        db.prepare('DELETE FROM AdminMutationGuard WHERE id=?').bind(guardId),
      ]);
      row = await db.prepare('SELECT * FROM User WHERE id=?').bind(id).first<typeof row>();
    }
  }
  if (!row || !roles.includes(row.role) || row.adminDisabled || !(await verifyPassword(password, row.password))) {
    // Match expensive KDF work for unknown users to reduce email enumeration through timing.
    if (!row) await derive(password, new Uint8Array(16));
    throw new AdminIdentityError('INVALID_CREDENTIALS', 401);
  }
  const principal: AdminPrincipal = { id: row.id, email: row.email, name: row.name, role: row.role, piiExport: Boolean(row.piiExport), version: row.adminVersion };
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  const guardId = crypto.randomUUID();
  await db.batch([
    db.prepare('INSERT INTO AdminMutationGuard(id,allowed) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM User WHERE id=? AND adminVersion=? AND adminDisabled=0 AND password=?) THEN 1 ELSE 0 END').bind(guardId, row.id, row.adminVersion, row.password),
    db.prepare('DELETE FROM AdminSession WHERE userId=? AND expiresAt<=?').bind(row.id, Date.now()),
    db.prepare('INSERT INTO AdminSession(tokenHash,userId,version,expiresAt) VALUES(?,?,?,?)').bind(await tokenHash(token), row.id, row.adminVersion, Date.now() + 8 * 60 * 60 * 1000),
    audit(db, row.id, 'session.login', row.id, 'Đăng nhập quản trị'),
    db.prepare('DELETE FROM AdminMutationGuard WHERE id=?').bind(guardId),
  ]);
  return { token, principal };
}

export async function logoutAdmin(request: Request, explicitDb?: D1Database): Promise<void> {
  const token = adminCookie(request);
  if (token) await (await dbOrBinding(explicitDb)).prepare('DELETE FROM AdminSession WHERE tokenHash=?').bind(await tokenHash(token)).run();
}

const accountSchema = z.object({
  id: z.string().uuid().optional(), expectedRevision: z.number().int().nonnegative().optional(),
  email: z.string().trim().email().max(254).transform(v => v.toLowerCase()), name: z.string().trim().min(1).max(160),
  role: z.enum(roles), disabled: z.boolean(), piiExport: z.boolean(), password: z.string().min(12).max(200).optional(),
}).strict();

export async function saveAdminAccount(actor: AdminPrincipal, input: unknown, explicitDb?: D1Database) {
  if (actor.role !== 'OWNER') throw new AdminIdentityError('FORBIDDEN', 403);
  const data = accountSchema.parse(input), db = await dbOrBinding(explicitDb);
  if (data.id && data.expectedRevision === undefined) throw new AdminIdentityError('EXPECTED_REVISION_REQUIRED', 400);
  if (!data.id && !data.password) throw new AdminIdentityError('PASSWORD_REQUIRED', 400);
  const id = data.id || crypto.randomUUID(), guardId = crypto.randomUUID();
  const hashed = data.password ? await hashAdminPassword(data.password) : null;
  const actorCheck = "EXISTS(SELECT 1 FROM User WHERE id=? AND role='OWNER' AND adminDisabled=0 AND adminVersion=?)";
  const guard = data.id
    ? db.prepare(`INSERT INTO AdminMutationGuard(id,allowed) SELECT ?,CASE WHEN ${actorCheck} AND EXISTS(SELECT 1 FROM User WHERE id=? AND adminVersion=? AND role IN ('OWNER','EDITOR','SALES')) THEN 1 ELSE 0 END`).bind(guardId, actor.id, actor.version, id, data.expectedRevision!)
    : db.prepare(`INSERT INTO AdminMutationGuard(id,allowed) SELECT ?,CASE WHEN ${actorCheck} THEN 1 ELSE 0 END`).bind(guardId, actor.id, actor.version);
  const mutation = data.id
    ? db.prepare(`UPDATE User SET email=?,name=?,role=?,adminDisabled=?,piiExport=?,password=COALESCE(?,password),adminVersion=adminVersion+1,updatedAt=CURRENT_TIMESTAMP WHERE id=?`)
      .bind(data.email, data.name, data.role, Number(data.disabled), Number(data.piiExport), hashed, id)
    : db.prepare('INSERT INTO User(id,email,password,name,role,adminDisabled,piiExport,updatedAt) VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP)')
      .bind(id, data.email, hashed!, data.name, data.role, Number(data.disabled), Number(data.piiExport));
  try {
    await db.batch([guard, mutation, db.prepare('DELETE FROM AdminSession WHERE userId=?').bind(id),
      audit(db, actor.id, data.id ? 'account.update' : 'account.create', id, JSON.stringify({ role: data.role, disabled: data.disabled, piiExport: data.piiExport, resetPassword: Boolean(hashed) }),data.id?data.expectedRevision!:null,data.id?data.expectedRevision!+1:0),
      db.prepare('DELETE FROM AdminMutationGuard WHERE id=?').bind(guardId)]);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/LAST_ACTIVE_OWNER/.test(message)) throw new AdminIdentityError('LAST_ACTIVE_OWNER', 409);
    if (/CHECK constraint failed/.test(message)) throw new AdminIdentityError('REVISION_OR_ACTOR_CHANGED', 409);
    if (/UNIQUE constraint failed/.test(message)) throw new AdminIdentityError('EMAIL_ALREADY_EXISTS', 409);
    throw error;
  }
  return { id };
}

export async function listAdminAccounts(db: D1Database) {
  return (await db.prepare("SELECT id,email,name,role,adminDisabled AS disabled,piiExport,adminVersion AS revision FROM User WHERE role IN ('OWNER','EDITOR','SALES') ORDER BY email LIMIT 200").all()).results;
}
