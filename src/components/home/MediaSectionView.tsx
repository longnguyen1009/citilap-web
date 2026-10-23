import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, ChevronRight } from 'lucide-react';
import type { publicPostList } from '@/server/services/post.service';

type MediaPost = Awaited<ReturnType<typeof publicPostList>>['items'][number];

export default function MediaSectionView({ posts, title = 'CitiLap Media & Review' }: { posts: MediaPost[]; title?: string }) {
  const items = posts;
  const [featured, ...rest] = items;
  if (!featured) return null;
  const date = (value: string) => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z'));
  return (
    <section className="pb-10" aria-label={title}>
      <div className="container mx-auto max-w-[1370px] px-4">
        <div className="rounded-2xl border border-slate-800 bg-[#0b1221] p-4 text-white shadow-lg sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-3 text-xl font-black uppercase sm:text-2xl lg:text-3xl">
              <BookOpen className="h-7 w-7 shrink-0 text-red-500" aria-hidden="true" />{title}
            </h2>
            <Link href="/news" className="inline-flex items-center gap-1 text-sm text-blue-200 hover:text-white">Xem thêm tin tức & bài viết<ChevronRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr] lg:gap-6">
            <Link href={`/news/${featured.slug}`} className="group relative flex min-h-80 items-end overflow-hidden rounded-xl border border-slate-700 bg-slate-800 sm:aspect-video">
              {featured.coverImage && <Image src={featured.coverImage.url} alt={featured.coverImage.alt} fill sizes="(max-width: 1024px) 100vw, 850px" className="object-cover transition duration-500 group-hover:scale-105" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="relative p-5 sm:p-6">
                <span className="mb-3 inline-block rounded bg-red-600 px-2.5 py-1 text-xs font-bold uppercase">{featured.category?.name || 'Tư vấn chọn máy'}</span>
                <h3 className="text-xl font-bold leading-snug sm:text-2xl lg:text-3xl">{featured.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-slate-200">{featured.excerpt}</p>
              </div>
            </Link>
            <div className="flex flex-col gap-4">
              {rest.map(post => <Link key={post.id} href={`/news/${post.slug}`} className="group flex gap-3 rounded-xl border border-slate-800 bg-slate-800/70 p-3 transition hover:bg-slate-700/70">
                <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-700 sm:w-28">
                  {post.coverImage ? <Image src={post.coverImage.url} alt={post.coverImage.alt} fill sizes="112px" className="object-cover transition group-hover:scale-105" /> : <BookOpen className="m-auto h-full w-8 text-slate-400" />}
                </div>
                <div className="min-w-0">
                  <h3 className="line-clamp-3 text-sm font-bold leading-snug text-slate-100 group-hover:text-white">{post.title}</h3>
                  <p className="mt-2 text-xs text-blue-200">{post.category?.name || 'Cẩm nang laptop'} · <time dateTime={post.publishedAt}>{date(post.publishedAt)}</time></p>
                </div>
              </Link>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
