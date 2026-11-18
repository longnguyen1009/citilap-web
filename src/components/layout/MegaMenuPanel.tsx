"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import type { HeaderMenuNode } from "./Header";
import { BrandLogo, MenuNodeIcon, brandAccent } from "./menuIcons";

const shortLine = (lineName: string, brandName: string) =>
  lineName.toLowerCase().startsWith(`${brandName.toLowerCase()} `)
    ? lineName.slice(brandName.length).trim()
    : lineName;

const ICON_ANIM =
  "transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-6 motion-reduce:transition-none motion-reduce:group-hover:transform-none";

export default function MegaMenuPanel({ title, href, nodes, onNavigate, className = "" }: {
  title?: string;
  href?: string;
  nodes: HeaderMenuNode[];
  onNavigate: () => void;
  className?: string;
}) {
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hover intent: short delay so moving diagonally to column 2 doesn't switch brand
  const hover = (i: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setActive(i), 90);
  };

  const current = nodes[Math.min(active, nodes.length - 1)];
  const brandName = current?.name.trim().split(/\s+/)[0] ?? "";
  const accent = current ? brandAccent(current.name) : "#2563EB";

  return (
    <div className={`flex flex-col bg-white text-slate-800 ${className}`}>
    <div className="flex">
      {/* Column 1: brands */}
      <ul
        className="w-64 shrink-0 divide-y divide-slate-200/80 border-r border-slate-200 bg-slate-50 px-2 py-1.5"
        onMouseLeave={() => timer.current && clearTimeout(timer.current)}
      >
        {nodes.map((brand, i) => {
          const isActive = i === active;
          const c = brandAccent(brand.name);
          return (
            <li key={`${brand.href}-${i}`} className="py-0.5">
              <Link
                href={brand.href} prefetch={false} onClick={onNavigate}
                onMouseEnter={() => hover(i)} onFocus={() => setActive(i)}
                style={{ "--c": c } as CSSProperties}
                className={`group relative flex min-h-10 items-center gap-3 rounded-lg border-l-4 px-2.5 py-0.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-blue-600 ${
                  isActive
                    ? "border-[var(--c)] bg-white text-[var(--c)] shadow-md"
                    : "border-transparent text-slate-700 hover:border-[var(--c)]/40 hover:bg-white"
                }`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${isActive ? "bg-[var(--c)] text-white shadow-sm" : "text-[var(--c)] group-hover:bg-[var(--c)] group-hover:text-white"}`}>
                  <span className={ICON_ANIM}><BrandLogo name={brand.name} className="h-8 w-8" /></span>
                </span>
                <span className="flex-1 truncate">{brand.name}</span>
                <ChevronRight aria-hidden="true" className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isActive ? "translate-x-0.5" : "text-slate-300 group-hover:translate-x-0.5"}`} />
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Column 2: product lines, tinted with the brand colour */}
      <div
        className="min-w-0 flex-1 p-3"
        style={{ "--c": accent, background: `linear-gradient(135deg, ${accent}0d, transparent 60%)` } as CSSProperties}
      >
        {current && (
          <div className="mb-3 flex items-center gap-2 border-b border-[var(--c)]/20 pb-2 text-xs font-bold uppercase tracking-wider text-[var(--c)]">
            <BrandLogo name={current.name} className="h-6 w-6" />
            {current.name}
          </div>
        )}
        {current?.children?.length ? (
          <ul key={current.href} className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-left-1 duration-200">
            {current.children.map((line, i) => (
              <li key={`${line.href}-${i}`}>
                <Link
                  href={line.href} prefetch={false} onClick={onNavigate}
                  className="group flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--c)] hover:text-[var(--c)] hover:shadow-lg focus-visible:outline-2 focus-visible:outline-blue-600 motion-reduce:hover:translate-y-0"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--c)] transition-colors duration-200 group-hover:bg-[var(--c)] group-hover:text-white group-hover:shadow-md">
                    <MenuNodeIcon name={line.name} className={`h-4 w-4 ${ICON_ANIM}`} />
                  </span>
                  <span className="truncate">{shortLine(line.name, brandName)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : current ? (
          <Link href={current.href} prefetch={false} onClick={onNavigate}
            className="flex min-h-12 items-center justify-center rounded-xl border border-dashed border-[var(--c)]/40 text-sm font-semibold text-[var(--c)] hover:bg-white">
            Xem sản phẩm {current.name}
          </Link>
        ) : null}
      </div>
    </div>
      {href && (
        <div className="flex justify-center border-t border-slate-200 bg-slate-50/80 px-3 py-2.5">
          <Link
            href={href} prefetch={false} onClick={onNavigate}
            className="group inline-flex min-h-10 items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:shadow-lg hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Xem tất cả {title ? title.toLowerCase().replace(/^\p{L}/u, (m) => m.toUpperCase()) : ""}
            <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
          </Link>
        </div>
      )}
    </div>
  );
}
