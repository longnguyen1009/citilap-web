'use client';

import React, { useEffect, useRef } from 'react';
import { History, X, AlertTriangle, RefreshCw } from 'lucide-react';
import type { RevisionItem } from './builder-defaults';

export interface BuilderRevisionsModalProps {
  open: boolean;
  revisions: RevisionItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onRestore: (revision: number) => void;
  onClose: () => void;
}

export default function BuilderRevisionsModal({
  open,
  revisions,
  loading,
  error,
  onRetry,
  onRestore,
  onClose,
}: BuilderRevisionsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      const closeBtn = modalRef.current?.querySelector<HTMLElement>(
        'button[aria-label="Đóng lịch sử phiên bản"]'
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
      aria-labelledby="revisions-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <h3 id="revisions-modal-title" className="text-sm font-bold text-slate-900">
              Lịch sử các phiên bản
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
            aria-label="Đóng lịch sử phiên bản"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <p className="text-center text-slate-400 text-xs py-8">Đang tải lịch sử...</p>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-center space-y-3 my-2">
              <AlertTriangle className="w-6 h-6 text-rose-600 mx-auto" />
              <div className="text-xs font-semibold text-rose-900">
                Không thể tải lịch sử phiên bản
              </div>
              <p className="text-xs text-rose-700">{error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          ) : revisions.length === 0 ? (
            <p className="text-center text-slate-400 text-xs py-8">Chưa có lịch sử phiên bản nào.</p>
          ) : (
            revisions.map((rev) => (
              <div
                key={rev.id}
                className="p-3 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Phiên bản r{rev.revision}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 uppercase">
                      {rev.action}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(rev.createdAt).toLocaleString('vi-VN')} • Bởi {rev.actor}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRestore(rev.revision)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Khôi phục
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
