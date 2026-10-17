import { withAdminContext } from '@/server/admin-request-context';
import { mediaAdmin } from '@/server/media-http';
import { addVideo, listMedia, MediaError, uploadLibraryImage } from '@/server/services/media-library.service';

async function GETHandler(request: Request) {
  return mediaAdmin(request, false, (env) => listMedia(env.DB, Object.fromEntries(new URL(request.url).searchParams)));
}
async function POSTHandler(request: Request) {
  return mediaAdmin(request, true, async (env) => {
    if (Number(request.headers.get('content-length')) > 6 * 1024 * 1024) throw new MediaError('Ảnh vượt quá 5 MB.', 413);
    if (request.headers.get('content-type')?.includes('application/json')) return addVideo(env.DB, await request.json());
    const form = await request.formData();
    const files = form.getAll('file');
    if (files.length !== 1 || !(files[0] instanceof File)) throw new MediaError('Chọn một ảnh cho mỗi lần tải.');
    return uploadLibraryImage(env, files[0]);
  });
}

export const GET = withAdminContext(GETHandler);
export const POST = withAdminContext(POSTHandler);
