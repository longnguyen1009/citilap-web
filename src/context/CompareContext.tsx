"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { MAX_COMPARE_PRODUCTS } from "@/contracts/catalog/compare";
import { trackStorefront } from '@/lib/storefront-metrics';

export interface CompareItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  image?: string | null;
  kind?: string; // "LAPTOP" | "ACCESSORY"
  template?: string; // e.g. "LAPTOP", "MOUSE", "KEYBOARD"
}

interface CompareContextType {
  items: CompareItem[];
  isCompareOpen: boolean;
  compareNotice: string | null;
  addToCompare: (item: CompareItem) => { success: boolean; message?: string };
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
  isInCompare: (id: string) => boolean;
  openCompare: () => void;
  closeCompare: () => void;
  clearCompareNotice: () => void;
}

const CompareContext = createContext<CompareContextType | null>(null);

const STORAGE_KEY = "citilap_compare_items_v2";

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareNotice, setCompareNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!compareNotice) return;
    const timer = setTimeout(() => setCompareNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [compareNotice]);

  // Safely restore items from sessionStorage after hydration
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional post-hydration restore from sessionStorage
          setItems(parsed.slice(0, MAX_COMPARE_PRODUCTS));
        }
      }
    } catch {
      // Ignore
    }
    setHasHydrated(true);
  }, []);

  // Save minimal representation to sessionStorage only after hydration
  useEffect(() => {
    if (!hasHydrated) return;
    try {
      if (items.length > 0) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  }, [items, hasHydrated]);

  const isInCompare = useCallback(
    (id: string) => items.some((item) => item.id === id),
    [items]
  );

  const addToCompare = useCallback(
    (item: CompareItem): { success: boolean; message?: string } => {
      if (items.some((i) => i.id === item.id)) {
        return { success: false, message: "Sản phẩm đã có trong danh sách so sánh." };
      }

      if (items.length >= MAX_COMPARE_PRODUCTS) {
        const message = `Chỉ có thể so sánh tối đa ${MAX_COMPARE_PRODUCTS} sản phẩm cùng lúc. Vui lòng xóa bớt 1 sản phẩm trên thanh so sánh.`;
        setCompareNotice(message);
        return {
          success: false,
          message,
        };
      }

      setCompareNotice(null);
      // The compare API validates public product groups; stored client metadata can be stale.
      setItems((prev) => [...prev, item]);
      return { success: true };
    },
    [items]
  );

  const removeFromCompare = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setCompareNotice(null);
  }, []);

  const clearCompare = useCallback(() => {
    setItems([]);
    setIsCompareOpen(false);
    setCompareNotice(null);
  }, []);

  const clearCompareNotice = useCallback(() => {
    setCompareNotice(null);
  }, []);

  const openCompare = useCallback(() => {
    if (items.length > 0) { setIsCompareOpen(true); trackStorefront('compare'); }
  }, [items.length]);

  const closeCompare = useCallback(() => {
    setIsCompareOpen(false);
  }, []);

  return (
    <CompareContext.Provider
      value={{
        items,
        isCompareOpen,
        compareNotice,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isInCompare,
        openCompare,
        closeCompare,
        clearCompareNotice,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error("useCompare must be used within a CompareProvider");
  }
  return context;
}

export function useOptionalCompare() {
  return useContext(CompareContext);
}
