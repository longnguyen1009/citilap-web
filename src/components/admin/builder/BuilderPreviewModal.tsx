'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { Eye, Monitor, Smartphone, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { PREVIEW_MESSAGE_TYPE, PREVIEW_READY_TYPE } from '@/components/builder/BuilderPreviewFrame';
import type { ResolvedSectionItem } from '@/server/services/site-builder.service';

export interface BuilderPreviewModalProps {
  open: boolean;
  /** Page being previewed; 'home' also renders Flash Sale + fixed footer blocks like the live homepage. */
  pageId: string;
  viewport: 'desktop' | 'mobile';
  onViewportChange: (viewport: 'desktop' | 'mobile') => void;
  sections: ResolvedSectionItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
}

export default function BuilderPreviewModal({
  open,
  pageId,
  viewport,
  onViewportChange,
  sections,
  loading,
  error,
  onRetry,
  onClose,
}: BuilderPreviewModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const postSections = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: PREVIEW_MESSAGE_TYPE, sections },
      window.location.origin
    );
  }, [sections]);

  // Push sections when they change and when the frame announces it is ready (hydrated).
  useEffect(() => {
    if (!open) return;
    postSections();
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if ((e.data as { type?: string } | null)?.type === PREVIEW_READY_TYPE) postSections();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [open, postSections]);

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      const closeBtn = modalRef.current?.querySelector<HTMLElement>(
        'button[aria-label="Đóng cửa sổ xem trước"]'
      );
      closeBtn?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 sm:p-6"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="h-14 px-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-600" />
            <span id="preview-modal-title" className="text-sm font-bold text-slate-900">
              Xem trước bản dựng
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
              DRAFT PREVIEW
            </span>
          </div>

          {/* Viewport switch */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => onViewportChange('desktop')}
              className={`p-1.5 rounded flex items-center gap-1 text-xs font-semibold cursor-pointer ${
                viewport === 'desktop'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => onViewportChange('mobile')}
              className={`p-1.5 rounded flex items-center gap-1 text-xs font-semibold cursor-pointer ${
                viewport === 'mobile'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mobile (390px)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
            aria-label="Đóng cửa sổ xem trước"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with Renderer or Validation Error */}
        <div className="flex-1 overflow-y-auto bg-slate-200 flex justify-center p-4">
          <div
            className={`bg-white shadow-xl transition-all overflow-y-auto ${
              viewport === 'mobile'
                ? 'w-[406px] shrink-0 self-start rounded-3xl border-8 border-slate-800 overflow-hidden'
                : 'w-full rounded-xl overflow-hidden'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center p-20 text-slate-400 text-sm">
                Đang dựng bản xem trước với dữ liệu thực tế...
              </div>
            ) : error ? (
              <div className="p-8 max-w-xl mx-auto my-8 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-4">
                <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
                <h4 className="text-sm font-bold text-rose-900">
                  Không thể tạo bản xem trước do lỗi dữ liệu
                </h4>
                <p className="text-xs text-rose-700 leading-relaxed break-words">
                  {error}
                </p>
                <div className="pt-2 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Thử lại</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Đóng để kiểm tra khối
                  </button>
                </div>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                key={viewport}
                src={`/builder-preview?page=${encodeURIComponent(pageId)}`}
                title="Xem trước bản nháp"
                onLoad={postSections}
                className={`block w-full border-0 ${viewport === 'mobile' ? 'h-[760px]' : 'h-full min-h-[70vh]'}`}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
