import { navigationHttp } from '@/server/navigation-http';
import { publicNavigation } from '@/server/services/navigation.service';
export async function GET() { return navigationHttp(null,false,env=>publicNavigation(env.DB)); }
