import type { publicPostList } from '@/server/services/post.service';
import { getCachedPublicPostList } from '@/server/services/storefront-cms.service';
import MediaSectionView from './MediaSectionView';

type MediaPost = Awaited<ReturnType<typeof publicPostList>>['items'][number];

export default async function MediaSection({ posts, title }: { posts?: MediaPost[]; title?: string } = {}) {
  const items = posts ?? (await getCachedPublicPostList(undefined, 1, 10)).items;
  return <MediaSectionView posts={items} title={title} />;
}
