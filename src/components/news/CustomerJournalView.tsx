import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, ChevronRight, Laptop, Newspaper } from 'lucide-react';
import {
  formatJournalDateParts,
  getPostHref,
  type CustomerExperienceCardItem,
} from '@/lib/customer-experience';

interface CustomerJournalViewProps {
  entries: CustomerExperienceCardItem[];
  categoryName?: string;
  total: number;
}

export default function CustomerJournalView({
  entries,
  categoryName = 'Trải nghiệm khách hàng',
  total,
}: CustomerJournalViewProps) {
  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-10 sm:p-14 text-center shadow-xs">
        <BookOpen className="w-12 h-12 text-blue-200 mx-auto mb-3" />
        <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-1">
          Chưa có bài nhật ký trải nghiệm nào được xuất bản
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6">
          Các câu chuyện bàn giao máy và chia sẻ thực tế từ khách hàng thuộc chuyên mục &ldquo;{categoryName}&rdquo; sẽ được cập nhật liên tục tại đây.
        </p>
        <Link
          href="/news"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
        >
          Xem tất cả Tin tức &amp; Review <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const [lead, ...rest] = entries;
  const leadDate = formatJournalDateParts(lead.publishedAt);
  const leadCover = lead.coverImage?.thumbnailUrl || lead.coverImage?.url;
  const leadAuthor = lead.authorName?.trim() || 'Khách hàng CitiLap';
  const leadHref = getPostHref(lead);

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 lg:p-6 shadow-xs">
      {/* Journal Header */}
      <div className="mb-5 pb-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs shrink-0">
            <BookOpen className="w-5 h-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg lg:text-xl font-black uppercase tracking-tight text-slate-900">
                Nhật Ký {categoryName}
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Ảnh &amp; chia sẻ thực tế
              </span>
            </div>
            <p className="text-xs sm:text-[13px] text-slate-500 mt-0.5">
              Ghi lại khoảnh khắc kiểm tra máy, bàn giao và cảm nhận thực tế của từng khách hàng tại CitiLap
            </p>
          </div>
        </div>

        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full shrink-0">
          {total} nhật ký
        </span>
      </div>

      {/* 2-Column Journal Timeline Layout (PA 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* LEFT COLUMN (5 cols): Featured / Latest Journal Entry */}
        <article className="lg:col-span-5 lg:sticky lg:top-24 group flex flex-col rounded-xl border border-blue-200/80 bg-gradient-to-b from-blue-50/40 via-white to-white overflow-hidden shadow-xs hover:border-blue-500 hover:shadow-md transition">
          <Link
            href={leadHref}
            className="relative aspect-[16/10] bg-slate-100 overflow-hidden block"
          >
            {leadCover ? (
              <Image
                src={leadCover}
                alt={lead.coverImage?.alt || lead.title}
                fill
                priority
                unoptimized={
                  leadCover.startsWith('/api/library/') || leadCover.startsWith('/brand/')
                }
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <Newspaper className="w-10 h-10" />
              </div>
            )}

            {/* Calendar Leaf Date Stamp */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <div className="rounded-lg bg-white/95 backdrop-blur-xs px-2.5 py-1 text-center shadow-sm border border-slate-200/80 leading-none">
                <div className="text-[15px] font-black text-blue-600">{leadDate.day}</div>
                <div className="text-[10px] font-bold uppercase text-slate-500 mt-0.5">
                  {leadDate.monthLabel}
                </div>
              </div>
              {lead.entryNumber ? (
                <span className="rounded-md bg-slate-900/80 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-xs">
                  Nhật ký #{lead.entryNumber}
                </span>
              ) : null}
            </div>
          </Link>

          <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mb-2">
                <time dateTime={lead.publishedAt} className="font-bold text-emerald-700">
                  ✓ {leadDate.isToday ? `Hôm nay • ${leadDate.fullDate}` : leadDate.fullDate}
                </time>
                <span className="font-semibold text-slate-600 truncate max-w-[200px]">
                  {leadAuthor}
                </span>
              </div>

              <h3 className="text-[16px] sm:text-[18px] font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                <Link href={leadHref}>{lead.title}</Link>
              </h3>

              {lead.excerpt && (
                <blockquote className="mt-3 rounded-lg bg-slate-50 border-l-4 border-blue-500 px-3 py-2.5 text-xs sm:text-[13px] italic text-slate-600 leading-relaxed line-clamp-4">
                  &ldquo;{lead.excerpt}&rdquo;
                </blockquote>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              {lead.relatedProduct ? (
                <Link
                  href={`/san-pham/${lead.relatedProduct.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700 transition max-w-[220px] truncate"
                >
                  <Laptop className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{lead.relatedProduct.name}</span>
                </Link>
              ) : (
                <span className="text-xs font-medium text-slate-400">
                  {lead.category?.name || categoryName}
                </span>
              )}

              <Link
                href={leadHref}
                className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
              >
                Đọc nhật ký <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </article>

        {/* RIGHT COLUMN (7 cols): Vertical Timeline Feed */}
        <div className="lg:col-span-7 min-w-0">
          {rest.length > 0 ? (
            <div className="relative pl-6 sm:pl-8 space-y-3.5 before:content-[''] before:absolute before:left-[9px] sm:before:left-[13px] before:top-4 before:bottom-4 before:w-[2px] before:bg-gradient-to-b before:from-blue-500 before:via-slate-200 before:to-slate-100">
              {rest.map((item) => {
                const itemDate = formatJournalDateParts(item.publishedAt);
                const coverSrc = item.coverImage?.thumbnailUrl || item.coverImage?.url;
                const authorLabel = item.authorName?.trim() || 'Khách hàng CitiLap';
                const itemHref = getPostHref(item);

                return (
                  <article
                    key={item.id}
                    className="relative group rounded-xl border border-slate-200/80 bg-white hover:bg-blue-50/20 hover:border-blue-400 p-3 sm:p-3.5 transition shadow-2xs hover:shadow-sm"
                  >
                    {/* Timeline Dot */}
                    <span
                      aria-hidden="true"
                      className="absolute -left-[21px] sm:-left-[25px] top-6 h-3.5 w-3.5 rounded-full border-2 border-blue-600 bg-white group-hover:bg-blue-600 transition-colors"
                    />

                    <div className="flex flex-col sm:flex-row gap-3.5">
                      {/* Thumbnail */}
                      <Link
                        href={itemHref}
                        className="relative w-full sm:w-44 md:w-48 aspect-[16/10] sm:aspect-[4/3] shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200/60 block"
                      >
                        {coverSrc ? (
                          <Image
                            src={coverSrc}
                            alt={item.coverImage?.alt || item.title}
                            fill
                            loading="lazy"
                            unoptimized={
                              coverSrc.startsWith('/api/library/') ||
                              coverSrc.startsWith('/brand/')
                            }
                            sizes="(max-width: 640px) 100vw, 192px"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Newspaper className="w-8 h-8" />
                          </div>
                        )}
                      </Link>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] mb-1.5">
                            <time
                              dateTime={item.publishedAt}
                              className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 font-bold text-slate-700"
                            >
                              {itemDate.isToday
                                ? `Hôm nay • ${itemDate.fullDate}`
                                : itemDate.fullDate}
                            </time>
                            {item.entryNumber ? (
                              <span className="font-bold text-blue-600">
                                #{item.entryNumber}
                              </span>
                            ) : null}
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500 font-semibold truncate">
                              {authorLabel}
                            </span>
                          </div>

                          <h3 className="text-[14px] sm:text-[15px] font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                            <Link href={itemHref}>{item.title}</Link>
                          </h3>

                          {item.excerpt && (
                            <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                              {item.excerpt}
                            </p>
                          )}
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          {item.relatedProduct ? (
                            <Link
                              href={`/san-pham/${item.relatedProduct.slug}`}
                              className="inline-flex items-center gap-1 rounded bg-blue-50 hover:bg-blue-100 px-2 py-0.5 font-bold text-blue-700 transition max-w-[220px] truncate"
                            >
                              <Laptop className="w-3 h-3 shrink-0" aria-hidden="true" />
                              <span className="truncate">{item.relatedProduct.name}</span>
                            </Link>
                          ) : (
                            <span className="text-slate-400 font-medium">
                              Chia sẻ trải nghiệm thực tế
                            </span>
                          )}

                          <Link
                            href={itemHref}
                            className="inline-flex items-center gap-0.5 font-bold text-blue-600 hover:text-blue-700 transition shrink-0"
                          >
                            Xem chi tiết <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-xs text-slate-500">
              Đây là bài nhật ký đầu tiên trong chuyên mục. Khi đăng thêm bài mới, dòng thời gian nhật ký sẽ tự động hiển thị tại đây.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
