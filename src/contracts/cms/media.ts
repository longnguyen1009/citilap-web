import { z } from 'zod';

export const mediaQuerySchema = z.object({
  q: z.string().trim().max(100).default(''),
  kind: z.enum(['ALL', 'IMAGE', 'VIDEO']).default('ALL'),
  state: z.enum(['READY', 'ARCHIVED']).default('READY'),
  page: z.coerce.number().int().min(1).max(100000).default(1),
});
export const mediaEditSchema = z.strictObject({
  revision: z.number().int().positive(),
  name: z.string().trim().min(1).max(180),
  alt: z.string().trim().max(300),
  caption: z.string().trim().max(1000),
  state: z.enum(['READY', 'ARCHIVED']),
});
export const videoSchema = z.strictObject({ name: z.string().trim().min(1).max(180), url: z.string().max(512) });
export function youtubeId(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    const id = host === 'youtu.be' ? url.pathname.slice(1) :
      ['www.youtube.com', 'youtube.com', 'm.youtube.com'].includes(host)
        ? url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(shorts|embed)\/([^/]+)$/.exec(url.pathname)?.[2] : null;
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}
export interface MediaAssetDto {
  id: string; kind: 'IMAGE' | 'VIDEO'; provider: 'R2' | 'YOUTUBE' | 'LEGACY';
  name: string; alt: string; caption: string; mimeType: string | null;
  size: number | null; width: number | null; height: number | null;
  revision: number; state: 'READY' | 'ARCHIVED'; createdAt: string;
  url: string | null; usageCount: number;
}
export interface MediaUsageDto { ownerType: string; ownerId: string; slot: string }
export interface MediaListDto { items: MediaAssetDto[]; total: number; page: number; pageSize: number }
