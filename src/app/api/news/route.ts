import { NextRequest, NextResponse } from 'next/server';
import { mediaEnvironment, mediaFailure } from '@/server/media-http';
import { publicPostList, publicFeaturedPosts } from '@/server/services/post.service';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const env = await mediaEnvironment();
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId') || undefined;
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 12;

    const [list, featured] = await Promise.all([
      publicPostList(env.DB, { categoryId, page, limit }),
      publicFeaturedPosts(env.DB, 4),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...list,
        featured,
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    return mediaFailure(error);
  }
}
