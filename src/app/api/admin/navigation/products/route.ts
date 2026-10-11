import { navigationHttp } from '@/server/navigation-http';
import { navigationProducts } from '@/server/services/navigation.service';
export async function GET(request: Request) { const p=new URL(request.url).searchParams; return navigationHttp(request,false,env=>navigationProducts(env.DB,p.get('q')||'',Number(p.get('page')||1))); }
