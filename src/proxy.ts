import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from './lib/auth';
// ponytail: DB check per admin page ensures immediate revocation; move to per-page DAL guards if latency grows.
export async function proxy(request: NextRequest) {
  const denied=await requireAdmin(request);
  if(!denied)return NextResponse.next();
  if(denied.status!==401)return denied;
  return NextResponse.redirect(new URL('/login',request.url));
}
export const config={matcher:['/admin/:path*']};
