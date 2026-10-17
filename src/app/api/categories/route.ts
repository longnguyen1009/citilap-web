import { withAdminContext } from '@/server/admin-request-context';
﻿import { navigationHttp, legacyCategoryMutation } from '@/server/navigation-http';
import { publicCategories } from '@/server/services/navigation.service';
async function GETHandler() { return navigationHttp(null,false,env=>publicCategories(env.DB)); }
async function POSTHandler(request: Request) { return legacyCategoryMutation(request); }

export const GET = withAdminContext(GETHandler);
export const POST = withAdminContext(POSTHandler);
