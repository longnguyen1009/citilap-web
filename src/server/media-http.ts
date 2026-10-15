import { ZodError } from 'zod';
import { requireAdmin, requireAdminMutation } from '../lib/auth';
import { MediaError, type MediaEnvironment } from './services/media-library.service';

export async function mediaEnvironment(): Promise<MediaEnvironment> {
  try {
    const { env } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ 'cloudflare:workers');
    if (env.DB && env.PRODUCT_MEDIA) return env as unknown as MediaEnvironment;
  } catch { /* Node dev has no Workers bindings; do not return mock data. */ }
  // Fallback to globalThis.env if explicitly set (e.g. test harness / custom worker wrapper)
  const globalEnv = (globalThis as unknown as { env?: MediaEnvironment }).env;
  if (globalEnv?.DB && globalEnv?.PRODUCT_MEDIA) return globalEnv;
  throw new MediaError('Thư viện cần D1/R2. Chạy môi trường Cloudflare và áp migration local.', 503);
}
export function mediaFailure(error: unknown) {
  const status = error instanceof MediaError ? error.status : error instanceof ZodError || error instanceof SyntaxError ? 400 : 503;
  const message = error instanceof MediaError ? error.message : status === 400 ? 'Dữ liệu không hợp lệ. Kiểm tra tên, độ dài và các trường bắt buộc.' : 'Không thể truy cập thư viện. Kiểm tra D1/R2 và migration, rồi thử lại.';
  return Response.json({ success: false, error: message }, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
export async function mediaAdmin(request: Request, mutation: boolean, action: (env: MediaEnvironment) => Promise<unknown>, resolveEnv = mediaEnvironment) {
  const denied = mutation ? requireAdminMutation(request) : requireAdmin(request);
  if (denied) return denied;
  try {
    const result = await action(await resolveEnv());
    return Response.json({ success: true, data: result }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return mediaFailure(error); }
}
