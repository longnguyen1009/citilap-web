"use client";

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from "react";

export interface CartItem {
  id: string; // product id + variant id
  productId: string;
  variantId?: string;
  name: string;
  price: number; // numeric price for calculation
  displayPrice: string;
  image: string;
  variantLabel?: string;
  quantity: number;
  maxQuantity?: number; // available stock
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage after mount (useEffect keeps SSR hydration safe:
  // server and client both start with [] before the saved cart is applied)
  useEffect(() => {
    const savedCart = localStorage.getItem("citilap_cart");
    if (savedCart) {
      try {
        const parsed: unknown = JSON.parse(savedCart);
        const valid = Array.isArray(parsed) ? parsed.filter((item): item is CartItem => {
          if (!item || typeof item !== "object") return false;
          const value = item as Partial<CartItem>;
          return typeof value.id === "string" && typeof value.productId === "string" && typeof value.name === "string" && typeof value.image === "string" && typeof value.price === "number" && Number.isFinite(value.price) && typeof value.quantity === "number" && Number.isInteger(value.quantity) && value.quantity > 0;
        }) : [];
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional post-hydration restore from localStorage
        setCart(valid);
      } catch (e) {
        console.error("Failed to parse cart", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to local storage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("citilap_cart", JSON.stringify(cart));
    }
  }, [cart, isLoaded]);

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const existingItem = prev.find((i) => i.id === item.id);
      if (existingItem) {
        const newQuantity = existingItem.quantity + item.quantity;
        // Check stock limit if maxQuantity is set
        if (existingItem.maxQuantity && newQuantity > existingItem.maxQuantity) {
          return prev;
        }
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: newQuantity } : i
        );
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        // Check stock limit if maxQuantity is set
        if (item.maxQuantity && quantity > item.maxQuantity) {
          return { ...item, quantity: item.maxQuantity };
        }
        return { ...item, quantity };
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = useMemo(() => cart.reduce((total, item) => total + item.quantity, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((total, item) => total + item.price * item.quantity, 0), [cart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
