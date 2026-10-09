"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export default function FlashSaleCountdown({ endAt }: { endAt?: string | number | Date }) {
  const target = endAt ? new Date(endAt).getTime() : 0;
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!target) return;
    const update = () => setTimeLeft(Math.max(0, target - Date.now()));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [target]);

  if (!target || timeLeft <= 0) return <span className="text-sm font-bold text-gray-500">Flash sale đã kết thúc</span>;
  const totalSeconds = Math.floor(timeLeft / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
      <Clock className="w-5 h-5 text-gray-600" />
      <span className="font-bold text-gray-600">Kết thúc trong:</span>
      <div className="flex gap-2">
        <span className="bg-red-600 text-white font-bold px-3 py-1.5 rounded-md shadow-inner">{pad(hours)}</span>
        <span className="font-bold pt-1 text-red-600 animate-pulse">:</span>
        <span className="bg-red-600 text-white font-bold px-3 py-1.5 rounded-md shadow-inner">{pad(minutes)}</span>
        <span className="font-bold pt-1 text-red-600 animate-pulse">:</span>
        <span className="bg-red-600 text-white font-bold px-3 py-1.5 rounded-md shadow-inner">{pad(seconds)}</span>
      </div>
    </div>
  );
}
