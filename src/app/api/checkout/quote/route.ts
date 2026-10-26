import { calculateCheckout, CheckoutError } from '@/server/services/checkout.service';
import { mediaEnvironment } from '@/server/media-http';
import { checkRateLimit, rateLimitExceededResponse } from '@/lib/rate-limiter';

export async function POST(request: Request) {
  const limit = await checkRateLimit('checkout-quote', request, 60, 60);
  if (!limit.allowed) return rateLimitExceededResponse(limit.retryAfter);
  const headers = { 'Cache-Control': 'private, no-store' };
  let input: unknown;
  try { input = await request.json(); }
  catch { return Response.json({success:false,error:{code:'INVALID_CHECKOUT',message:'Dữ liệu không hợp lệ.'}}, {status:400,headers}); }
  try {
    const { DB } = await mediaEnvironment();
    const { quote } = await calculateCheckout(input, DB);
    return Response.json({success:true,data:quote}, {headers});
  } catch (error) {
    if (error instanceof CheckoutError) return Response.json({success:false,error:{code:error.code,message:error.message}}, {status:error.status,headers});
    const unavailable = error instanceof Error && /^(PRODUCT_UNAVAILABLE|VARIANT_UNAVAILABLE|WARRANTY_UNAVAILABLE|PRODUCT_NOT_AVAILABLE|PRODUCT_NOT_FOUND|VARIANT_NOT_FOUND)$/.test(error.message);
    return Response.json({success:false,error:{code:unavailable?'PRODUCT_UNAVAILABLE':'CHECKOUT_UNAVAILABLE',message:unavailable?'Sản phẩm không còn khả dụng.':'Chưa thể xác thực giá và phí giao hàng. Vui lòng thử lại.'}}, {status:unavailable?409:503,headers});
  }
}
