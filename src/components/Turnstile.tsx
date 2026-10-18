'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};

function Challenge({ action, onToken }: { action: string; onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const api = (window as Window & { turnstile?: TurnstileApi }).turnstile;
    if (!ready || !api || !container.current) return;
    const id = api.render(container.current, {
      sitekey: siteKey, action, size: 'flexible',
      callback: (token: string) => { setFailed(false); onToken(token); },
      'expired-callback': () => onToken(''),
      'error-callback': () => { onToken(''); setFailed(true); },
    });
    return () => api.remove(id);
  }, [ready, action, onToken]);
  return <div className="my-3 min-h-[65px]">
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={() => setReady(true)} onError={() => setFailed(true)} />
    <div ref={container} />
    {failed && <p role="alert">Không thể tải xác thực bảo mật. Kiểm tra kết nối rồi tải lại trang.</p>}
  </div>;
}

export function useTurnstile(action: 'order' | 'contact') {
  const [token, setToken] = useState('');
  const [generation, setGeneration] = useState(0);
  return {
    token,
    ready: !siteKey || !!token,
    reset: () => { setToken(''); setGeneration(value => value + 1); },
    widget: siteKey ? <Challenge key={generation} action={action} onToken={setToken} /> : null,
  };
}
