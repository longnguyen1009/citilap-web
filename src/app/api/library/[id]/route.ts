import { mediaEnvironment, mediaFailure } from '@/server/media-http';
import { serveLibraryImage } from '@/server/services/media-library.service';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return await serveLibraryImage(await mediaEnvironment(), (await params).id, request); }
  catch (error) { return mediaFailure(error); }
}
