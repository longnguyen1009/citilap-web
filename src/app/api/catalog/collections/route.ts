import { navigationHttp } from '@/server/navigation-http';
import { publicCollectionList } from '@/server/services/navigation.service';

export async function GET() {
  return navigationHttp(null, false, (env) => publicCollectionList(env.DB));
}
