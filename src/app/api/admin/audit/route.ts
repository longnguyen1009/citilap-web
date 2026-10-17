import { withAdminContext } from '@/server/admin-request-context';
import { requireAdmin } from '@/lib/auth';
import { mediaEnvironment } from '@/server/media-http';
async function GETHandler(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const q = new URL(request.url).searchParams;
  const page = Number(q.get('page') || 1);
  const action = q.get('action') || '', actor = q.get('actor') || '', entity = q.get('entity') || '';
  const from=q.get('from') || '', to=q.get('to') || '';
  const validDate=(v:string)=>!v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1_000_000 || [action,actor,entity].some(v=>v.length>160) || !validDate(from) || !validDate(to) || (from && to && from>to)) {
    return Response.json({success:false,error:'Bộ lọc không hợp lệ'}, {status:400});
  }
  try {
    const db = (await mediaEnvironment()).DB;
    const where = `WHERE (?='' OR action=?) AND (?='' OR actorId=?) AND (?='' OR entityId=?)
      AND (?='' OR datetime(occurredAt)>=datetime(?)) AND (?='' OR datetime(occurredAt)<datetime(?,'+1 day'))`;
    const params = [action,action,actor,actor,entity,entity,from,from?`${from}T00:00:00+07:00`:'',to,to?`${to}T00:00:00+07:00`:''];
    const [rows,count] = await Promise.all([
      db.prepare(`SELECT * FROM AdminAudit ${where} ORDER BY occurredAt DESC,id DESC LIMIT 50 OFFSET ?`).bind(...params,(page-1)*50).all(),
      db.prepare(`SELECT COUNT(*) AS total FROM AdminAudit ${where}`).bind(...params).first(),
    ]);
    return Response.json({success:true,data:rows.results,total:count?.total,page}, {headers:{'Cache-Control':'private, no-store'}});
  } catch { return Response.json({success:false,error:'Không thể đọc nhật ký'}, {status:503}); }
}

export const GET = withAdminContext(GETHandler);
