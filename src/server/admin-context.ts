import { AsyncLocalStorage } from 'node:async_hooks';
import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import type { AdminPrincipal } from '../lib/admin-permissions';

export const adminContext = new AsyncLocalStorage<AdminPrincipal | null>();
const context = adminContext;
export const adminActor = (fallback = 'legacy/system') => context.getStore()?.id || fallback;

export function adminAuditStatements(db: D1Database, action: string, entityId: string, summary: string, successfulEvent: string | null = null, eventType: 'order' | 'contact' = 'order'): D1PreparedStatement[] {
  const actor = context.getStore();
  if (!actor) return []; // Legacy/cron fixtures retain their original history; no invented staff identity.
  const table = eventType === 'contact' ? 'ContactEvent' : 'OrderEvent';
  return [db.prepare(`INSERT INTO AdminAudit(id,actorId,action,entityId,summary) SELECT ?,?,?,?,? WHERE ? IS NULL OR EXISTS(SELECT 1 FROM ${table} WHERE id=?)`)
    .bind(crypto.randomUUID(), actor.id, action, entityId, summary, successfulEvent, successfulEvent)];
}
