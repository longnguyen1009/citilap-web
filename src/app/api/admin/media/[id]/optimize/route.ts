import { withAdminContext } from '@/server/admin-request-context';
import { mediaAdmin } from '@/server/media-http';
import { imageOptimization } from '@/server/services/media-library.service';

type Context = { params: Promise<{ id: string }> };
export const GET = withAdminContext(async (request: Request, context: Context) =>
  mediaAdmin(request, false, async env => imageOptimization(env, (await context.params).id)));
export const POST = withAdminContext(async (request: Request, context: Context) =>
  mediaAdmin(request, true, async env => imageOptimization(env, (await context.params).id, true)));
