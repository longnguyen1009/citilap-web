"use client";

import { useEffect } from "react";

// Navigation and form submissions stay native; enhance only dropdown dismissal.
export default function CategoryFilterBehavior() {
  useEffect(() => {
    const hasOpenDialog = () => Boolean(document.querySelector("dialog[open]"));
    const openPopover = () =>
      document.querySelector<HTMLDetailsElement>('details[data-category-filter][open]:not([data-inflow="true"])');

    const outside = (event: PointerEvent) => {
      if (hasOpenDialog()) return;
      const details = openPopover();
      if (details && event.target instanceof Node && !details.contains(event.target)) {
        details.open = false;
      }
    };

    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || hasOpenDialog()) return;
      const target = event.target instanceof Element ? event.target : document.activeElement;
      const focusedInflow =
        target instanceof Element
          ? target.closest<HTMLDetailsElement>('details[data-category-filter][data-inflow="true"][open]')
          : null;
      if (focusedInflow) {
        const summary = focusedInflow.querySelector<HTMLElement>("summary");
        if (target !== summary) {
          event.stopPropagation();
          focusedInflow.open = false;
          summary?.focus();
        }
        return;
      }
      const details = openPopover();
      if (details) {
        details.open = false;
        details.querySelector<HTMLElement>("summary")?.focus();
      }
    };

    const scroll = (event: MouseEvent) => {
      const button =
        event.target instanceof Element
          ? event.target.closest<HTMLButtonElement>("button[data-category-scroll]")
          : null;
      const rail = button && document.getElementById(button.getAttribute("aria-controls") || "");
      if (rail) {
        rail.scrollBy({
          left: Number(button!.dataset.categoryScroll) * rail.clientWidth * 0.8,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        });
      }
    };

    document.addEventListener("pointerdown", outside);
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
