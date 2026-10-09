import { NextResponse } from 'next/server';
import { z } from 'zod';
import { searchProducts } from '@/server/services/search.service';

const SearchQuerySchema = z.object({
  q: z.string().max(100).optional(),
  brand: z.union([z.string(), z.array(z.string())]).optional(),
  category: z.union([z.string(), z.array(z.string())]).optional(),
  condition: z.union([z.string(), z.array(z.string())]).optional(),
  minPrice: z.coerce.number().min(0).max(1_000_000_000).optional(),
  maxPrice: z.coerce.number().min(0).max(1_000_000_000).optional(),
  cpu: z.union([z.string(), z.array(z.string())]).optional(),
  gpu: z.union([z.string(), z.array(z.string())]).optional(),
  ram: z.union([z.coerce.number(), z.array(z.coerce.number())]).optional(),
  storage: z.union([z.coerce.number(), z.array(z.coerce.number())]).optional(),
  sort: z.enum(['relevance', 'price-asc', 'price-desc', 'newest']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const q = searchParams.get('q') || undefined;
    const brands = searchParams.getAll('brand');
    const categories = searchParams.getAll('category');
    const conditions = searchParams.getAll('condition');
    const minPriceRaw = searchParams.get('minPrice');
    const maxPriceRaw = searchParams.get('maxPrice');
    const cpus = searchParams.getAll('cpu');
    const gpus = searchParams.getAll('gpu');
    const rams = searchParams.getAll('ram');
    const storages = searchParams.getAll('storage');
    const sort = searchParams.get('sort') || undefined;
    const pageRaw = searchParams.get('page') || undefined;
    const limitRaw = searchParams.get('limit') || undefined;

    const parsed = SearchQuerySchema.safeParse({
      q,
      brand: brands.length > 0 ? (brands.length === 1 ? brands[0] : brands) : undefined,
      category: categories.length > 0 ? (categories.length === 1 ? categories[0] : categories) : undefined,
      condition: conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : conditions) : undefined,
      minPrice: minPriceRaw ? Number(minPriceRaw) : undefined,
      maxPrice: maxPriceRaw ? Number(maxPriceRaw) : undefined,
      cpu: cpus.length > 0 ? (cpus.length === 1 ? cpus[0] : cpus) : undefined,
      gpu: gpus.length > 0 ? (gpus.length === 1 ? gpus[0] : gpus) : undefined,
      ram: rams.length > 0 ? (rams.length === 1 ? Number(rams[0]) : rams.map(Number)) : undefined,
      storage: storages.length > 0 ? (storages.length === 1 ? Number(storages[0]) : storages.map(Number)) : undefined,
      sort,
      page: pageRaw ? Number(pageRaw) : 1,
      limit: limitRaw ? Number(limitRaw) : 12,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tham số tìm kiếm không hợp lệ',
          details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        },
        { status: 400 }
      );
    }

    const { data: validParams } = parsed;

    const result = await searchProducts({
      query: validParams.q,
      brand: validParams.brand,
      category: validParams.category,
      condition: validParams.condition,
      minPrice: validParams.minPrice,
      maxPrice: validParams.maxPrice,
      cpu: validParams.cpu,
      gpu: validParams.gpu,
      ram: validParams.ram,
      storage: validParams.storage,
      sort: validParams.sort,
      page: validParams.page,
      limit: validParams.limit,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[SearchAPI] Error executing search query:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Có lỗi xảy ra khi xử lý tìm kiếm. Vui lòng thử lại sau.',
      },
      { status: 500 }
    );
  }
}
