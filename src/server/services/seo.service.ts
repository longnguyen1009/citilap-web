import type {D1Database} from '@cloudflare/workers-types';
import {getAdminSettings} from './settings.service';
import {businessProfile} from '../../config/business-profile';
export async function seoDefaults(db:D1Database){
  const {document}=await getAdminSettings(db);
  return {title:document.defaultSeoTitle,description:document.defaultSeoDescription};
}
/** Public projections only. Redirected sources never enter sitemap. */
export async function publicSitemapPaths(db:D1Database){
  const queries=`
    SELECT '/product/' || CASE WHEN s.productId IS NULL THEN p.slug ELSE json_extract(s.published,'$.slug') END AS path
      FROM Product p LEFT JOIN ProductStudio s ON s.productId=p.id
      WHERE p.deletedAt IS NULL AND p.status IN ('ACTIVE','active') AND (s.productId IS NULL OR s.published IS NOT NULL)
    UNION SELECT '/news/' || json_extract(s.published,'$.slug') FROM Post p JOIN PostStudio s ON s.postId=p.id WHERE p.deletedAt IS NULL AND s.published IS NOT NULL
    UNION SELECT '/' || json_extract(s.published,'$.slug') FROM Page p JOIN PageStudio s ON s.pageId=p.id WHERE p.deletedAt IS NULL AND s.published IS NOT NULL
    UNION SELECT '/landing/' || json_extract(s.published,'$.slug') FROM LandingPage p JOIN LandingPageStudio s ON s.pageId=p.id WHERE p.deletedAt IS NULL AND p.isHome=0 AND s.published IS NOT NULL
    UNION SELECT '/brand/' || slug FROM Brand WHERE deletedAt IS NULL AND status='ACTIVE'
    UNION SELECT '/category/' || json_extract(c.value,'$.slug') FROM NavigationStudio n,json_each(n.published,'$.categories') c WHERE n.id='site' AND json_extract(c.value,'$.visible')=1
    UNION SELECT '/collection/' || json_extract(c.value,'$.slug') FROM NavigationStudio n,json_each(n.published,'$.collections') c WHERE n.id='site' AND json_extract(c.value,'$.visible')=1
  `.split(/\s+UNION SELECT /).map((sql,i)=>i?'SELECT '+sql.replace(' FROM ', ' AS path FROM '):sql);
  const rows=(await Promise.all(queries.map(sql=>db.prepare(sql).all<{path:string}>()))).flatMap(r=>r.results);
  const redirects=new Set((await db.prepare('SELECT source FROM CmsRedirect WHERE enabled=1').all<{source:string}>()).results.map(r=>r.source));
  return [...new Set(['/', '/hot-sale','/category','/news','/collection','/lien-he',...rows.map(r=>r.path)])]
    .filter(path=>/^\/[a-zA-Z0-9/_-]*$/.test(path) && !path.includes('//') && !redirects.has(path))
    .map(path=>businessProfile.canonicalSiteUrl+(path==='/'?'':path));
}
