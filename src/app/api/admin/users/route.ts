import { withAdminContext } from '@/server/admin-request-context';
import { authenticatedAdmin, requireAdmin, requireAdminMutation } from '@/lib/auth';
import { mediaEnvironment } from '@/server/media-http';
import { AdminIdentityError, listAdminAccounts, saveAdminAccount } from '@/server/services/admin-identity.service';
import { ZodError } from 'zod';

async function GETHandler(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try { return Response.json({success:true,data:await listAdminAccounts((await mediaEnvironment()).DB)}, {headers:{'Cache-Control':'private, no-store'}}); }
  catch { return Response.json({success:false,error:'Không thể đọc tài khoản'}, {status:503}); }
}
async function POSTHandler(request: Request) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;
  try {
    return Response.json({success:true,data:await saveAdminAccount(authenticatedAdmin(request), await request.json(), (await mediaEnvironment()).DB)});
  } catch (error) {
    const status = error instanceof AdminIdentityError ? error.status : error instanceof ZodError || error instanceof SyntaxError ? 400 : 503;
    return Response.json({success:false,error:error instanceof AdminIdentityError ? error.code : status===400 ? 'Dữ liệu tài khoản không hợp lệ' : 'Không thể lưu tài khoản'}, {status});
  }
}

export const GET = withAdminContext(GETHandler);
export const POST = withAdminContext(POSTHandler);
