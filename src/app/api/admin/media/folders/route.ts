import { withAdminContext } from '@/server/admin-request-context';
import { mediaAdmin } from '@/server/media-http';
import {
  bulkMoveMediaAssets,
  createMediaFolder,
  deleteMediaFolder,
  listMediaFolders,
  MediaError,
} from '@/server/services/media-library.service';

async function GETHandler(request: Request) {
  return mediaAdmin(request, false, (env) => {
    const state = new URL(request.url).searchParams.get('state') === 'ARCHIVED' ? 'ARCHIVED' : 'READY';
    return listMediaFolders(env.DB, state);
  });
}

async function POSTHandler(request: Request) {
  return mediaAdmin(request, true, async (env) => createMediaFolder(env.DB, await request.json()));
}

async function PATCHHandler(request: Request) {
  return mediaAdmin(request, true, async (env) => bulkMoveMediaAssets(env.DB, await request.json()));
}

async function DELETEHandler(request: Request) {
  return mediaAdmin(request, true, async (env) => {
    const slug = new URL(request.url).searchParams.get('slug') || '';
    if (!slug.trim()) throw new MediaError('Thiếu mã thư mục cần xóa.');
    return deleteMediaFolder(env.DB, slug);
  });
}

export const GET = withAdminContext(GETHandler);
export const POST = withAdminContext(POSTHandler);
export const PATCH = withAdminContext(PATCHHandler);
export const DELETE = withAdminContext(DELETEHandler);

