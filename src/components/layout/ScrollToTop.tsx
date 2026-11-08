"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function ScrollToTop({ inline = false }: { inline?: boolean }) {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when page is scrolled down
  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 300);
    };
    const raf = requestAnimationFrame(toggleVisibility);
    window.addEventListener("scroll", toggleVisibility, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  // Scroll to top respecting prefers-reduced-motion
  const scrollToTop = () => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className={`${
        inline
          ? "relative"
          : "fixed bottom-20 right-3.5 md:bottom-8 md:right-4 z-30"
      } w-11 h-11 flex items-center justify-center bg-slate-900/90 hover:bg-slate-950 text-white rounded-full shadow-lg backdrop-blur-md border border-slate-700/60 transition-all hover:scale-105 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 cursor-pointer`}
      aria-label="Cuộn lên đầu trang"
      title="Cuộn lên đầu trang"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
