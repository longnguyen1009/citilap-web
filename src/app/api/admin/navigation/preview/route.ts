import { withAdminContext } from '@/server/admin-request-context';
import { navigationHttp } from '@/server/navigation-http';
import { navigationDocumentSchema } from '@/contracts/cms/navigation';
import { resolveNavigation } from '@/server/services/navigation.service';
async function POSTHandler(request: Request) { return navigationHttp(request,true,async env=>resolveNavigation(env.DB,navigationDocumentSchema.parse(await request.json()),0)); }

export const POST = withAdminContext(POSTHandler);
