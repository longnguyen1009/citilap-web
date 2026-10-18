'use client';
import { useCart } from '@/context/CartContext';
import { useEffect, useEffectEvent } from 'react';

export default function CartValidationStatus() {
  const {cart, checkoutReady, validationError, revalidateCart} = useCart();
  const validateOnEntry = useEffectEvent(() => { void revalidateCart(); });
  useEffect(() => { validateOnEntry(); }, []);
  if (checkoutReady || !cart.length) return null;
  const unavailable = cart.filter(i=>i.available===false);
  if (!validationError && unavailable.length === 0) return null;
  return <div role="status" className="rounded border border-amber-300 bg-amber-50 p-3 mb-4 text-amber-950">
    <p>{validationError || 'Sản phẩm chưa thể đặt hàng. Xóa sản phẩm hoặc thử kiểm tra lại.'}</p>
    {unavailable.map(i=><p key={i.id}>{i.name}: {i.unavailableReason || 'Tạm ngừng nhận đơn'}</p>)}
    <button type="button" className="underline font-semibold mt-2" onClick={()=>void revalidateCart()}>Kiểm tra lại</button>
  </div>;
}
