import type { MetadataRoute } from 'next';
import { mediaEnvironment } from '@/server/media-http';
import { publicSitemapPaths } from '@/server/services/seo.service';

export const revalidate = 3600;

function resolveSitemapMeta(
  url: string
): Pick<MetadataRoute.Sitemap[number], 'changeFrequency' | 'priority'> {
  const path = url.replace(/^https?:\/\/[^/]+/, '') || '/';
  if (path === '/') {
    return { changeFrequency: 'daily', priority: 1.0 };
  }
  if (
    [
      '/hot-sale',
      '/chon-laptop',
      '/phan-loai',
      '/laptop-gaming',
      '/laptop-van-phong',
      '/laptop-workstation',
      '/macbook',
      '/phu-kien',
      '/laptop-moi',
      '/laptop-likenew',
    ].includes(path)
  ) {
    return { changeFrequency: 'daily', priority: 0.9 };
  }
  if (path.startsWith('/laptop/') || path.startsWith('/phu-kien/')) {
    return { changeFrequency: 'weekly', priority: 0.8 };
  }
  if (
    path.startsWith('/news') ||
    path.startsWith('/khach-hang-chia-se') ||
    path.startsWith('/brand/') ||
    path.startsWith('/collection') ||
    path.startsWith('/landing/')
  ) {
    return { changeFrequency: 'weekly', priority: 0.7 };
  }
  if (
    path.startsWith('/chinh-sach') ||
    ['/dieu-khoan-mua-hang', '/huong-dan-mua-hang', '/cau-hoi-thuong-gap'].includes(path)
  ) {
    return { changeFrequency: 'monthly', priority: 0.5 };
  }
  if (['/gioi-thieu', '/he-thong-cua-hang', '/lien-he'].includes(path)) {
    return { changeFrequency: 'monthly', priority: 0.7 };
  }
  return { changeFrequency: 'weekly', priority: 0.8 };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls = await publicSitemapPaths((await mediaEnvironment()).DB);
  return urls.map((url) => ({
    url,
    ...resolveSitemapMeta(url),
  }));
}
