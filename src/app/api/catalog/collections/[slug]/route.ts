import { navigationHttp } from '@/server/navigation-http';
import { publicCollection } from '@/server/services/navigation.service';
export async function GET(_request: Request, {params}: {params:Promise<{slug:string}>}) { const {slug}=await params; return navigationHttp(null,false,env=>publicCollection(env.DB,slug)); }
