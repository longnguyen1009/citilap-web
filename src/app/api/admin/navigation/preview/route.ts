import { navigationHttp } from '@/server/navigation-http';
import { navigationDocumentSchema } from '@/contracts/cms/navigation';
import { resolveNavigation } from '@/server/services/navigation.service';
export async function POST(request: Request) { return navigationHttp(request,true,async env=>resolveNavigation(env.DB,navigationDocumentSchema.parse(await request.json()),0)); }
