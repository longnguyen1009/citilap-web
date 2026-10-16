"use client";

import { useState, useEffect, useRef } from "react";
import { Clock } from "lucide-react";

export interface FlashSaleCountdownProps {
  startAt?: string | number | Date | null;
  endAt?: string | number | Date | null;
  className?: string;
  onExpire?: () => void;
}

type CountdownState =
  | { status: "ended" }
  | { status: "upcoming"; msLeft: number }
  | { status: "active"; msLeft: number };

function evaluateCountdown(
  startAt?: string | number | Date | null,
  endAt?: string | number | Date | null
): CountdownState {
  if (!endAt) return { status: "ended" };

  const endMs = new Date(endAt).getTime();
  if (Number.isNaN(endMs)) return { status: "ended" };

  const nowMs = Date.now();
  if (nowMs >= endMs) {
    return { status: "ended" };
  }

  if (startAt) {
    const startMs = new Date(startAt).getTime();
    if (!Number.isNaN(startMs) && nowMs < startMs) {
      return { status: "upcoming", msLeft: Math.max(0, startMs - nowMs) };
    }
  }

  return { status: "active", msLeft: Math.max(0, endMs - nowMs) };
}

export default function FlashSaleCountdown({
  startAt,
  endAt,
  className = "",
  onExpire,
}: FlashSaleCountdownProps) {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<CountdownState>(() => evaluateCountdown(startAt, endAt));
  const expiredRef = useRef(false);

  useEffect(() => {
    setMounted(true);

    const tick = () => {
      const next = evaluateCountdown(startAt, endAt);
      setState(next);

      if (next.status === "ended" && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [startAt, endAt, onExpire]);

  // Server render or unmounted fallback: render calm placeholder to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className={`flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-full border border-gray-200 text-sm text-gray-500 ${className}`}>
        <Clock className="w-4 h-4 text-gray-400" />
        <span>Đang tải thời gian...</span>
      </div>
    );
  }

  if (state.status === "ended") {
    return (
      <div className={`flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-500 ${className}`}>
        <Clock className="w-4 h-4 text-gray-400" />
        <span>Flash sale đã kết thúc</span>
      </div>
    );
  }

  const totalSeconds = Math.floor(state.msLeft / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");

  const label = state.status === "upcoming" ? "Bắt đầu trong:" : "Kết thúc trong:";
  const badgeBg = state.status === "upcoming" ? "bg-amber-600" : "bg-red-600";
  const pulseColor = state.status === "upcoming" ? "text-amber-600" : "text-red-600";

  return (
    <div className={`flex items-center gap-3 bg-white/95 backdrop-blur-xs px-3.5 py-1.5 rounded-full border border-gray-200/80 shadow-xs text-xs sm:text-sm ${className}`}>
      <Clock className="w-4 h-4 text-gray-600 shrink-0" />
      <span className="font-bold text-gray-700 whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-1">
        {days > 0 && (
          <>
            <span className={`${badgeBg} text-white font-bold px-2 py-1 rounded-md shadow-inner text-xs sm:text-sm`}>
              {days}d
            </span>
            <span className={`font-bold ${pulseColor} animate-pulse`}>:</span>
          </>
        )}
        <span className={`${badgeBg} text-white font-bold px-2 py-1 rounded-md shadow-inner text-xs sm:text-sm`}>
          {pad(hours)}
        </span>
        <span className={`font-bold ${pulseColor} animate-pulse`}>:</span>
        <span className={`${badgeBg} text-white font-bold px-2 py-1 rounded-md shadow-inner text-xs sm:text-sm`}>
          {pad(minutes)}
        </span>
        <span className={`font-bold ${pulseColor} animate-pulse`}>:</span>
        <span className={`${badgeBg} text-white font-bold px-2 py-1 rounded-md shadow-inner text-xs sm:text-sm`}>
          {pad(seconds)}
        </span>
      </div>
    </div>
  );
}
