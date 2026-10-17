import { AsyncLocalStorage } from 'node:async_hooks';
import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';

export const cmsTables = {
  product: ['ProductStudio','productId','ProductStudioRevision'],
  post: ['PostStudio','postId','PostStudioRevision'],
  page: ['PageStudio','pageId','PageStudioRevision'],
  landing: ['LandingPageStudio','pageId','LandingPageRevision'],
  navigation: ['NavigationStudio','id','NavigationRevision'],
} as const;
export type CmsEntity = keyof typeof cmsTables;
export const scheduleContext = new AsyncLocalStorage<{id:string;token:string;type:CmsEntity;entityId:string;draft:string}>();

/** Job claim, permission, public CAS, publication and completion share one D1 transaction. */
export async function cmsMutationBatch(db: D1Database, statements: D1PreparedStatement[]) {
  const job = scheduleContext.getStore();
  if (!job) return db.batch(statements);
  const [table,key,history] = cmsTables[job.type], guard=crypto.randomUUID();
  const revisionColumns=job.type==='navigation'?'':`${key},`;
  const revisionValues=job.type==='navigation'?'':`${key},`;
  const actorColumns=job.type==='product'?'':',actor';
  const actorValues=job.type==='product'?'':",'system/schedule'";
  return db.batch([
    db.prepare(`INSERT INTO AdminMutationGuard(id,allowed) SELECT ?,CASE WHEN EXISTS(
      SELECT 1 FROM CmsSchedule j JOIN User u ON u.id=j.actorId JOIN ${table} s ON s.${key}=j.entityId
      WHERE j.id=? AND j.state='RUNNING' AND j.claimToken=? AND u.adminDisabled=0 AND u.adminVersion=j.actorVersion
      AND u.role IN ('OWNER','EDITOR') AND s.published IS j.publicSnapshot AND s.publishedRevision IS j.publicRevision) THEN 1 ELSE 0 END`).bind(guard,job.id,job.token),
    ...statements,
    // Preserve newer work as its own revision, so future schedules pin the draft shown in UI.
    db.prepare(`INSERT INTO ${history}(${revisionColumns}revision,document,action${actorColumns})
      SELECT ${revisionValues}revision+1,?,'save'${actorValues} FROM ${table} WHERE ${key}=? AND draft!=?`).bind(job.draft,job.entityId,job.draft),
    db.prepare(`UPDATE ${table} SET draft=?,revision=revision+1 WHERE ${key}=? AND draft!=?`).bind(job.draft,job.entityId,job.draft),
    db.prepare("UPDATE CmsSchedule SET state='DONE',leaseUntil=NULL,errorCode=NULL WHERE id=? AND claimToken=?").bind(job.id,job.token),
    db.prepare('DELETE FROM AdminMutationGuard WHERE id=?').bind(guard),
  ]);
}
