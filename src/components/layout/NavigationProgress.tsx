"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const PREFETCH_TTL_MS = 45_000;
const NON_PREFETCH_PREFIXES = ["/admin", "/api", "/login", "/cart", "/checkout", "/profile"];

/**
 * Tracks which App Router route patterns already have their `prefetch-loading-shell`
 * template seeded in Vinext's `optimisticRouteTemplates`.
 * Keying by route pattern (instead of per-URL) avoids firing 80+ redundant prefetch
 * requests on pages with many links while guaranteeing instant URL + skeleton updates.
 */
const seededRoutePatterns = new Set<string>();

const STATIC_SINGLE_SEGMENT_ROUTES = new Set([
  "/",
  "/hot-sale",
  "/phu-kien",
  "/phan-loai",
  "/news",
  "/gioi-thieu",
  "/he-thong-cua-hang",
  "/chinh-sach-bao-hanh",
  "/chinh-sach-doi-tra",
  "/chinh-sach-van-chuyen",
  "/chinh-sach-bao-mat",
  "/dieu-khoan-mua-hang",
  "/huong-dan-mua-hang",
  "/cau-hoi-thuong-gap",
  "/lien-he",
  "/chon-laptop",
  "/search",
  "/wishlist",
  "/so-sanh",
  "/order-tracking",
]);

function getRoutePatternKey(pathname: string): string {
  if (STATIC_SINGLE_SEGMENT_ROUTES.has(pathname)) return `route:${pathname}`;
  if (pathname.startsWith("/laptop/")) return "route:/laptop/[id]";
  if (pathname.startsWith("/phu-kien/")) return "route:/phu-kien/[id]";
  if (pathname.startsWith("/product/")) return "route:/product/[id]";
  if (pathname.startsWith("/san-pham/")) return "route:/san-pham/[id]";
  if (pathname.startsWith("/news/category/")) return "route:/news/category/[slug]";
  if (pathname.startsWith("/news/")) return "route:/news/[slug]";
  if (pathname.startsWith("/brand/")) return "route:/brand/[slug]";
  if (pathname.startsWith("/category/")) return "route:/category/[slug]";
  if (pathname.startsWith("/collection/")) return "route:/collection/[slug]";
  if (pathname.startsWith("/landing/")) return "route:/landing/[slug]";
  if (pathname.startsWith("/phan-loai/")) return "route:/phan-loai/[...category]";

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 1) return "route:/[slug]";
  return "route:/[...category]";
}

function parseInternalStorefrontAnchor(
  anchor: HTMLAnchorElement,
): { fullHref: string; pathname: string } | null {
  if (!anchor.href) return null;
  if (anchor.hasAttribute("download")) return null;
  if (anchor.target && anchor.target !== "_self") return null;

  let url: URL;
  try {
    url = new URL(anchor.href, window.location.origin);
  } catch {
    return null;
  }

  if (url.origin !== window.location.origin) return null;
  if (NON_PREFETCH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return null;
  return {
    fullHref: `${url.pathname}${url.search}`,
    pathname: url.pathname,
  };
}

export default function NavigationProgress() {
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const prefetchedMapRef = useRef<Map<string, number>>(new Map());
  const timerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const progressRef = useRef(0);

  const applyBarStyle = (pct: number, show: boolean) => {
    const container = containerRef.current;
    const bar = barRef.current;
    if (!container || !bar) return;
    container.style.opacity = show ? "1" : "0";
    bar.style.width = `${pct}%`;
    bar.style.opacity = pct >= 100 ? "0" : "1";
  };

  const completeProgress = () => {
    if (!activeRef.current) return;
    activeRef.current = false;
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    document.documentElement.style.cursor = "";
    progressRef.current = 100;
    applyBarStyle(100, true);
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      progressRef.current = 0;
      applyBarStyle(0, false);
    }, 180);
  };

  // Seed at most 1 loading-shell prefetch (pathname without query string) per route pattern
  // after navigation settles so clicking any product/category/article link commits its URL
  // and skeleton shell in <5ms without flooding the network or prefetch cache.
  useEffect(() => {
    const timers: number[] = [];
    const scanTimer = window.setTimeout(() => {
      const anchors = document.querySelectorAll<HTMLAnchorElement>("a[href]");
      const toSeed: string[] = [];
      const queuedPatterns = new Set<string>();

      for (const anchor of anchors) {
        const parsed = parseInternalStorefrontAnchor(anchor);
        if (!parsed || parsed.pathname === window.location.pathname) continue;
        const patternKey = getRoutePatternKey(parsed.pathname);
        if (seededRoutePatterns.has(patternKey) || queuedPatterns.has(patternKey)) continue;
        queuedPatterns.add(patternKey);
        toSeed.push(parsed.pathname);
        if (toSeed.length >= 6) break;
      }

      toSeed.forEach((seedPathname, index) => {
        const t = window.setTimeout(() => {
          const patternKey = getRoutePatternKey(seedPathname);
          if (seededRoutePatterns.has(patternKey)) return;
          seededRoutePatterns.add(patternKey);
          try {
            // Prefetch pathname WITHOUT search params using default kind ("auto")
            // so Vinext sends `X-Vinext-Rsc-Render-Mode: prefetch-loading-shell`
            // and learns the optimistic route template for this route pattern.
            router.prefetch(seedPathname);
          } catch {
            seededRoutePatterns.delete(patternKey);
          }
        }, index * 45);
        timers.push(t);
      });
    }, 180);

    return () => {
      window.clearTimeout(scanTimer);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [pathname, router]);

  useEffect(() => {
    const warmOnIntent = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const parsed = parseInternalStorefrontAnchor(anchor);
      if (!parsed) return;
      const current = `${window.location.pathname}${window.location.search}`;
      if (parsed.fullHref === current) return;

      // 1. Ensure the route pattern's optimistic loading-shell template is seeded
      const patternKey = getRoutePatternKey(parsed.pathname);
      if (!seededRoutePatterns.has(patternKey)) {
        seededRoutePatterns.add(patternKey);
        try {
          router.prefetch(parsed.pathname);
        } catch {
          seededRoutePatterns.delete(patternKey);
        }
      }

      // 2. Warm the Worker Edge RSC cache in the background WITHOUT calling
      // `router.prefetch(href, { kind: "full" })` (which would delete the optimistic
      // loading shell and block URL/skeleton commit on an in-flight `entry.pending`).
      const now = Date.now();
      const lastPrefetched = prefetchedMapRef.current.get(parsed.fullHref);
      if (lastPrefetched && now - lastPrefetched < PREFETCH_TTL_MS) return;
      prefetchedMapRef.current.set(parsed.fullHref, now);

      const rscWarmUrl = `${parsed.fullHref}${parsed.fullHref.includes("?") ? "&" : "?"}_rsc`;
      fetch(rscWarmUrl, {
        headers: {
          RSC: "1",
          Accept: "text/x-component",
        },
        credentials: "include",
        priority: "low",
      } as RequestInit).catch(() => {
        // Ignore background cache warm errors
      });
    };

    const handlePointerOver = (e: MouseEvent) => {
      warmOnIntent(e.target);
    };

    const handleTouchStart = (e: TouchEvent) => {
      warmOnIntent(e.target);
    };

    const handleClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (!(e.target instanceof Element)) return;
      const anchor = e.target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const parsed = parseInternalStorefrontAnchor(anchor);
      if (!parsed) return;

      const current = `${window.location.pathname}${window.location.search}`;
      if (parsed.fullHref === current) return;

      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }

      activeRef.current = true;
      progressRef.current = 32;
      applyBarStyle(32, true);

      const startedAt = Date.now();
      let urlChangedAt: number | null = null;

      timerRef.current = window.setInterval(() => {
        const now = Date.now();
        const nowPath = `${window.location.pathname}${window.location.search}`;
        if (nowPath !== current && urlChangedAt === null) {
          urlChangedAt = now;
        }

        const isShowingSkeleton = Boolean(
          document.querySelector('[data-route-loading="true"]'),
        );

        // Complete once the URL has updated AND the optimistic skeleton has been
        // replaced by the actual page content (with an 80ms grace check).
        if (
          (urlChangedAt !== null && now - urlChangedAt >= 80 && !isShowingSkeleton) ||
          now - startedAt > 6000
        ) {
          completeProgress();
          return;
        }

        const prev = progressRef.current;
        if (prev < 90) {
          const step = prev < 60 ? 14 : prev < 78 ? 5 : 1.5;
          const next = Math.min(90, prev + step);
          progressRef.current = next;
          applyBarStyle(next, true);
        }
      }, 50);
    };

    document.addEventListener("pointerover", handlePointerOver, { passive: true });
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("click", handleClick, { capture: true });

    return () => {
      document.removeEventListener("pointerover", handlePointerOver);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("click", handleClick, { capture: true });
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
      document.documentElement.style.cursor = "";
    };
  }, [router]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{ opacity: 0 }}
      className="fixed top-0 left-0 right-0 z-[10000] h-[3px] pointer-events-none overflow-hidden bg-blue-500/15 transition-opacity duration-150"
    >
      <div
        ref={barRef}
        style={{ width: "0%", opacity: 1 }}
        className="h-full bg-gradient-to-r from-[#2563eb] via-[#38bdf8] to-[#D71920] shadow-[0_0_10px_rgba(37,99,235,0.75)] transition-[width,opacity] duration-150 ease-out"
      />
    </div>
  );
}
