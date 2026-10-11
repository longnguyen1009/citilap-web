import { navigationHttp, legacyCategoryMutation } from '@/server/navigation-http';
import { publicCategories } from '@/server/services/navigation.service';
export async function GET() { return navigationHttp(null,false,env=>publicCategories(env.DB)); }
export async function POST(request: Request) { return legacyCategoryMutation(request); }
