import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from './lib/auth';
import { mediaEnvironment } from './server/media-http';
import { publicRedirect } from './server/services/redirect.service';
// ponytail: DB check per admin page ensures immediate revocation; move to per-page DAL guards if latency grows.
export async function proxy(request: NextRequest) {
  if(!/^\/admin(?:\/|$)/.test(request.nextUrl.pathname)){
    if(!['GET','HEAD'].includes(request.method) || /^\/(api|_next|auth|login|logout|preview|checkout|cart|order-tracking)(\/|$)/.test(request.nextUrl.pathname) || /\.[^/]+$/.test(request.nextUrl.pathname))return NextResponse.next();
    try{
      const target=await publicRedirect((await mediaEnvironment()).DB,request.nextUrl.pathname);
      if(target)return NextResponse.redirect(new URL(target,request.url),301);
      return NextResponse.next();
    }catch{return Response.json({success:false,error:'Redirect service unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
  }
  const denied=await requireAdmin(request);
  if(!denied)return NextResponse.next();
  if(denied.status!==401)return denied;
  return NextResponse.redirect(new URL('/login',request.url));
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
