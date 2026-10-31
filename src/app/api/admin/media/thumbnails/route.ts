import { withAdminContext } from '@/server/admin-request-context';
import { mediaAdmin } from '@/server/media-http';
import { backfillThumbnails } from '@/server/services/media-library.service';

// Bounded batch per request; the admin UI loops with `nextCursor` until it is null.
export const POST = withAdminContext(async (request: Request) =>
  mediaAdmin(request, true, async env => {
    const body = await request.json().catch(() => ({})) as { cursor?: unknown; limit?: unknown };
    return backfillThumbnails(env, {
      cursor: typeof body.cursor === 'string' ? body.cursor.slice(0, 200) : null,
      limit: typeof body.limit === 'number' ? body.limit : undefined,
    });
  }));

