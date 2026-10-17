import { withAdminContext } from '@/server/admin-request-context';
import { mediaAdmin } from '@/server/media-http';
import { createSchedule, listSchedules, cancelSchedule } from '@/server/services/cms-schedule.service';
export const GET=withAdminContext(async(request:Request)=>{
  const q=new URL(request.url).searchParams;
  return mediaAdmin(request,false,env=>listSchedules(env,q.get('entityType')||'',q.get('entityId')||''));
});
export const POST=withAdminContext(async(request:Request)=>mediaAdmin(request,true,async env=>createSchedule(env,await request.json())));
export const DELETE=withAdminContext(async(request:Request)=>mediaAdmin(request,true,env=>cancelSchedule(env,new URL(request.url).searchParams.get('id')||'')));
