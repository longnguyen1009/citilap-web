import { NextResponse } from 'next/server';
import { checkRateLimit, rateLimitExceededResponse } from '@/lib/rate-limiter';
import { validateMutationOrigin } from '@/lib/auth';
import { loginAdmin, AdminIdentityError } from '@/server/services/admin-identity.service';
import { ZodError } from 'zod';

export async function POST(request: Request) {
  if (!validateMutationOrigin(request)) return NextResponse.json({success:false,error:'Forbidden'}, {status:403});
  const rate = await checkRateLimit('login', request, 5, 900);
  if (!rate.allowed) return rateLimitExceededResponse(rate.retryAfter);
  try {
    const { token, principal } = await loginAdmin(await request.json());
    const response = NextResponse.json({ success:true, role:'ADMIN', adminRole:principal.role,
      redirect:principal.role==='EDITOR'?'/admin/products':principal.role==='SALES'?'/admin/orders':'/admin/users' },
      {headers:{'Cache-Control':'private, no-store'}});
    response.cookies.set('admin_session', token, {httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:8*60*60});
    return response;
  } catch(error) {
    const status=error instanceof AdminIdentityError?error.status:error instanceof ZodError||error instanceof SyntaxError?400:503;
    return NextResponse.json({success:false,error:status===401?'Email hoặc mật khẩu không đúng':status===400?'Dữ liệu không hợp lệ':'Không thể đăng nhập. Kiểm tra kết nối và migration R08.'},
      {status,headers:{'Cache-Control':'private, no-store'}});
  }
}
