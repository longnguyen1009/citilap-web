import { withAdminContext } from '@/server/admin-request-context';
import { navigationHttp } from '@/server/navigation-http';
import { publicCollection } from '@/server/services/navigation.service';
async function GETHandler(_request: Request, {params}: {params:Promise<{slug:string}>}) { const {slug}=await params; return navigationHttp(null,false,env=>publicCollection(env.DB,slug)); }

export const GET = withAdminContext(GETHandler);
