import { withAdminContext } from '@/server/admin-request-context';
import { navigationHttp } from '@/server/navigation-http';
import { publicNavigation } from '@/server/services/navigation.service';
async function GETHandler() { return navigationHttp(null,false,env=>publicNavigation(env.DB)); }

export const GET = withAdminContext(GETHandler);
