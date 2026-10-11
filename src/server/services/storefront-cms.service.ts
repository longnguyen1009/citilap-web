import 'server-only';

import { mediaEnvironment } from '@/server/media-http';
import { MediaError } from '@/server/services/media-library.service';
import { publicNavigation, publicCollection } from '@/server/services/navigation.service';
import { publicStudio } from '@/server/services/product-studio.service';

/** A missing publication falls back to the existing catalog. Infrastructure errors surface. */
async function publishedOrNull<T>(action: () => Promise<T>): Promise<T | null> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof MediaError && error.status === 404) return null;
    throw error;
  }
}

export function getPublishedNavigation() {
  return publishedOrNull(async () => publicNavigation((await mediaEnvironment()).DB));
}

export function getPublishedStudio(slug: string) {
  return publishedOrNull(async () => publicStudio((await mediaEnvironment()).DB, slug));
}

export async function getPublishedCollection(slug: string) {
  return publicCollection((await mediaEnvironment()).DB, slug);
}
