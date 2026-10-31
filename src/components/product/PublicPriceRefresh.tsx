'use client';

import {useEffect} from 'react';
import {usePathname,useRouter} from 'next/navigation';

export default function PublicPriceRefresh({nextChange,serverTime,version}:{nextChange:number|null;serverTime:number;version:string}) {
  const router=useRouter(),pathname=usePathname();
  useEffect(()=>{
    if (/^\/(checkout|cart|profile|order-tracking)(\/|$)/.test(pathname)) return;
    const controller = new AbortController();
    let token = version, pending = false, lastCheck = 0;
    let boundary: ReturnType<typeof setTimeout> | undefined;
    const schedule = (next: number | null, now: number) => {
      clearTimeout(boundary);
      if (next !== null) boundary = setTimeout(() => void check(true), Math.max(100, Math.min(next-now+100,2147483647)));
    };
    const check = async (force = false) => {
      if (pending || document.visibilityState !== 'visible' || !navigator.onLine || (!force && Date.now()-lastCheck < 15000)) return;
      pending = true;
      lastCheck = Date.now();
      try {
        const response = await fetch('/api/catalog-version', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) return;
        const state = await response.json();
        if (controller.signal.aborted || typeof state.token !== 'string' || !Number.isFinite(state.serverTime) || (state.nextChange !== null && !Number.isFinite(state.nextChange))) return;
        schedule(state.nextChange, state.serverTime);
        // Empty token = server could not read catalog state at render time; adopt without refreshing.
        if (!token) { token = state.token; return; }
        if (state.token !== token) {
          token = state.token;
          router.refresh();
          window.dispatchEvent(new Event('citilap:price-refresh'));
        }
      } catch { /* Keep the page usable offline; retry on the next check. */ }
      finally { pending = false; }
    };
    const wake = () => void check();
    const interval = setInterval(wake, 60000);
    schedule(nextChange, serverTime);
    window.addEventListener('focus',wake);
    window.addEventListener('online',wake);
    document.addEventListener('visibilitychange',wake);
    return()=>{controller.abort();clearInterval(interval);clearTimeout(boundary);window.removeEventListener('focus',wake);window.removeEventListener('online',wake);document.removeEventListener('visibilitychange',wake);};
  },[pathname,router,nextChange,serverTime,version]);
  return null;
}
