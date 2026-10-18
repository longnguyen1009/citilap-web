'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {useCart} from '@/context/CartContext';
import {PriceTag} from '@/components/ui/PriceTag';
import {StockBadge} from '@/components/ui/StockBadge';
import {conditionLabels} from '@/contracts/cms/product-studio';
import type {ProductDetailVariant} from '@/server/services/catalog.service';
import {businessProfile} from '@/config/business-profile';
import ProductVariantSelector from './ProductVariantSelector';

interface ProductPurchaseSectionProps {
  productId:string;
  productName:string;
  productSlug:string;
  productImage:string;
  initialCondition:string;
  initialWarranty?:string|null;
  basePrice:number;
  baseOriginalPrice:number|null;
  baseStock:number;
  variants:ProductDetailVariant[];
  selectedVariantId:string|null;
  phone?:string;
}

export default function ProductPurchaseSection({productId,productName,productSlug,productImage,initialCondition,initialWarranty,basePrice,baseOriginalPrice,baseStock,variants,selectedVariantId,phone=businessProfile.displayPhone}:ProductPurchaseSectionProps) {
  const router=useRouter();
  const {addToCart}=useCart();
  const [quantity,setQuantity]=useState(1),[message,setMessage]=useState('');
  const variant=variants.find(v=>v.id===selectedVariantId);
  const price=variant?.price ?? basePrice,originalPrice=variant ? variant.originalPrice : baseOriginalPrice;
  const stock=variant?.stock ?? baseStock;
  const canOrder=stock>0 && (!variants.length || !!variant);
  const actualQuantity=Math.min(quantity,Math.max(1,stock));
  const add=()=>{
    if(!canOrder) return;
    addToCart({id:`${productId}-${variant?.id || 'base'}`,productId,variantId:variant?.id,name:productName,
      image:variant?.image || productImage || '/images/placeholder-laptop.svg',price,displayPrice:price.toLocaleString('vi-VN')+'đ',
      variantLabel:variant?.name,quantity:actualQuantity,maxQuantity:stock});
    setMessage('Đã thêm vào giỏ. Giá và khả dụng được kiểm tra lại trước khi đặt hàng.');
  };
  return <section className="space-y-5">
    <p className="text-sm font-semibold">Tình trạng: {conditionLabels[initialCondition as keyof typeof conditionLabels] || initialCondition}</p>
    <ProductVariantSelector variants={variants} selectedVariantId={selectedVariantId} productSlug={productSlug}/>
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
      <PriceTag price={price} originalPrice={originalPrice} size="xl"/>
      <StockBadge stock={stock}/>
      {initialWarranty && <p className="text-sm">Bảo hành: {initialWarranty}</p>}
      <Link href="/chinh-sach-bao-hanh" className="text-sm text-blue-600 underline">Chính sách bảo hành</Link>
    </div>
    <label className="flex items-center gap-3 text-sm font-semibold">Số lượng
      <input aria-label="Số lượng" type="number" min={1} max={Math.max(1,stock)} value={actualQuantity} disabled={!canOrder}
        onChange={e=>setQuantity(Math.max(1,Math.min(Math.max(1,stock),Math.floor(Number(e.target.value)||1))))} className="w-20 rounded-lg border p-2"/>
    </label>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <button type="button" disabled={!canOrder} onClick={add} className="rounded-xl border-2 border-blue-600 p-3 font-bold text-blue-700 disabled:opacity-50">Thêm vào giỏ</button>
      <button type="button" disabled={!canOrder} onClick={()=>{if(canOrder){add();router.push('/cart');}}} className="rounded-xl bg-blue-600 p-3 font-bold text-white disabled:opacity-50">Mua ngay</button>
    </div>
    {!canOrder && <p role="status">Cấu hình này hiện chưa nhận đặt hàng. Liên hệ cửa hàng để được hỗ trợ.</p>}
    <p role="status" aria-live="polite">{message}</p>
    <a href={'tel:'+phone.replace(/\s+/g,'')} className="block rounded-xl border p-3 text-center font-semibold text-blue-700">Hotline: {phone}</a>
  </section>;
}
