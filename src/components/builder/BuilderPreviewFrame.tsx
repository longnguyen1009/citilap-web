'use client';

import React, { useEffect, useState, type ReactNode } from 'react';
import BlockRenderer from '@/components/builder/BlockRenderer';
import { WishlistProvider } from '@/context/WishlistContext';
import { CompareProvider } from '@/context/CompareContext';
import type { ResolvedSectionItem } from '@/server/services/site-builder.service';
import type { PublicStorefrontSettings } from '@/contracts/cms/settings';

export const PREVIEW_MESSAGE_TYPE = 'builder-preview:sections';
export const PREVIEW_READY_TYPE = 'builder-preview:ready';

export default function BuilderPreviewFrame({
  settings,
  flashSale,
  footer,
}: {
  settings: PublicStorefrontSettings | null;
  flashSale?: ReactNode;
  footer?: ReactNode;
}) {
  const [sections, setSections] = useState<ResolvedSectionItem[] | null>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const msg = e.data as { type?: string; sections?: ResolvedSectionItem[] } | null;
      if (msg?.type === PREVIEW_MESSAGE_TYPE && Array.isArray(msg.sections)) {
        setSections(msg.sections);
      }
    };
    window.addEventListener('message', onMessage);
    window.parent?.postMessage({ type: PREVIEW_READY_TYPE }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (!sections) {
    return (
      <div className="flex items-center justify-center p-20 text-slate-400 text-sm">
        Đang chờ dữ liệu bản nháp...
      </div>
    );
  }

  return (
    <WishlistProvider>
      <CompareProvider>
        <BlockRenderer sections={sections} settings={settings} flashSale={flashSale} />
        {footer}
      </CompareProvider>
    </WishlistProvider>
  );
}
