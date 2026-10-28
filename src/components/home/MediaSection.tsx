import { mediaEnvironment } from '@/server/media-http';
import { publicPostList } from '@/server/services/post.service';
import MediaSectionView from './MediaSectionView';

type MediaPost = Awaited<ReturnType<typeof publicPostList>>['items'][number];

export default async function MediaSection({ posts, title }: { posts?: MediaPost[]; title?: string } = {}) {
  const items = posts ?? (await publicPostList((await mediaEnvironment()).DB, { limit: 10 })).items;
  return <MediaSectionView posts={items} title={title} />;
}
