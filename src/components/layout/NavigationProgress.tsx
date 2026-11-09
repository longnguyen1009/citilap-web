"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const PREFETCH_TTL_MS = 45_000;
const NON_PREFETCH_PREFIXES = ["/admin", "/api", "/login", "/cart", "/checkout", "/profile"];

function isInternalStorefrontHref(anchor: HTMLAnchorElement): string | null {
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
  return `${url.pathname}${url.search}`;
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

  useEffect(() => {
    completeProgress();
  });

  useEffect(() => {
    completeProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const triggerFullPrefetch = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const href = isInternalStorefrontHref(anchor);
      if (!href) return;
      const current = `${window.location.pathname}${window.location.search}`;
      if (href === current) return;

      const now = Date.now();
      const lastPrefetched = prefetchedMapRef.current.get(href);
      if (lastPrefetched && now - lastPrefetched < PREFETCH_TTL_MS) return;
      prefetchedMapRef.current.set(href, now);

      try {
        router.prefetch(href, { kind: "full" as never });
      } catch {
        // Ignore prefetch errors
      }
    };

    const handlePointerOver = (e: MouseEvent) => {
      triggerFullPrefetch(e.target);
    };

    const handleTouchStart = (e: TouchEvent) => {
      triggerFullPrefetch(e.target);
    };

    const handleClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (!(e.target instanceof Element)) return;
      const anchor = e.target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const href = isInternalStorefrontHref(anchor);
      if (!href) return;

      const current = `${window.location.pathname}${window.location.search}`;
      if (href === current) return;

      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }

      activeRef.current = true;
      progressRef.current = 28;
      applyBarStyle(28, true);
      document.documentElement.style.cursor = "progress";

      const startedAt = Date.now();
      timerRef.current = window.setInterval(() => {
        const nowPath = `${window.location.pathname}${window.location.search}`;
        if (nowPath !== current || Date.now() - startedAt > 8000) {
          completeProgress();
          return;
        }
        const prev = progressRef.current;
        if (prev < 88) {
          const step = prev < 55 ? 12 : prev < 75 ? 5 : 2;
          const next = Math.min(88, prev + step);
          progressRef.current = next;
          applyBarStyle(next, true);
        }
      }, 60);
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
