'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import type { publicPostList } from '@/server/services/post.service';

type MediaPost = Awaited<ReturnType<typeof publicPostList>>['items'][number];

export default function MediaSectionView({ posts, title = 'CitiLap Media & Review' }: { posts: MediaPost[]; title?: string }) {
  const rail = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ start: true, end: false });
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const update = () => setBounds({ start: el.scrollLeft <= 1, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener('scroll', update, { passive: true });
    update();
    return () => { observer.disconnect(); el.removeEventListener('scroll', update); };
  }, [posts]);
  if (!posts.length) return null;
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
          <div className="relative">
            <div ref={rail} role="region" aria-label={`Danh sách ${title}`} tabIndex={0} className="grid grid-flow-col auto-cols-[88%] sm:auto-cols-[calc((100%-16px)/2)] lg:auto-cols-[calc((100%-32px)/3)] gap-4 overflow-x-auto overscroll-x-contain hide-scrollbar snap-x snap-mandatory scroll-px-1 scroll-smooth motion-reduce:scroll-auto p-1 pb-3 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400">
              {posts.map(post => (
                <Link
                  key={post.id}
                  href={`/news/${post.slug}`}
                  className="group flex min-w-0 snap-start flex-col overflow-hidden rounded-xl border border-slate-500 bg-slate-900 transition-[border-color,background-color] hover:border-blue-300 hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400 focus-visible:outline-hidden"
                >
                  <div className="relative aspect-video shrink-0 overflow-hidden border-b border-slate-600 bg-slate-800">
                    {post.coverImage ? <Image src={post.coverImage.url} alt={post.coverImage.alt} fill sizes="(max-width: 640px) 88vw, (max-width: 1024px) 50vw, 420px" className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none" /> : <BookOpen className="m-auto h-full w-10 text-slate-400" />}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <p className="mb-2 text-xs font-semibold text-blue-200">{post.category?.name || 'Cẩm nang laptop'} · <time dateTime={post.publishedAt}>{date(post.publishedAt)}</time></p>
                    <h3 className="line-clamp-2 min-h-12 text-base font-bold leading-6 text-white group-hover:text-blue-200 transition-colors">{post.title}</h3>
                    <p className="mt-2 mb-4 line-clamp-2 text-sm leading-6 text-slate-300">{post.excerpt}</p>
                    <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-blue-200">Đọc bài viết<ChevronRight className="h-4 w-4" aria-hidden="true" /></span>
                  </div>
                </Link>
              ))}
            </div>
            <button type="button" aria-label="Tin tức trước" disabled={bounds.start} onClick={() => rail.current?.scrollBy({ left: -rail.current.clientWidth, behavior: 'auto' })} className="absolute left-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-900 shadow-md hover:bg-blue-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" aria-label="Tin tức tiếp theo" disabled={bounds.end} onClick={() => rail.current?.scrollBy({ left: rail.current.clientWidth, behavior: 'auto' })} className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-900 shadow-md hover:bg-blue-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"><ChevronRight className="h-5 w-5" /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
