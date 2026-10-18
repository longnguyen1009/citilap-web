'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { trackStorefront } from '@/lib/storefront-metrics';

export default function StorefrontMetrics() {
  const pathname = usePathname();
  const previous = useRef('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    trackStorefront('page_view');
    if (pathname.startsWith('/product/')) trackStorefront('view_item');
    if (pathname === '/checkout') trackStorefront('begin_checkout');
  }, [pathname]);
  useEffect(() => {
    const click = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a') : null;
      const href = link?.getAttribute('href') || '';
      if (href.startsWith('tel:') || href.startsWith('https://zalo.me/')) trackStorefront('contact_click');
    };
    document.addEventListener('click', click);
    return () => document.removeEventListener('click', click);
  }, []);
  function choose(value: 'yes' | 'no') {
    try { localStorage.setItem('citilap_metrics_consent', value); setMessage(value === 'yes' ? 'Đã bật thống kê tổng hợp.' : 'Đã tắt thống kê.'); }
    catch { setMessage('Trình duyệt không lưu được lựa chọn; thống kê vẫn tắt.'); }
  }
  return <div className="border-t border-slate-700 bg-slate-900 px-4 py-3 text-center text-xs text-slate-300">
    <p>Thống kê tùy chọn giúp cải thiện chọn máy và đặt hàng. Chỉ đếm thao tác, không gửi nội dung tìm kiếm hoặc thông tin liên hệ. Mặc định tắt.</p>
    <div className="mt-2 flex justify-center gap-4"><button onClick={() => choose('yes')} className="underline">Cho phép thống kê</button><button onClick={() => choose('no')} className="underline">Tắt thống kê</button></div>
    <p role="status">{message}</p>
  </div>;
}
