"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export default function FlashSaleCountdown() {
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 45, seconds: 18 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
      <Clock className="w-5 h-5 text-gray-600" />
      <span className="font-bold text-gray-600">Kết thúc trong:</span>
      <div className="flex gap-2">
        <span className="bg-red-600 text-white font-bold px-3 py-1.5 rounded-md shadow-inner">{pad(timeLeft.hours)}</span>
        <span className="font-bold pt-1 text-red-600 animate-pulse">:</span>
        <span className="bg-red-600 text-white font-bold px-3 py-1.5 rounded-md shadow-inner">{pad(timeLeft.minutes)}</span>
        <span className="font-bold pt-1 text-red-600 animate-pulse">:</span>
        <span className="bg-red-600 text-white font-bold px-3 py-1.5 rounded-md shadow-inner">{pad(timeLeft.seconds)}</span>
      </div>
    </div>
  );
}
