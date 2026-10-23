import type { D1Database } from '@cloudflare/workers-types';
import { MediaError } from './media-library.service';

const documents = new WeakMap<D1Database, Map<string, { revision: number; document: unknown }>>();

// Call only after a fresh public lookup has checked publication and soft deletion.
export async function publishedDocument<T>(db: D1Database, kind: 'Page' | 'Post', id: string, revision: number): Promise<T> {
  let cache = documents.get(db);
  if (!cache) { cache = new Map(); documents.set(db, cache); }
  const key = `${kind}:${id}`;
  const cached = cache.get(key);
  if (cached?.revision === revision) return structuredClone(cached.document) as T;
  const column = kind === 'Page' ? 'pageId' : 'postId';
  const row = await db.prepare(`SELECT published FROM ${kind}Studio WHERE ${column}=? AND publishedRevision=? AND published IS NOT NULL`)
    .bind(id, revision).first<{ published: string }>();
  if (!row) throw new MediaError('Published content changed during read; retry request.', 503);
  const document: T = JSON.parse(row.published);
  // ponytail: retain 64 snapshots per DB; use a shared cache only after measuring misses.
  if (!cache.has(key) && cache.size >= 64) cache.delete(cache.keys().next().value!);
  cache.set(key, { revision, document });
  return structuredClone(document);
}
