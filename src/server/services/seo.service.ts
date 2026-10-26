import type {D1Database} from '@cloudflare/workers-types';
import {getAdminSettings} from './settings.service';
import {businessProfile} from '../../config/business-profile';
import {publicNavigation} from './navigation.service';
export async function seoDefaults(db:D1Database){
  const {document}=await getAdminSettings(db);
  return {title:document.defaultSeoTitle,description:document.defaultSeoDescription};
}
/** Public projections only. Redirected sources never enter sitemap. */
export async function publicSitemapPaths(db:D1Database){
  const queries=`
    SELECT CASE WHEN COALESCE(json_extract(s.published,'$.template'),CASE WHEN p.categoryId='cat-phu-kien' THEN 'ACCESSORY' ELSE 'LAPTOP' END)='LAPTOP' THEN '/laptop/' ELSE '/phu-kien/' END || CASE WHEN s.productId IS NULL THEN p.slug ELSE json_extract(s.published,'$.slug') END AS path
      FROM Product p LEFT JOIN ProductStudio s ON s.productId=p.id
      WHERE p.deletedAt IS NULL AND p.status IN ('ACTIVE','active') AND (s.productId IS NULL OR s.published IS NOT NULL)
    UNION SELECT '/news/' || json_extract(s.published,'$.slug') FROM Post p JOIN PostStudio s ON s.postId=p.id WHERE p.deletedAt IS NULL AND s.published IS NOT NULL
    UNION SELECT '/' || json_extract(s.published,'$.slug') FROM Page p JOIN PageStudio s ON s.pageId=p.id WHERE p.deletedAt IS NULL AND s.published IS NOT NULL
    UNION SELECT '/landing/' || json_extract(s.published,'$.slug') FROM LandingPage p JOIN LandingPageStudio s ON s.pageId=p.id WHERE p.deletedAt IS NULL AND p.isHome=0 AND s.published IS NOT NULL
    UNION SELECT '/brand/' || slug FROM Brand WHERE deletedAt IS NULL AND status='ACTIVE'
    UNION SELECT '/collection/' || json_extract(c.value,'$.slug') FROM NavigationStudio n,json_each(n.published,'$.collections') c WHERE n.id='site' AND json_extract(c.value,'$.visible')=1
  `.split(/\s+UNION SELECT /).map((sql,i)=>i?'SELECT '+sql.replace(' FROM ', ' AS path FROM '):sql);
  const rows=(await Promise.all(queries.map(sql=>db.prepare(sql).all<{path:string}>()))).flatMap(r=>r.results);
  const navigation = await publicNavigation(db).catch(error => { if (error.status === 404) return null; throw error; });
  const redirects=new Set((await db.prepare('SELECT source FROM CmsRedirect WHERE enabled=1').all<{source:string}>()).results.map(r=>r.source));
  const liveCategories = new Set(['/phan-loai', ...navigation?.categories.map(c => c.href) || []]);
  return [...new Set(['/', '/hot-sale','/phan-loai','/news','/collection','/lien-he',...rows.map(r=>r.path),...navigation?.categories.map(c=>c.href)||[]])]
    .filter(path=>/^\/[a-zA-Z0-9/_-]*$/.test(path) && !path.includes('//') && (!redirects.has(path) || liveCategories.has(path)))
    .map(path=>businessProfile.canonicalSiteUrl+(path==='/'?'':path));
}
