import { NextRequest, NextResponse } from 'next/server';
import { mediaEnvironment, mediaFailure } from '@/server/media-http';
import { publicPostBySlug } from '@/server/services/post.service';

export const runtime = 'edge';

type Context = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const { slug } = await context.params;
    const env = await mediaEnvironment();
    const post = await publicPostBySlug(env.DB, slug);
    return NextResponse.json({
      success: true,
      data: post,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    return mediaFailure(error);
  }
}
