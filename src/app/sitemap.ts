import type {MetadataRoute} from 'next';
import {mediaEnvironment} from '@/server/media-http';
import {publicSitemapPaths} from '@/server/services/seo.service';
export const dynamic='force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  return (await publicSitemapPaths((await mediaEnvironment()).DB)).map(url=>({url}));
}
