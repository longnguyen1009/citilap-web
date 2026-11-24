"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Flame, ArrowRight, X, Clock, ShieldCheck, Sparkles } from "lucide-react";
import {
  DEFAULT_HOMEPAGE_POPUP,
  type HomepagePopupConfig,
} from "@/contracts/cms/settings";

const SESSION_DISMISS_KEY = "citilap_home_popup_dismissed";
const DAILY_DISMISS_KEY = "citilap_home_popup_dismissed_date";

function getLocalDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIsoMs(value?: string): number | null {
  if (!value || !value.trim()) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function formatCountdown(diffMs: number) {
  const clamped = Math.max(0, diffMs);
  const days = Math.floor(clamped / 86_400_000);
  const hours = Math.floor((clamped % 86_400_000) / 3_600_000);
  const minutes = Math.floor((clamped % 3_600_000) / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
}

function isDismissedByFrequency(frequency: HomepagePopupConfig["frequency"]): boolean {
  if (frequency === "always") return false;
  try {
    if (frequency === "session") {
      return window.sessionStorage.getItem(SESSION_DISMISS_KEY) === "1";
    }
    if (frequency === "daily") {
      return window.localStorage.getItem(DAILY_DISMISS_KEY) === getLocalDateKey();
    }
  } catch {
    // Ignore storage errors in private mode
  }
  return false;
}

function recordDismissByFrequency(frequency: HomepagePopupConfig["frequency"]): void {
  if (frequency === "always") return;
  try {
    if (frequency === "session") {
      window.sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    } else if (frequency === "daily") {
      window.localStorage.setItem(DAILY_DISMISS_KEY, getLocalDateKey());
    }
  } catch {
    // Ignore storage errors
  }
}

interface BlackFridayPopupProps {
  config?: HomepagePopupConfig | null;
}

export default function BlackFridayPopup({ config }: BlackFridayPopupProps) {
  const popup = config ? { ...DEFAULT_HOMEPAGE_POPUP, ...config } : DEFAULT_HOMEPAGE_POPUP;

  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const ctaRef = useRef<HTMLAnchorElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [nowMs, setNowMs] = useState<number | null>(null);

  const startMs = parseIsoMs(popup.startAt);
  const endMs = parseIsoMs(popup.endAt);

  // Open popup shortly after homepage mounts (does not block initial LCP paint)
  useEffect(() => {
    if (!popup.enabled) return;

    const now = Date.now();
    setNowMs(now);
    if (endMs !== null && now >= endMs) return;
    if (isDismissedByFrequency(popup.frequency)) return;

    const delay = Math.max(0, Math.min(15000, Number(popup.delayMs) || 0));
    const timer = window.setTimeout(() => {
      const dialog = dialogRef.current;
      if (!dialog || dialog.open) return;
      try {
        // Ensure native HTML autofocus attribute is present for showModal() initial focus
        ctaRef.current?.setAttribute("autofocus", "");
        setNowMs(Date.now());
        dialog.showModal();
        setIsOpen(true);
      } catch {
        // Ignore if dialog cannot open
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [popup.enabled, popup.frequency, popup.delayMs, endMs]);

  // Live 1-second countdown only while popup is visible and countdown is active
  useEffect(() => {
    if (!isOpen || !popup.showCountdown || (startMs === null && endMs === null)) return;
    const tick = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [isOpen, popup.showCountdown, startMs, endMs]);

  // Handle native close event + Safari light-dismiss fallback (when closedBy is unsupported)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = "";
      setIsOpen(false);
      recordDismissByFrequency(popup.frequency);
    };

    dialog.addEventListener("close", handleClose);

    if (!("closedBy" in HTMLDialogElement.prototype)) {
      const isOutside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      let pressedOutside = false;
      const handlePointerDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };
      const handlePointerUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e) && dialog.open) {
          dialog.close();
        }
        pressedOutside = false;
      };

      dialog.addEventListener("pointerdown", handlePointerDown);
      dialog.addEventListener("pointerup", handlePointerUp);
      return () => {
        dialog.removeEventListener("close", handleClose);
        dialog.removeEventListener("pointerdown", handlePointerDown);
        dialog.removeEventListener("pointerup", handlePointerUp);
      };
    }

    return () => {
      dialog.removeEventListener("close", handleClose);
    };
  }, [popup.frequency]);

  if (!popup.enabled) {
    return null;
  }

  const closePopup = () => {
    const dialog = dialogRef.current;
    if (dialog?.open) {
      dialog.close();
    }
  };

  const hasCountdownTarget = popup.showCountdown && (startMs !== null || endMs !== null);
  const isBeforeStart = startMs !== null && nowMs !== null && nowMs < startMs;
  const targetMs = isBeforeStart ? startMs : (endMs ?? startMs);
  const cd =
    nowMs === null || targetMs === null
      ? { days: "--", hours: "--", minutes: "--", seconds: "--" }
      : formatCountdown(targetMs - nowMs);

  const ctaHref = popup.ctaLink?.trim() || "/black-friday";
  const isExternalCta = /^https?:\/\//i.test(ctaHref);
  const imageSrc = popup.imageUrl?.trim() || DEFAULT_HOMEPAGE_POPUP.imageUrl;
  const tiers = Array.isArray(popup.tiers) ? popup.tiers.filter((t) => t.label || t.value) : [];

  if (popup.displayMode === "image_only") {
    return (
      <dialog
        ref={dialogRef}
        {...({ closedby: "any" } as Record<string, string>)}
        aria-labelledby={titleId}
        className="m-auto w-[min(92vw,560px)] max-h-[92dvh] overflow-hidden rounded-2xl border border-amber-400/35 bg-[#0b0b11] p-0 text-white shadow-[0_24px_70px_rgba(0,0,0,0.75)] backdrop:bg-black/70 backdrop:backdrop-blur-xs open:block"
      >
        <div className="relative">
          <h1 id={titleId} className="sr-only">
            {popup.title || "Chương trình khuyến mãi CitiLap"}
          </h1>
          <button
            type="button"
            onClick={closePopup}
            aria-label="Đóng thông báo khuyến mãi"
            className="absolute top-2.5 right-2.5 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/70 text-white/90 backdrop-blur-sm transition hover:border-amber-300/60 hover:bg-red-600 hover:text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            <X className="h-4.5 w-4.5" aria-hidden="true" />
          </button>

          {isExternalCta ? (
            <a
              ref={ctaRef}
              href={ctaHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closePopup}
              className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt={popup.title || "Khuyến mãi CitiLap"}
                loading="lazy"
                decoding="async"
                className="block w-full max-h-[85dvh] object-contain bg-[#09090d]"
              />
            </a>
          ) : (
            <Link
              ref={ctaRef}
              href={ctaHref}
              onClick={closePopup}
              className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt={popup.title || "Khuyến mãi CitiLap"}
                loading="lazy"
                decoding="async"
                className="block w-full max-h-[85dvh] object-contain bg-[#09090d]"
              />
            </Link>
          )}
        </div>
      </dialog>
    );
  }

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: "any" } as Record<string, string>)}
      aria-labelledby={titleId}
      className="m-auto w-[min(92vw,540px)] max-h-[92dvh] overflow-y-auto rounded-2xl border border-amber-400/35 bg-[#0b0b11] p-0 text-white shadow-[0_24px_70px_rgba(0,0,0,0.75)] backdrop:bg-black/70 backdrop:backdrop-blur-xs open:block"
    >
      <div className="relative overflow-hidden">
        {/* Close button */}
        <button
          type="button"
          onClick={closePopup}
          aria-label="Đóng thông báo khuyến mãi"
          className="absolute top-2.5 right-2.5 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white/90 backdrop-blur-sm transition hover:border-amber-300/60 hover:bg-red-600 hover:text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          <X className="h-4.5 w-4.5" aria-hidden="true" />
        </button>

        {/* Top Artwork Hero Banner */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#09090d]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={popup.title || "Chương trình khuyến mãi CitiLap"}
            width={1280}
            height={720}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-transparent"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0b0b11] to-transparent"
          />

          {/* Overlay Headline & Discount Badge */}
          <div className="absolute inset-0 flex flex-col justify-center px-5 sm:px-6 py-4 pr-12">
            {popup.badgeText ? (
              <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-400/45 bg-red-600/25 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-300 backdrop-blur-xs">
                <Flame className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                <span>{popup.badgeText}</span>
              </div>
            ) : null}

            <h1
              id={titleId}
              className="mt-2 text-[26px] sm:text-[32px] font-black uppercase leading-[1.05] tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-red-500 drop-shadow-[0_2px_12px_rgba(220,38,38,0.45)]"
            >
              {popup.title || "BLACK FRIDAY"}
            </h1>

            {popup.highlightText ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-block -skew-x-12 rounded-md bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 px-3 py-0.5 text-base sm:text-lg font-black text-slate-950 shadow-md shadow-amber-500/30">
                  <span className="inline-block skew-x-12">{popup.highlightText}</span>
                </span>
              </div>
            ) : null}

            {popup.description ? (
              <p className="mt-2 max-w-[270px] text-xs sm:text-[13px] font-medium leading-snug text-slate-200/95">
                {popup.description}
              </p>
            ) : null}
          </div>
        </div>

        {/* Body Content */}
        <div className="px-4 sm:px-6 pb-5 pt-2 space-y-3.5">
          {/* Discount Tiers */}
          {tiers.length > 0 ? (
            <div
              className={`grid gap-2 ${
                tiers.length === 1
                  ? "grid-cols-1"
                  : tiers.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-3"
              }`}
            >
              {tiers.map((tier, idx) => (
                <div
                  key={`${tier.label}-${idx}`}
                  className={
                    idx === 0
                      ? "rounded-xl border border-amber-400/35 bg-gradient-to-b from-red-600/25 to-red-950/30 px-2 py-2.5 text-center"
                      : idx === 1
                      ? "rounded-xl border border-red-500/30 bg-white/[0.04] px-2 py-2.5 text-center"
                      : "rounded-xl border border-white/15 bg-white/[0.04] px-2 py-2.5 text-center"
                  }
                >
                  <div
                    className={`text-[10px] font-bold uppercase tracking-wide ${
                      idx === 0 ? "text-amber-200/90" : "text-slate-300"
                    }`}
                  >
                    {tier.label}
                  </div>
                  <div
                    className={`mt-0.5 text-base sm:text-lg font-black ${
                      idx === 0 ? "text-amber-300" : idx === 1 ? "text-white" : "text-slate-100"
                    }`}
                  >
                    {tier.value}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Live Countdown Strip */}
          {hasCountdownTarget ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                <span>{isBeforeStart ? "Bắt đầu săn deal sau:" : "Ưu đãi kết thúc sau:"}</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-xs font-extrabold text-amber-300">
                <span className="rounded bg-black/70 px-1.5 py-0.5 border border-amber-400/25">{cd.days}d</span>
                <span>:</span>
                <span className="rounded bg-black/70 px-1.5 py-0.5 border border-amber-400/25">{cd.hours}h</span>
                <span>:</span>
                <span className="rounded bg-black/70 px-1.5 py-0.5 border border-amber-400/25">{cd.minutes}m</span>
                <span>:</span>
                <span className="rounded bg-black/70 px-1.5 py-0.5 border border-amber-400/25">{cd.seconds}s</span>
              </div>
            </div>
          ) : null}

          {/* Trust micro-line */}
          {popup.trustNote1 || popup.trustNote2 ? (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
              {popup.trustNote1 ? (
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-400" aria-hidden="true" />
                  {popup.trustNote1}
                </span>
              ) : null}
              {popup.trustNote2 ? (
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                  {popup.trustNote2}
                </span>
              ) : null}
            </div>
          ) : null}

          {/* Primary CTA & Dismiss */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-0.5">
            {isExternalCta ? (
              <a
                ref={ctaRef}
                href={ctaHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closePopup}
                className="flex min-h-11 w-full sm:flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-red-600/35 transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                <span>{popup.ctaText || "Xem ưu đãi ngay"}</span>
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </a>
            ) : (
              <Link
                ref={ctaRef}
                href={ctaHref}
                onClick={closePopup}
                className="flex min-h-11 w-full sm:flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-red-600/35 transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                <span>{popup.ctaText || "Xem ưu đãi ngay"}</span>
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Link>
            )}
            {popup.dismissText ? (
              <button
                type="button"
                onClick={closePopup}
                className="min-h-11 w-full sm:w-auto rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white cursor-pointer"
              >
                {popup.dismissText}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </dialog>
  );
}
