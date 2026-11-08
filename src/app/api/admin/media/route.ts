import { withAdminContext } from '@/server/admin-request-context';
import { mediaAdmin } from '@/server/media-http';
import { addVideo, listMedia, MediaError, uploadLibraryImage } from '@/server/services/media-library.service';

async function GETHandler(request: Request) {
  return mediaAdmin(request, false, (env) => listMedia(env.DB, Object.fromEntries(new URL(request.url).searchParams)));
}
async function POSTHandler(request: Request) {
  return mediaAdmin(request, true, async (env) => {
    if (Number(request.headers.get('content-length')) > 55 * 1024 * 1024) throw new MediaError('Tệp vượt quá dung lượng cho phép (tối đa 50 MB).', 413);
    if (request.headers.get('content-type')?.includes('application/json')) return addVideo(env.DB, await request.json());
    const form = await request.formData();
    const files = form.getAll('file');
    if (files.length !== 1 || !(files[0] instanceof File)) throw new MediaError('Chọn một tệp cho mỗi lần tải.');
    const folderRaw = form.get('folder');
    const folder = typeof folderRaw === 'string' && folderRaw.trim() ? folderRaw.trim() : undefined;
    const originalNameRaw = form.get('originalName');
    const originalName = typeof originalNameRaw === 'string' && originalNameRaw.trim() ? originalNameRaw.trim() : undefined;
    const thumbRaw = form.get('thumbnail');
    const clientThumb = thumbRaw instanceof File ? thumbRaw : null;
    return uploadLibraryImage(env, files[0], { folder, clientThumb, originalName });
  });
}

export const GET = withAdminContext(GETHandler);
export const POST = withAdminContext(POSTHandler);
