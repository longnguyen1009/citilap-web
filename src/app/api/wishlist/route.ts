import { resolveProductsByIds } from '@/server/services/catalog.service';
import { wishlistIds, MAX_WISHLIST_PRODUCTS } from '@/contracts/catalog/wishlist';

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('ids')?.split(',') || [];
  const ids = wishlistIds(raw);
  if (!raw.length || raw.length > MAX_WISHLIST_PRODUCTS || raw.some(id=>!ids.includes(id))) {
    return Response.json({error:'Danh sách sản phẩm không hợp lệ.'}, {status:400});
  }
  try {
    const products = await resolveProductsByIds(ids);
    return Response.json({products, unavailableIds:ids.filter(id=>!products.some(p=>p.id===id))}, {headers:{'Cache-Control':'no-store'}});
  } catch {
    return Response.json({error:'Không thể tải danh sách yêu thích. Vui lòng thử lại.'}, {status:503, headers:{'Cache-Control':'no-store'}});
  }
}
