import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from './lib/auth';
import { mediaEnvironment } from './server/media-http';
import { publicRedirect } from './server/services/redirect.service';
import { publicNavigation } from './server/services/navigation.service';
import { RESERVED_CATEGORY_ROOTS, canonicalCategoryPath } from './lib/category-paths';
import { productHref } from './lib/product-paths';
// ponytail: DB check per admin page ensures immediate revocation; move to per-page DAL guards if latency grows.
export async function proxy(request: NextRequest) {
  const response = await routeRequest(request);
  if (process.env.APP_ENV === 'staging') response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}
async function routeRequest(request: NextRequest) {
  if(!/^\/admin(?:\/|$)/.test(request.nextUrl.pathname)){
    if(!['GET','HEAD'].includes(request.method) || /^\/(api|_next|auth|login|logout|preview|checkout|cart|order-tracking)(\/|$)/.test(request.nextUrl.pathname) || /\.[^/]+$/.test(request.nextUrl.pathname))return NextResponse.next();
    try{
      const { DB } = await mediaEnvironment();
      const path = request.nextUrl.pathname;
      let target=await publicRedirect(DB,path);
      const root = path.split('/')[1];
      const categoryCandidate = ['category','phan-loai','phu-kien'].includes(root) || !RESERVED_CATEGORY_ROOTS.has(root);
      const navigation = target || categoryCandidate ? await publicNavigation(DB).catch(error => { if (error.status === 404) return null; throw error; }) : null;
      if (navigation) {
        const canonical = canonicalCategoryPath(path, navigation.categories);
        // A live canonical category wins over old stored aliases pointing back to root URLs.
        if (canonical) target = canonical === path.replace(/\/$/,'') ? null : canonical;
        else if (target) target = canonicalCategoryPath(target, navigation.categories) || target;
      }
      if (path.replace(/\/$/,'') === '/category') target = '/phan-loai';
      if (!target && /^\/(product|san-pham)\/[^/]+\/?$/.test(path)) {
        const key = decodeURIComponent(path.split('/')[2]);
        const row = await DB.prepare("SELECT COALESCE(json_extract(s.published,'$.slug'),p.slug) slug,json_extract(s.published,'$.template') template,CASE WHEN p.categoryId='cat-phu-kien' THEN 'ACCESSORY' ELSE 'LAPTOP' END kind FROM Product p LEFT JOIN ProductStudio s ON s.productId=p.id WHERE p.deletedAt IS NULL AND (p.id=? OR p.slug=? OR json_extract(s.published,'$.slug')=?) AND p.status IN ('ACTIVE','active') AND (s.productId IS NULL OR s.published IS NOT NULL)").bind(key,key,key).first<{slug:string;template?:string;kind:string}>();
        if (row) target = productHref(row);
      }
      if(target) {
        const url = new URL(target,request.url);
        url.search = request.nextUrl.search;
        return NextResponse.redirect(url,301);
      }
      if (navigation && path.split('/').filter(Boolean).length > 1 &&
        (root === 'phan-loai' || (root !== 'phu-kien' && !RESERVED_CATEGORY_ROOTS.has(root) && navigation.categories.some(c => !c.parentId && c.slug === root))) &&
        !navigation.categories.some(c => c.href === path.replace(/\/$/,''))) {
        return new Response('<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex"><title>Không tìm thấy phân loại | CitiLap</title><body style="font:16px/1.7 system-ui;color:#334155;padding:8vh 24px;max-width:720px;margin:auto"><h1>Không tìm thấy phân loại</h1><p>Đường dẫn phân loại không tồn tại hoặc đã thay đổi.</p><a href="/phan-loai" style="color:#1d4ed8">Xem các phân loại sản phẩm</a></body></html>',{status:404,headers:{'Content-Type':'text/html; charset=utf-8'}});
      }
      return NextResponse.next();
    }catch{return Response.json({success:false,error:'Redirect service unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
  }
  const denied=await requireAdmin(request);
  if(!denied)return NextResponse.next();
  if(denied.status!==401)return denied;
  return NextResponse.redirect(new URL('/login',request.url));
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
