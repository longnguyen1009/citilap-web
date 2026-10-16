import { withAdminContext } from '@/server/admin-request-context';
import { z } from 'zod';
import { mediaAdmin } from '@/server/media-http';
import { attachProductImage } from '@/server/services/media-library.service';
const schema = z.strictObject({ productId: z.string().min(1).max(128) });
async function POSTHandler(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return mediaAdmin(request, true, async (env) => {
    const { productId } = schema.parse(await request.json());
    return attachProductImage(env, (await params).id, productId);
  });
}

export const POST = withAdminContext(POSTHandler);
