import {z} from 'zod';
import type {D1Database} from '@cloudflare/workers-types';
import {adminAuditStatements} from '../admin-context';
import {MediaError} from './media-library.service';

const reserved=/^\/(admin|api|auth|login|logout|preview|checkout|cart|order-tracking|_next|sitemap\.xml|robots\.txt)(\/|$)/i;
export function redirectPath(value:string){
  // ponytail: literal ASCII paths only; add percent-encoded Unicode only with a shared route normalizer.
  if(value.length>500 || !/^\/[a-zA-Z0-9/_-]*$/.test(value) || value.includes('//') || reserved.test(value))throw new MediaError('Chỉ dùng đường dẫn nội bộ; không query, mã hóa, route hệ thống hoặc host ngoài.',422);
  return value==='/'?value:value.replace(/\/+$/,'');
}
const schema=z.object({id:z.string().min(1).max(160).optional(),expectedRevision:z.number().int().nonnegative(),source:z.string(),target:z.string(),enabled:z.boolean(),note:z.string().trim().max(500).default('')});
export async function saveRedirect(db:D1Database,input:unknown){
  const d=schema.parse(input),source=redirectPath(d.source),target=redirectPath(d.target),id=d.id||crypto.randomUUID();
  if(source===target)throw new MediaError('Nguồn và đích không được trùng nhau.',422);
  if(!d.id && d.expectedRevision!==0)throw new MediaError('Revision không hợp lệ.',409);
  const stmt=d.id?db.prepare('UPDATE CmsRedirect SET source=?,target=?,enabled=?,note=?,revision=revision+1 WHERE id=? AND revision=?').bind(source,target,d.enabled?1:0,d.note,id,d.expectedRevision):db.prepare('INSERT INTO CmsRedirect(id,source,target,enabled,note) VALUES(?,?,?,?,?)').bind(id,source,target,d.enabled?1:0,d.note);
  try{
    const [r]=await db.batch([stmt,...adminAuditStatements(db,'redirect.save',id,'Redirect updated',null,'order',{changed:true,before:d.expectedRevision,after:d.expectedRevision+1})]);
    if(!r.meta.changes)throw new MediaError('Redirect đã thay đổi. Tải lại trước khi lưu.',409);
  }catch(e){if(e instanceof Error && /REDIRECT_CHAIN|UNIQUE constraint/.test(e.message))throw new MediaError('Nguồn trùng, vòng lặp hoặc chuỗi redirect. Sửa redirect hiện có trước.',409);throw e;}
  return {id,source,target,enabled:d.enabled,note:d.note,revision:d.expectedRevision+1};
}
export async function publicRedirect(db:D1Database,path:string){
  let source:string;try{source=redirectPath(path);}catch{return null;}
  const row=await db.prepare('SELECT target FROM CmsRedirect WHERE source=? AND enabled=1').bind(source).first<{target:string}>();
  if(!row)return null;
  // Validate stored values too; direct DB edits must not turn this into an open redirect.
  return redirectPath(row.target);
}
