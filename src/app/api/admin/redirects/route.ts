import {withAdminContext} from '@/server/admin-request-context';
import {mediaAdmin} from '@/server/media-http';
import {saveRedirect} from '@/server/services/redirect.service';
export const GET=withAdminContext(async(request:Request)=>mediaAdmin(request,false,async env=>(await env.DB.prepare('SELECT * FROM CmsRedirect ORDER BY source LIMIT 500').all()).results));
export const POST=withAdminContext(async(request:Request)=>mediaAdmin(request,true,async env=>saveRedirect(env.DB,await request.json())));
