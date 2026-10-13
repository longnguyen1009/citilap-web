import { NextResponse } from 'next/server';
import { mediaEnvironment } from '@/server/media-http';
import { publicBrandWithProducts } from '@/server/services/brand.service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const { DB } = await mediaEnvironment();
    const data = await publicBrandWithProducts(DB, slug);
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    return NextResponse.json(
      { success: false, error: error.message || 'Không tìm thấy thương hiệu' },
      { status: error.status || 500 }
    );
  }
}
