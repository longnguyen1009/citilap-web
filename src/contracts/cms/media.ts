import { z } from 'zod';

export const MEDIA_FILTER_KINDS = [
  'ALL',
  'IMAGE',
  'SVG',
  'VIDEO',
  'YOUTUBE',
  'TIKTOK',
  'GDRIVE',
  'PDF',
] as const;

export type MediaFilterKind = (typeof MEDIA_FILTER_KINDS)[number];

export const mediaQuerySchema = z.object({
  q: z.string().trim().max(100).default(''),
  kind: z.enum(MEDIA_FILTER_KINDS).default('ALL'),
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

export const externalMediaKindEnum = z.enum([
  'AUTO',
  'YOUTUBE',
  'TIKTOK',
  'GDRIVE_IMAGE',
  'GDRIVE_VIDEO',
  'GDRIVE_PDF',
  'PDF_URL',
  'SVG_URL',
]);

export type ExternalMediaKind = z.infer<typeof externalMediaKindEnum>;

export const videoSchema = z.object({
  name: z.string().trim().min(1).max(180),
  url: z.string().trim().max(1000),
  mediaKind: externalMediaKindEnum.optional().default('AUTO'),
});

export function youtubeId(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    const id =
      host === 'youtu.be'
        ? url.pathname.slice(1)
        : ['www.youtube.com', 'youtube.com', 'm.youtube.com'].includes(host)
          ? url.pathname === '/watch'
            ? url.searchParams.get('v')
            : /^\/(shorts|embed)\/([^/]+)$/.exec(url.pathname)?.[2]
          : null;
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function tiktokVideoId(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    if (!['www.tiktok.com', 'tiktok.com', 'm.tiktok.com'].includes(host)) return null;
    const match = /^\/@[^/]+\/video\/(\d+)\/?$/.exec(url.pathname) || /^\/v\/(\d+)(?:\.html)?\/?$/.exec(url.pathname);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

export function googleDriveFileId(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    if (!['drive.google.com', 'docs.google.com'].includes(host)) return null;
    const fileMatch = /^\/file\/d\/([a-zA-Z0-9_-]{10,})(?:\/|$)/.exec(url.pathname);
    if (fileMatch?.[1]) return fileMatch[1];
    if (url.pathname === '/open' || url.pathname === '/uc') {
      const idParam = url.searchParams.get('id');
      if (idParam && /^[a-zA-Z0-9_-]{10,}$/.test(idParam)) return idParam;
    }
    return null;
  } catch {
    return null;
  }
}

export type MediaAssetType =
  | 'IMAGE'
  | 'SVG'
  | 'VIDEO_FILE'
  | 'YOUTUBE'
  | 'TIKTOK'
  | 'GDRIVE'
  | 'PDF';

export interface MediaAssetDto {
  id: string;
  kind: 'IMAGE' | 'VIDEO';
  provider: 'R2' | 'YOUTUBE' | 'LEGACY';
  assetType?: MediaAssetType;
  name: string;
  alt: string;
  caption: string;
  mimeType: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  revision: number;
  state: 'READY' | 'ARCHIVED';
  createdAt: string;
  url: string | null;
  embedUrl?: string | null;
  thumbnailUrl?: string | null;
  usageCount: number;
}

export interface MediaUsageDto {
  ownerType: string;
  ownerId: string;
  slot: string;
}

export interface MediaListDto {
  items: MediaAssetDto[];
  total: number;
  page: number;
  pageSize: number;
}
