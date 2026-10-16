import { NextResponse } from "next/server";
import { logoutAdmin } from '@/server/services/admin-identity.service';
import { validateMutationOrigin } from '@/lib/auth';

export async function POST(request: Request) {
  if (!validateMutationOrigin(request)) return NextResponse.json({success:false,error:'Forbidden'}, {status:403});
  try { await logoutAdmin(request); }
  catch { return NextResponse.json({success:false,error:'Không thể thu hồi phiên. Vui lòng thử lại.'}, {status:503}); }
  const response = NextResponse.json({ success: true });
  response.cookies.set("admin_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
