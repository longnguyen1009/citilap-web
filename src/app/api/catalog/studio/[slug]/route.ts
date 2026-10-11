import { mediaEnvironment, mediaFailure } from '@/server/media-http';
import { publicStudio } from '@/server/services/product-studio.service';
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  try { const { slug } = await context.params; return Response.json({ success: true, data: await publicStudio((await mediaEnvironment()).DB, slug) }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return mediaFailure(error); }
}
