import { navigationHttp } from '@/server/navigation-http';
import { getPublicLandingPage } from '@/server/services/site-builder.service';
import { MediaError } from '@/server/services/media-library.service';

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Context) {
  const { slug } = await context.params;
  return navigationHttp(null, false, async (env) => {
    const page = await getPublicLandingPage(env.DB, slug);
    if (!page) {
      throw new MediaError('Không tìm thấy landing page.', 404);
    }
    return page;
  });
}
