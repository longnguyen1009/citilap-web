import { withAdminContext } from '@/server/admin-request-context';
import { navigationHttp } from '@/server/navigation-http';
import { publicCollectionList } from '@/server/services/navigation.service';

async function GETHandler() {
  return navigationHttp(null, false, (env) => publicCollectionList(env.DB));
}

export const GET = withAdminContext(GETHandler);
