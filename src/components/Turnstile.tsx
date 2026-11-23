'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

const ENV_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
// Matches wrangler.jsonc vars for production & staging when Vite client build doesn't have .env
const FALLBACK_CLOUDFLARE_SITE_KEY = '0x4AAAAAAFZsbdPpsQAHD2eQ';

function resolveClientSiteKey(): string | undefined {
  if (ENV_SITE_KEY) return ENV_SITE_KEY;
  if (typeof window !== 'undefined' && !/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
    return FALLBACK_CLOUDFLARE_SITE_KEY;
  }
  return undefined;
}

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};

function Challenge({ siteKey, action, onToken }: { siteKey: string; action: string; onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(() => typeof window !== 'undefined' && Boolean((window as Window & { turnstile?: TurnstileApi }).turnstile));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (ready) return;
    if ((window as Window & { turnstile?: TurnstileApi }).turnstile) {
      setReady(true);
      return;
    }
    const interval = window.setInterval(() => {
      if ((window as Window & { turnstile?: TurnstileApi }).turnstile) {
        setReady(true);
        window.clearInterval(interval);
      }
    }, 200);
    return () => window.clearInterval(interval);
  }, [ready]);

  useEffect(() => {
    const api = (window as Window & { turnstile?: TurnstileApi }).turnstile;
    if (!ready || !api || !container.current) return;
    const id = api.render(container.current, {
      sitekey: siteKey,
      action,
      size: 'flexible',
      callback: (token: string) => { setFailed(false); onToken(token); },
      'expired-callback': () => onToken(''),
      'error-callback': () => { onToken(''); setFailed(true); },
    });
    return () => {
      try { api.remove(id); } catch {}
    };
  }, [ready, siteKey, action, onToken]);

  return (
    <div className="my-3 min-h-[65px]">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={() => setFailed(true)}
      />
      <div ref={container} />
      {failed && (
        <p role="alert" className="text-xs text-rose-700 mt-1">
          Không thể tải xác thực bảo mật. Kiểm tra kết nối rồi tải lại trang.
        </p>
      )}
    </div>
  );
}

export function useTurnstile(action: 'order' | 'contact') {
  const [token, setToken] = useState('');
  const [generation, setGeneration] = useState(0);
  const [siteKey, setSiteKey] = useState<string | undefined>(ENV_SITE_KEY);

  useEffect(() => {
    const resolved = resolveClientSiteKey();
    if (resolved && resolved !== siteKey) {
      setSiteKey(resolved);
    }
  }, [siteKey]);

  return {
    token,
    ready: !siteKey || !!token,
    reset: () => { setToken(''); setGeneration(value => value + 1); },
    widget: siteKey ? <Challenge key={`${siteKey}-${generation}`} siteKey={siteKey} action={action} onToken={setToken} /> : null,
  };
}
