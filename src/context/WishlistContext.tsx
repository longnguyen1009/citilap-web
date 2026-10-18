"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { wishlistIds, MAX_WISHLIST_PRODUCTS } from '@/contracts/catalog/wishlist';

type WishlistItem = {
  productId: string;
};

type WishlistContextType = {
  wishlist: WishlistItem[];
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  wishlistCount: number;
  storageError: boolean;
  loaded: boolean;
};

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("citilap-wishlist");
      if (stored) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restore persisted client state after hydration
        setWishlist(wishlistIds(JSON.parse(stored)).map(productId => ({productId})));
      }
    } catch { setStorageError(true); }
    setLoaded(true);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem("citilap-wishlist", JSON.stringify({version:1, ids:wishlist.map(item=>item.productId)}));
      } catch {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- report blocked storage without losing session edits
        setStorageError(true);
      }
    }
  }, [wishlist, loaded]);

  const addToWishlist = useCallback((item: WishlistItem) => {
    setWishlist((prev) => {
      if (prev.some((w) => w.productId === item.productId)) return prev;
      if (!wishlistIds([item.productId]).length || prev.length >= MAX_WISHLIST_PRODUCTS) return prev;
      return [...prev, {productId:item.productId}];
    });
  }, []);

  const removeFromWishlist = useCallback((productId: string) => {
    setWishlist((prev) => prev.filter((w) => w.productId !== productId));
  }, []);

  const isInWishlist = useCallback((productId: string) => {
    return wishlist.some((w) => w.productId === productId);
  }, [wishlist]);

  return (
    <WishlistContext.Provider value={{
      wishlist,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      wishlistCount: wishlist.length,
      storageError,
      loaded,
    }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
