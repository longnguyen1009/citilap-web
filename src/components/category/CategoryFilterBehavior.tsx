"use client";

import { useEffect } from "react";

// Navigation and form submissions stay native; enhance only dropdown dismissal.
export default function CategoryFilterBehavior() {
  useEffect(() => {
    const open = () => document.querySelector<HTMLDetailsElement>('details[data-category-filter][open]');
    const outside = (event: PointerEvent) => {
      const details = open();
      if (details && event.target instanceof Node && !details.contains(event.target)) details.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      const details = open();
      if (event.key === "Escape" && details) {
        details.open = false;
        details.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    const scroll = (event: MouseEvent) => {
      const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[data-category-scroll]') : null;
      const rail = button && document.getElementById(button.getAttribute('aria-controls') || '');
      if (rail) rail.scrollBy({ left: Number(button!.dataset.categoryScroll) * rail.clientWidth * 0.8, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    };
    document.addEventListener("click", scroll);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("click", scroll);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  return null;
}
