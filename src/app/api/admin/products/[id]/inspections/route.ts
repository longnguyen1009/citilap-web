import { withAdminContext } from '@/server/admin-request-context';
import { mediaAdmin } from '@/server/media-http';
import { writeInspection } from '@/server/services/inspection.service';

type Context = { params: Promise<{ id: string }> };
export const GET = withAdminContext(async (request: Request, context: Context) => {
  const { id } = await context.params;
  return mediaAdmin(request, false, async ({ DB }) => (await DB.prepare(`SELECT u.id AS serialUnitId,u.serialNumber,u.status,i.publicCode,i.checkedAt,i.batteryHealth,i.appearance,i.checks,i.limitations,i.warranty,i.published,i.isDemo,i.updatedAt
    FROM SerialUnit u LEFT JOIN ProductInspection i ON i.serialUnitId=u.id WHERE u.productId=? ORDER BY u.id LIMIT 100`).bind(id).all()).results);
});
export const PUT = withAdminContext(async (request: Request, context: Context) => {
  const { id } = await context.params;
  return mediaAdmin(request, true, async ({ DB }) => writeInspection(DB, id, await request.json()));
});
