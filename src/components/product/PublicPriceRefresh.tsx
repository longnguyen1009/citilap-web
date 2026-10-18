'use client';

import {useEffect} from 'react';
import {usePathname,useRouter} from 'next/navigation';

export default function PublicPriceRefresh({nextChange,serverTime}:{nextChange:number|null;serverTime:number}) {
  const router=useRouter(),pathname=usePathname();
  useEffect(()=>{
    if (/^\/(checkout|cart|profile|order-tracking)(\/|$)/.test(pathname)) return;
    const refresh=()=>{
      if(document.visibilityState==='visible') {
        // Keep the current page usable when an offline RSC refresh would navigate to an error page.
        if (navigator.onLine) router.refresh();
        window.dispatchEvent(new Event('citilap:price-refresh'));
      }
    };
    const interval=setInterval(refresh,30000);
    const boundary=nextChange===null?undefined:setTimeout(refresh,Math.max(100,Math.min(nextChange-serverTime+100,2147483647)));
    window.addEventListener('focus',refresh);
    window.addEventListener('online',refresh);
    document.addEventListener('visibilitychange',refresh);
    return()=>{clearInterval(interval);clearTimeout(boundary);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[pathname,router,nextChange,serverTime]);
  return null;
}
