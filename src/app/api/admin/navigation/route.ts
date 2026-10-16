import { withAdminContext } from '@/server/admin-request-context';
import { navigationHttp } from '@/server/navigation-http';
import { navigationDetail, writeNavigation } from '@/server/services/navigation.service';
async function GETHandler(request: Request) { return navigationHttp(request,false,env=>navigationDetail(env.DB)); }
async function PUTHandler(request: Request) { return navigationHttp(request,true,async env=>writeNavigation(env,await request.json())); }

export const GET = withAdminContext(GETHandler);
export const PUT = withAdminContext(PUTHandler);
