"use client";

import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef, ReactNode } from "react";

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
  available?: boolean;
  unavailableReason?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateItemPrice: (productId: string, variantId: string | null | undefined, newPrice: number) => void;
  revalidateCart: () => Promise<void>;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
  checkoutReady: boolean;
  validationError: string;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [validation, setValidation] = useState({key:'',status:'pending',error:''});
  const requestNumber = useRef(0);
  const cartKey = JSON.stringify(cart.map(i=>[i.id,i.productId,i.variantId || null,i.quantity,i.price]));

  // Load from local storage after mount (useEffect keeps SSR hydration safe:
  // server and client both start with [] before the saved cart is applied)
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("citilap_cart");
      if (savedCart) {
        const parsed: unknown = JSON.parse(savedCart);
        const valid = Array.isArray(parsed) ? parsed.filter((item): item is CartItem => {
          if (!item || typeof item !== "object") return false;
          const value = item as Partial<CartItem>;
          return typeof value.id === "string" && typeof value.productId === "string" && typeof value.name === "string" && typeof value.image === "string" && typeof value.price === "number" && Number.isFinite(value.price) && typeof value.quantity === "number" && Number.isInteger(value.quantity) && value.quantity > 0;
        }) : [];
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional post-hydration restore from localStorage
        setCart(valid);
      }
    } catch (e) {
      console.error("Cart storage unavailable", e);
    }
    setIsLoaded(true);
  }, []);

  // Save to local storage
  useEffect(() => {
    if (isLoaded) {
      try { localStorage.setItem("citilap_cart", JSON.stringify(cart)); }
      catch { /* Keep the live cart usable when browser storage is blocked. */ }
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

  const updateItemPrice = (productId: string, variantId: string | null | undefined, newPrice: number) => {
    setCart((prev) =>
      prev.map((item) => {
        const matches =
          item.productId === productId &&
          (item.variantId || null) === (variantId || null);
        if (matches) {
          return {
            ...item,
            price: newPrice,
            displayPrice: new Intl.NumberFormat('vi-VN').format(newPrice) + '₫',
          };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const revalidateCart = useCallback(async () => {
    if (!isLoaded || cart.length === 0) return;
    const number = ++requestNumber.current;
    setValidation({key:cartKey,status:'pending',error:''});
    try {
      const res = await fetch("/api/cart/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({
            id: i.id,
            productId: i.productId,
            variantId: i.variantId || null,
            expectedPrice: i.price,
          })),
        }),
      });
      if (!res.ok) throw new Error('CART_REVALIDATION_FAILED');
      if (number !== requestNumber.current) return;
      {
        const data = (await res.json()) as {
          success: boolean;
          items: Array<{ id: string; price?: number; available: boolean; unavailableReason?: string }>;
        };
        if (data.success && Array.isArray(data.items)) {
          if (data.items.length !== cart.length || cart.some(i=>!data.items.some(s=>s.id===i.id))) throw new Error('INVALID_CART_RESPONSE');
          if (data.items.some(s=>typeof s.available!=='boolean' || (s.available && (!Number.isSafeInteger(s.price) || s.price!<0)))) throw new Error('INVALID_CART_RESPONSE');
          if (number !== requestNumber.current) return;
          setCart((prev) => {
            if (JSON.stringify(prev.map(i=>[i.id,i.productId,i.variantId || null,i.quantity,i.price])) !== cartKey) return prev;
            const next = prev.map((item) => {
              const serverItem = data.items.find((s) => s.id === item.id);
              if (serverItem) {
                return {
                  ...item,
                  available: serverItem.available,
                  unavailableReason: serverItem.available ? undefined : serverItem.unavailableReason || 'PRODUCT_NOT_AVAILABLE',
                  price: serverItem.available ? serverItem.price! : item.price,
                  displayPrice: serverItem.available ? new Intl.NumberFormat("vi-VN").format(serverItem.price!) + "₫" : item.displayPrice,
                };
              }
              return item;
            });
            return JSON.stringify(next)===JSON.stringify(prev) ? prev : next;
          });
          setValidation({key:cartKey,status:'ready',error:''});
        } else throw new Error('INVALID_CART_RESPONSE');
      }
    } catch {
      if (number === requestNumber.current) setValidation({key:cartKey,status:'error',error:'Chưa thể xác thực giỏ hàng. Giữ nguyên sản phẩm; vui lòng thử lại.'});
    }
  }, [cart, cartKey, isLoaded]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- network synchronization after hydration/cart changes, including pending state
  useEffect(() => { void revalidateCart(); }, [revalidateCart]);
  const checkoutReady = isLoaded && cart.length > 0 && validation.key===cartKey && validation.status==='ready' && cart.every(i=>i.available===true);
  const validationError = validation.key===cartKey ? validation.error : '';

  const cartCount = useMemo(() => cart.reduce((total, item) => total + item.quantity, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((total, item) => total + item.price * item.quantity, 0), [cart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateItemPrice,
        revalidateCart,
        clearCart,
        cartCount,
        cartTotal,
        checkoutReady,
        validationError,
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
