import { youtubeId, tiktokVideoId } from '@/contracts/cms/media';
import { DEFAULT_REVIEW_VIDEOS, type ReviewVideoItem } from '@/contracts/cms/settings';

export function cleanVideoTitle(title?: string): string {
  if (!title) return '';
  return title
    .replace(/\s*\|\s*CellphoneS/gi, '')
    .replace(/\s*\|\s*ThinkView/gi, '')
    .replace(/\s*-\s*CellphoneS/gi, '')
    .replace(/\s*-\s*ThinkView/gi, '')
    .trim();
}

/**
 * Resolve a single YouTube or TikTok URL into a ReviewVideoItem with title and thumbnail
 */
export async function resolveSingleVideo(rawUrl: string): Promise<ReviewVideoItem | null> {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // 1. YouTube
  const ytId = youtubeId(trimmed);
  if (ytId) {
    const canonicalUrl = `https://www.youtube.com/watch?v=${ytId}`;
    const thumbnail = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (oembedRes.ok) {
        const data = (await oembedRes.json()) as { title?: string; author_name?: string };
        return {
          title: cleanVideoTitle(data.title) || `Video review YouTube (${ytId})`,
          url: canonicalUrl,
          thumbnail,
          platform: 'youtube',
        };
      }
    } catch {
      // Fallback if oEmbed is unreachable
    }
    return {
      title: `Video review YouTube (${ytId})`,
      url: canonicalUrl,
      thumbnail,
      platform: 'youtube',
    };
  }

  // 2. TikTok
  const tkId = tiktokVideoId(trimmed);
  if (tkId || trimmed.includes('tiktok.com')) {
    try {
      const oembedRes = await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(trimmed)}`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (oembedRes.ok) {
        const data = (await oembedRes.json()) as { title?: string; thumbnail_url?: string; author_name?: string };
        return {
          title: cleanVideoTitle(data.title) || `Video TikTok CitiLap (${tkId || 'review'})`,
          url: trimmed,
          thumbnail: data.thumbnail_url || '/brand/store-photo-01.webp',
          platform: 'tiktok',
        };
      }
    } catch {
      // Fallback if TikTok oEmbed is unreachable
    }
    return {
      title: `Video TikTok CitiLap (${tkId || 'review'})`,
      url: trimmed,
      thumbnail: '/brand/store-photo-01.webp',
      platform: 'tiktok',
    };
  }

  return null;
}

/**
 * Fetch latest videos from a YouTube channel by handle or URL
 */
export async function fetchLatestYoutubeVideos(channelUrl: string, limit = 8): Promise<ReviewVideoItem[]> {
  try {
    let targetUrl = channelUrl.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = targetUrl.startsWith('@')
        ? `https://www.youtube.com/${targetUrl}`
        : `https://www.youtube.com/@${targetUrl}`;
    }

    if (!targetUrl.endsWith('/videos')) {
      targetUrl = `${targetUrl.replace(/\/+$/, '')}/videos`;
    }

    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return DEFAULT_REVIEW_VIDEOS.filter((v) => v.platform === 'youtube');
    }

    const html = await res.text();
    const ids = [...new Set([...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map((m) => m[1]))].slice(
      0,
      limit
    );

    if (ids.length === 0) {
      return DEFAULT_REVIEW_VIDEOS.filter((v) => v.platform === 'youtube');
    }

    const results = await Promise.allSettled(
      ids.map((id) => resolveSingleVideo(`https://www.youtube.com/watch?v=${id}`))
    );

    const resolved: ReviewVideoItem[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        resolved.push(r.value);
      }
    }

    return resolved.length > 0 ? resolved : DEFAULT_REVIEW_VIDEOS.filter((v) => v.platform === 'youtube');
  } catch {
    return DEFAULT_REVIEW_VIDEOS.filter((v) => v.platform === 'youtube');
  }
}

/**
 * Resolve a batch of YouTube and TikTok video URLs (e.g. from pasted lines)
 */
export async function resolveBatchVideos(rawUrls: string[]): Promise<ReviewVideoItem[]> {
  const cleanUrls = rawUrls
    .map((u) => u.trim())
    .filter((u) => u.length > 0);

  if (cleanUrls.length === 0) return [];

  const results = await Promise.allSettled(cleanUrls.map((url) => resolveSingleVideo(url)));
  const resolved: ReviewVideoItem[] = [];

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      resolved.push(r.value);
    }
  }

  return resolved;
}

