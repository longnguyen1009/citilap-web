import { revalidatePath } from 'next/cache';
import { getCacheKv } from './kv-cache';
import { invalidatePublicCache } from './html-cache';

/**
 * Synchronously invalidates public storefront caches (Workers KV/memHtml + Next route cache)
 * after admin campaign or settings mutations so homepage and /hot-sale match immediately.
 */
export async function revalidateFlashSaleStorefront(): Promise<void> {
  try {
    const kv = await getCacheKv();
    await invalidatePublicCache(kv ?? undefined);
  } catch {
    // Non-Worker / unit test environments ignore KV absence.
  }

  for (const path of ['/', '/hot-sale']) {
    try {
      revalidatePath(path);
    } catch {
      // Ignored outside Next request context (e.g. Miniflare CLI scripts).
    }
  }
}
