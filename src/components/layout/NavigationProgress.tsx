"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const PREFETCH_TTL_MS = 45_000;
const NON_PREFETCH_PREFIXES = ["/admin", "/api", "/login", "/cart", "/checkout", "/profile"];

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
  // Ignore pure hash jumps on the same page
  if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) {
    return null;
  }

  return {
    fullHref: `${url.pathname}${url.search}`,
    pathname: url.pathname,
  };
}

export default function NavigationProgress() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams?.toString() ?? "";

  const containerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const prefetchedMapRef = useRef<Map<string, number>>(new Map());
  const timerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const dimTimerRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const progressRef = useRef(0);

  const setMainNavigating = (navigating: boolean) => {
    const main = document.getElementById("main-content");
    if (!main) return;
    if (navigating) {
      main.setAttribute("data-navigating", "true");
    } else {
      main.removeAttribute("data-navigating");
    }
  };

  const applyBarStyle = (pct: number, show: boolean) => {
    const container = containerRef.current;
    const bar = barRef.current;
    if (!container || !bar) return;
    container.style.opacity = show ? "1" : "0";
    bar.style.width = `${pct}%`;
    bar.style.opacity = pct >= 100 ? "0" : "1";
  };

  const completeProgress = () => {
    if (dimTimerRef.current !== null) {
      window.clearTimeout(dimTimerRef.current);
      dimTimerRef.current = null;
    }
    setMainNavigating(false);

    if (!activeRef.current) return;
    activeRef.current = false;
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
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

  // Complete progress bar whenever the committed route or query changes
  useEffect(() => {
    completeProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchKey]);

  useEffect(() => {
    const startProgress = (targetHref: string) => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
      if (dimTimerRef.current !== null) {
        window.clearTimeout(dimTimerRef.current);
      }

      activeRef.current = true;
      progressRef.current = 28;
      applyBarStyle(28, true);

      // Subtle tactile feedback on slow connections (>120ms) without flashing on instant cache hits
      dimTimerRef.current = window.setTimeout(() => {
        if (activeRef.current) {
          setMainNavigating(true);
        }
      }, 120);

      const startedAt = Date.now();
      const startHref = `${window.location.pathname}${window.location.search}`;

      timerRef.current = window.setInterval(() => {
        const now = Date.now();
        const nowHref = `${window.location.pathname}${window.location.search}`;
        const isShowingSkeleton = Boolean(
          document.querySelector('[data-route-loading="true"]'),
        );

        if (
          (nowHref !== startHref && nowHref === targetHref && !isShowingSkeleton) ||
          now - startedAt > 6000
        ) {
          completeProgress();
          return;
        }

        const prev = progressRef.current;
        if (prev < 90) {
          const step = prev < 58 ? 14 : prev < 78 ? 5 : 1.5;
          const next = Math.min(90, prev + step);
          progressRef.current = next;
          applyBarStyle(next, true);
        }
      }, 60);
    };

    const prefetchOnIntent = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const parsed = parseInternalStorefrontAnchor(anchor);
      if (!parsed) return;
      const current = `${window.location.pathname}${window.location.search}`;
      if (parsed.fullHref === current) return;

      const now = Date.now();
      const lastPrefetched = prefetchedMapRef.current.get(parsed.fullHref);
      if (lastPrefetched && now - lastPrefetched < PREFETCH_TTL_MS) return;
      prefetchedMapRef.current.set(parsed.fullHref, now);

      // Use router.prefetch exclusively (avoid duplicate manual ?_rsc fetch & stale pattern seeding)
      try {
        router.prefetch(parsed.fullHref);
      } catch {
        // Ignore prefetch errors
      }
    };

    const handlePointerOver = (e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        prefetchOnIntent(e.target);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      prefetchOnIntent(e.target);
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

      startProgress(parsed.fullHref);
    };

    const handlePopState = () => {
      // Ensure back/forward traversal always clears any stale navigating state
      completeProgress();
    };

    document.addEventListener("pointerover", handlePointerOver, { passive: true });
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("click", handleClick, { capture: true });
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("pointerover", handlePointerOver);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("click", handleClick, { capture: true });
      window.removeEventListener("popstate", handlePopState);
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
      if (dimTimerRef.current !== null) window.clearTimeout(dimTimerRef.current);
      setMainNavigating(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
