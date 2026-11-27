import type { publicPostList } from '@/server/services/post.service';
import { getCachedPublicPostList } from '@/server/services/storefront-cms.service';
import { isCustomerExperienceCategory } from '@/lib/customer-experience';
import MediaSectionView from './MediaSectionView';

type MediaPost = Awaited<ReturnType<typeof publicPostList>>['items'][number];

export default async function MediaSection({ posts, title }: { posts?: MediaPost[]; title?: string } = {}) {
  const rawItems = posts ?? (await getCachedPublicPostList(undefined, 1, 30)).items;
  const items = rawItems.filter((p) => !isCustomerExperienceCategory(p.category)).slice(0, 10);
  return <MediaSectionView posts={items} title={title} />;
}
