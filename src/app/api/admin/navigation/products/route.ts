import { withAdminContext } from '@/server/admin-request-context';
import { navigationHttp } from '@/server/navigation-http';
import { navigationProducts } from '@/server/services/navigation.service';
async function GETHandler(request: Request) { const p=new URL(request.url).searchParams; return navigationHttp(request,false,env=>navigationProducts(env.DB,p.get('q')||'',Number(p.get('page')||1))); }

export const GET = withAdminContext(GETHandler);
