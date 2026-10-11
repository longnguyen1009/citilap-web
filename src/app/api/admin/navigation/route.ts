import { navigationHttp } from '@/server/navigation-http';
import { navigationDetail, writeNavigation } from '@/server/services/navigation.service';
export async function GET(request: Request) { return navigationHttp(request,false,env=>navigationDetail(env.DB)); }
export async function PUT(request: Request) { return navigationHttp(request,true,async env=>writeNavigation(env,await request.json())); }
