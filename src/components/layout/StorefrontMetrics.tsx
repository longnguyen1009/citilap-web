'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackStorefront } from '@/lib/storefront-metrics';

export default function StorefrontMetrics() {
  const pathname = usePathname();
  const previous = useRef('');
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    trackStorefront('page_view');
    if (/^\/(?:laptop|phu-kien|san-pham)\/[^/]+$/.test(pathname)) trackStorefront('view_item');
    if (pathname === '/checkout') trackStorefront('begin_checkout');
  }, [pathname]);
  useEffect(() => {
    const click = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a') : null;
      const href = link?.getAttribute('href') || '';
      if (
        href.startsWith('tel:') ||
        href.startsWith('https://zalo.me/') ||
        href.startsWith('https://m.me/') ||
        href.startsWith('https://www.messenger.com/')
      ) {
        trackStorefront('contact_click');
      }
    };
    document.addEventListener('click', click);
    return () => document.removeEventListener('click', click);
  }, []);
  return null;
}
