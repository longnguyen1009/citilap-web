import { z } from 'zod';
import { adminContext, adminAuditStatements, adminRequestId } from '../admin-context';
import { cmsTables, scheduleContext, type CmsEntity } from '../cms-schedule-context';
import { MediaError, type MediaEnvironment } from './media-library.service';
import type { AdminPrincipal } from '../../lib/admin-permissions';

const schema=z.object({entityType:z.enum(['product','post','page','landing','navigation']),entityId:z.string().min(1).max(160),revision:z.number().int().positive(),action:z.enum(['publish','unpublish']),executeAt:z.string().datetime({offset:true})});
type Job={id:string;entityType:CmsEntity;entityId:string;revision:number;action:'publish'|'unpublish';executeAt:number;actorId:string;actorVersion:number;publicSnapshot:string|null;publicRevision:number|null;state:string;claimToken:string;attempts:number};
function actor(){const a=adminContext.getStore();if(!a || !['OWNER','EDITOR'].includes(a.role))throw new MediaError('Không có quyền xuất bản.',403);return a;}
export async function createSchedule(env:MediaEnvironment,input:unknown){
  const a=actor(),d=schema.parse(input),at=Date.parse(d.executeAt),db=env.DB;
  if(at<=Date.now() || at>Date.now()+366*86400000)throw new MediaError('Chọn thời gian tương lai trong một năm.',422);
  const [table,key,history]=cmsTables[d.entityType];
  if(d.entityType==='navigation' && (d.entityId!=='site' || d.action==='unpublish'))throw new MediaError('Navigation chỉ hỗ trợ lịch xuất bản site.',422);
  const historyKey=d.entityType==='navigation'?"'site'":key;
  const row=await db.prepare(`SELECT published,publishedRevision FROM ${table} WHERE ${key}=?`).bind(d.entityId).first<{published:string|null;publishedRevision:number|null}>();
  if(!row || !await db.prepare(`SELECT 1 FROM ${history} WHERE ${historyKey}=? AND revision=?`).bind(d.entityId,d.revision).first())throw new MediaError('Không tìm thấy revision đã lưu.',404);
  const id=crypto.randomUUID();
  try{const [result]=await db.batch([
    db.prepare(`INSERT INTO CmsSchedule(id,entityType,entityId,revision,action,executeAt,actorId,actorVersion,publicSnapshot,publicRevision)
      SELECT ?,?,?,?,?,?,?,?,?,? FROM User WHERE id=? AND adminVersion=? AND adminDisabled=0 AND role IN ('OWNER','EDITOR')`)
      .bind(id,d.entityType,d.entityId,d.revision,d.action,at,a.id,a.version,row.published,row.publishedRevision,a.id,a.version),
    ...adminAuditStatements(db,'schedule.create',d.entityId,'Publication scheduled',null,'order',{changed:true,before:d.revision}),
  ]);if(!result.meta.changes)throw new MediaError('Quyền lập lịch đã thay đổi.',403);}catch(e){if(e instanceof Error && e.message.includes('UNIQUE'))throw new MediaError('Đối tượng đã có lịch đang chờ. Hủy lịch cũ trước.',409);throw e;}
  return {id};
}
export async function listSchedules(env:MediaEnvironment,type?:string,id?:string){
  actor();
  return (await env.DB.prepare("SELECT * FROM CmsSchedule WHERE (?='' OR entityType=?) AND (?='' OR entityId=?) ORDER BY executeAt DESC LIMIT 100").bind(type||'',type||'',id||'',id||'').all<Job>()).results;
}
export async function cancelSchedule(env:MediaEnvironment,id:string){
  actor();
  const [r]=await env.DB.batch([env.DB.prepare("UPDATE CmsSchedule SET state='CANCELLED',leaseUntil=NULL WHERE id=? AND state IN ('PENDING','RUNNING')").bind(id),...adminAuditStatements(env.DB,'schedule.cancel',id,'Schedule cancelled',null,'order',{changed:true})]);
  if(!r.meta.changes)throw new MediaError('Lịch đã chạy hoặc không còn chờ.',409);
  return {id,state:'CANCELLED'};
}
export async function runSchedules(env:MediaEnvironment,now=Date.now()){
  const db=env.DB;
  const jobs=(await db.prepare("SELECT id FROM CmsSchedule WHERE executeAt<=? AND (state='PENDING' OR (state='RUNNING' AND leaseUntil<=?)) ORDER BY executeAt LIMIT 20").bind(now,now).all<{id:string}>()).results;
  for(const {id} of jobs){
    const token=crypto.randomUUID();
    const job=await db.prepare("UPDATE CmsSchedule SET state='RUNNING',claimToken=?,leaseUntil=?,attempts=attempts+1 WHERE id=? AND (state='PENDING' OR (state='RUNNING' AND leaseUntil<=?)) RETURNING *").bind(token,now+120000,id,now).first<Job>();
    if(!job)continue;
    let failure='FAILED',code='PUBLICATION_FAILED';
    try{
      const user=await db.prepare("SELECT id,email,name,role,piiExport,adminVersion AS version FROM User WHERE id=? AND adminDisabled=0 AND adminVersion=? AND role IN ('OWNER','EDITOR')").bind(job.actorId,job.actorVersion).first<AdminPrincipal>();
      if(!user){failure='BLOCKED';code='ACTOR_REVOKED';throw new Error(code);}
      const [table,key,history]=cmsTables[job.entityType];
      const historyKey=job.entityType==='navigation'?"'site'":key;
      const current=await db.prepare(`SELECT revision,draft,published,publishedRevision FROM ${table} WHERE ${key}=?`).bind(job.entityId).first<{revision:number;draft:string;published:string|null;publishedRevision:number|null}>();
      const revision=await db.prepare(`SELECT document FROM ${history} WHERE ${historyKey}=? AND revision=?`).bind(job.entityId,job.revision).first<{document:string}>();
      if(!current || !revision || current.published!==job.publicSnapshot || current.publishedRevision!==job.publicRevision){failure='CONFLICT';code='PUBLICATION_CHANGED';throw new Error(code);}
      await adminRequestId.run('schedule:'+id,()=>adminContext.run(user,()=>scheduleContext.run({id,token,type:job.entityType,entityId:job.entityId,draft:current.draft},async()=>{
        const input={expectedRevision:current.revision,action:job.action,document:JSON.parse(revision.document)};
        switch(job.entityType){
          case 'product':return (await import('./product-studio.service')).writeStudio(env,job.entityId,input);
          case 'post':return (await import('./post.service')).writePost(env,job.entityId,input);
          case 'page':return (await import('./page.service')).writePage(env,job.entityId,input);
          case 'landing':return (await import('./site-builder.service')).writeLandingPage(env,job.entityId,input);
          case 'navigation':return (await import('./navigation.service')).writeNavigation(env,input);
        }
      })));
      console.log('CMS_SCHEDULE_DONE',id,job.entityType,job.revision);
    }catch(e){
      if(e instanceof MediaError && e.status===409){failure='CONFLICT';code='REVISION_CONFLICT';}
      if(e instanceof Error && /CHECK constraint|AdminMutationGuard/.test(e.message)){failure='CONFLICT';code='CLAIM_OR_PUBLICATION_CHANGED';}
      const state=failure==='FAILED' && job.attempts<3?'PENDING':failure;
      await db.prepare("UPDATE CmsSchedule SET state=?,errorCode=?,leaseUntil=NULL,executeAt=CASE WHEN ?='PENDING' THEN ? ELSE executeAt END WHERE id=? AND state='RUNNING' AND claimToken=?")
        .bind(state,code,state,now+60000,id,token).run();
      console.log('CMS_SCHEDULE_STOP',id,state,code);
    }
  }
}
