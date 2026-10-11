import { ZodError } from 'zod';
import { requireAdmin, requireAdminMutation } from '../lib/auth';
import { mediaEnvironment } from './media-http';
import { MediaError, type MediaEnvironment } from './services/media-library.service';
export async function navigationHttp(request: Request | null, mutation: boolean, action: (env: MediaEnvironment) => Promise<unknown>) {
  if (request) { const denied = mutation ? requireAdminMutation(request) : requireAdmin(request); if (denied) return denied; }
  try { return Response.json({success:true,data:await action(await mediaEnvironment())},{headers:{'Cache-Control':'no-store'}}); }
  catch (e) {
    const status = e instanceof MediaError ? e.status : e instanceof ZodError || e instanceof SyntaxError ? 400 : 503;
    const error = e instanceof MediaError ? e.message : e instanceof ZodError ? e.issues[0]?.message : status===400 ? 'Dữ liệu không hợp lệ.' : 'Không thể đọc dữ liệu điều hướng. Kiểm tra D1/R2 và migration.';
    return Response.json({success:false,error},{status,headers:{'Cache-Control':'no-store'}});
  }
}
export function legacyCategoryMutation(request: Request) {
  return requireAdminMutation(request) || Response.json({success:false,error:'Quản lý danh mục tại /admin/categories và xuất bản từ trình biên tập mới.'},{status:409,headers:{'Cache-Control':'no-store'}});
}
