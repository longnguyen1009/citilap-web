"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWishlist } from '@/context/WishlistContext';
import ProductCard from '@/components/product/ProductCard';
import type { HomepageProduct } from '@/server/services/catalog.service';

export default function WishlistPage() {
  const {wishlist, removeFromWishlist, storageError, loaded} = useWishlist();
  const [result,setResult] = useState<{ids:string;products:HomepageProduct[];unavailableIds:string[]}|null>(null);
  const [error,setError] = useState('');
  const [retry,setRetry] = useState(0);
  const ids = wishlist.map(item=>item.productId).join(',');
  useEffect(()=>{
    if (!loaded || !ids) return;
    const controller = new AbortController();
    const refresh = async()=>{
      try {
        const response = await fetch('/api/wishlist?ids='+encodeURIComponent(ids), {cache:'no-store',signal:controller.signal});
        if (!response.ok) throw new Error('Không thể tải giá hiện tại. Thử lại để xem danh sách.');
        const data = await response.json();
        if (!controller.signal.aborted) {setResult({...data,ids});setError('');}
      } catch (err) {
        if (!controller.signal.aborted) setError((err as Error).message);
      }
    };
    void refresh();
    window.addEventListener('focus',refresh);
    window.addEventListener('citilap:price-refresh',refresh);
    const timer=setInterval(refresh,30000);
    return ()=>{controller.abort();window.removeEventListener('focus',refresh);window.removeEventListener('citilap:price-refresh',refresh);clearInterval(timer);};
  },[ids,loaded,retry]);
  return <main className="container mx-auto max-w-[1370px] px-4 py-8 space-y-6">
    <div className="border-b border-border-default pb-4">
      <h1 className="text-2xl font-bold text-gray-900">Danh sách yêu thích ({wishlist.length})</h1>
      <p className="text-sm text-gray-600 mt-1">Lưu trên thiết bị này, tối đa 100 sản phẩm. Mở sản phẩm để chọn cấu hình và kiểm tra khả dụng trước khi đặt.</p>
    </div>
    {storageError && <p role="status" className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">Trình duyệt không cho lưu trên thiết bị. Danh sách chỉ được giữ trong phiên này.</p>}
    {!loaded ? <p role="status" className="text-gray-500 py-12 text-center">Đang tải danh sách…</p> : !ids ? <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-md mx-auto shadow-2xs"><p className="text-gray-600">Chưa có sản phẩm yêu thích. <Link href="/search" className="underline font-bold text-blue-600 hover:text-blue-700">Khám phá sản phẩm</Link></p></div> : error ?
      <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">{error} <button onClick={()=>{setError('');setRetry(v=>v+1);}} className="underline font-bold text-red-800 hover:text-red-900 ml-3 cursor-pointer">Thử lại</button></div> : result?.ids !== ids ? <p role="status" className="text-gray-500 py-12 text-center">Đang tải giá hiện tại…</p> : <>
        {result.unavailableIds.map(id=><div key={id} role="status" className="p-3 bg-gray-100 rounded-lg text-sm text-gray-600 flex items-center justify-between">Một sản phẩm đã lưu không còn công khai. <button onClick={()=>removeFromWishlist(id)} className="underline text-red-600 font-medium cursor-pointer">Bỏ khỏi danh sách</button></div>)}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{result.products.map(product=><ProductCard key={product.id} product={product}/>)}</div>
      </>}
  </main>;
}
