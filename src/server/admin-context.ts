import { AsyncLocalStorage } from 'node:async_hooks';
import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import type { AdminPrincipal } from '../lib/admin-permissions';

export const adminContext = new AsyncLocalStorage<AdminPrincipal | null>();
export const adminRequestId = new AsyncLocalStorage<string>();
const context = adminContext;
export const adminActor = (fallback = 'legacy/system') => context.getStore()?.id || fallback;

export function adminAuditStatements(db: D1Database, action: string, entityId: string, summary: string, successfulEvent: string | null = null, eventType: 'order' | 'contact' = 'order', metadata: { before?: number; after?: number; changed?: boolean } = {}): D1PreparedStatement[] {
  const actor = context.getStore();
  if (!actor) return []; // Legacy/cron fixtures retain their original history; no invented staff identity.
  const table = eventType === 'contact' ? 'ContactEvent' : 'OrderEvent';
  return [db.prepare(`INSERT INTO AdminAudit(id,actorId,action,entityId,summary,requestId,entityType,beforeRevision,afterRevision,executor)
    SELECT ?,?,?,?,?,?,?,?,?,? WHERE (?=0 OR changes()>0) AND (? IS NULL OR EXISTS(SELECT 1 FROM ${table} WHERE id=?))`)
    .bind(crypto.randomUUID(), actor.id, action, entityId, summary, adminRequestId.getStore() ?? null, action.split('.')[0], metadata.before ?? null, metadata.after ?? null, adminRequestId.getStore()?.startsWith('schedule:')?'system/schedule':'request', metadata.changed ? 1 : 0, successfulEvent, successfulEvent)];
}
