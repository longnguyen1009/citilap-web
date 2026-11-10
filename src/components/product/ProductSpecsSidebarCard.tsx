'use client';

import { useEffect, useRef } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';

export interface SpecRow {
  label: string;
  value: string;
}

interface ProductSpecsSidebarCardProps {
  productName: string;
  specs: SpecRow[];
  sku?: string;
  warrantyMonths?: number;
  warrantyText?: string | null;
}

function isValidSpecValue(val?: string | null): boolean {
  if (!val) return false;
  const t = val.trim();
  if (!t) return false;
  return !/^(n\/a|đang cập nhật|chưa cập nhật|null|undefined|-|—)$/i.test(t);
}

export function ProductSpecsSidebarCard({
  productName,
  specs,
  sku,
  warrantyMonths = 6,
  warrantyText,
}: ProductSpecsSidebarCardProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const openModal = () => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) {
      dialog.showModal();
    }
  };

  const closeModal = () => {
    const dialog = dialogRef.current;
    if (dialog?.open) {
      dialog.close();
    }
  };

  useEffect(() => {
    const handleOpenEvent = () => openModal();
    window.addEventListener('citilap:open-full-specs', handleOpenEvent);
    return () => {
      window.removeEventListener('citilap:open-full-specs', handleOpenEvent);
    };
  }, []);

  const validSpecs = (specs || []).filter(
    (s) => s.label && s.label.trim() && isValidSpecValue(s.value)
  );

  if (validSpecs.length === 0) return null;

  // Build extended full specs list for the modal so it includes complete technical details
  const hasWarrantyRow = validSpecs.some((s) =>
    s.label.toLowerCase().includes('bảo hành')
  );
  const hasSkuRow = validSpecs.some((s) =>
    /^(sku|mã\s*sku|sku\s*phiên\s*bản|mã\s*sản\s*phẩm)/i.test(s.label.trim())
  );

  const resolvedWarrantyDesc = warrantyText && warrantyText.trim()
    ? `${warrantyText.trim().replace(/^BH\s+/i, 'Bảo hành ')} · Lỗi 1 đổi 1 trong 7 ngày đầu tiên`
    : `Bảo hành ${warrantyMonths} tháng tại CitiLap · Lỗi 1 đổi 1 trong 7 ngày đầu tiên`;

  const fullSpecs: SpecRow[] = [
    ...validSpecs,
    ...(sku && sku.trim() && !hasSkuRow ? [{ label: 'Mã sản phẩm (SKU)', value: sku.trim() }] : []),
    ...(!hasWarrantyRow
      ? [
          {
            label: 'Chế độ bảo hành',
            value: resolvedWarrantyDesc,
          },
        ]
      : []),
  ];

  return (
    <>
      <div className="bg-white rounded-2xl md:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3.5 pb-3 border-b border-slate-100">
          <h2 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#2563EB] shrink-0" />
            <span>THÔNG SỐ KỸ THUẬT</span>
          </h2>
        </div>

        {/* Fixed-height preview container with bottom fade */}
        <div className="relative max-h-[320px] overflow-hidden rounded-xl border border-slate-200/70">
          <div className="divide-y divide-slate-100 text-xs sm:text-sm">
            {validSpecs.map((row, idx) => (
              <div
                key={`${row.label}-${idx}`}
                className={`py-2.5 px-3 grid grid-cols-12 gap-2.5 sm:gap-3 items-start ${
                  idx % 2 === 0 ? 'bg-slate-50/80' : 'bg-white'
                }`}
              >
                <span className="col-span-5 sm:col-span-4 text-slate-500 font-medium break-words">
                  {row.label}
                </span>
                <span
                  data-spec-key={row.label}
                  className="col-span-7 sm:col-span-8 font-semibold text-slate-800 text-left break-words leading-snug"
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {validSpecs.length > 5 && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white via-white/90 to-transparent"
            />
          )}
        </div>

        <button
          type="button"
          onClick={openModal}
          className="mt-4 w-full min-h-11 py-2.5 px-3 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-xs sm:text-sm font-bold text-[#2563EB] transition cursor-pointer"
        >
          Xem tất cả thông số ({fullSpecs.length} mục) →
        </button>
      </div>

      {/* Native <dialog> Modal for Full Specifications */}
      <dialog
        ref={dialogRef}
        {...({ closedby: 'any' } as Record<string, string>)}
        onCancel={closeModal}
        onClick={(e) => {
          if (e.target === dialogRef.current) {
            closeModal();
          }
        }}
        aria-labelledby="full-specs-modal-title"
        className="fixed inset-0 z-50 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-2.5 sm:p-6 backdrop:bg-slate-950/60 backdrop:backdrop-blur-xs open:flex items-center justify-center"
      >
        <div className="bg-white w-full max-w-2xl max-h-[88dvh] rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50 shrink-0">
            <h3
              id="full-specs-modal-title"
              className="text-sm sm:text-lg font-extrabold text-slate-900 line-clamp-2 leading-snug"
            >
              ⚙️ Thông số kỹ thuật chi tiết — {productName}
            </h3>
            <button
              type="button"
              onClick={closeModal}
              aria-label="Đóng bảng thông số"
              className="w-11 h-11 min-h-11 min-w-11 rounded-full bg-slate-200/80 hover:bg-slate-300 flex items-center justify-center text-slate-700 font-bold cursor-pointer shrink-0 transition"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

          <div className="p-3 sm:p-6 overflow-y-auto overscroll-contain flex-1 min-h-0">
            <div className="border border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden">
              <table className="w-full table-fixed text-xs sm:text-sm border-collapse">
                <tbody className="divide-y divide-slate-200">
                  {fullSpecs.map((row, idx) => (
                    <tr
                      key={`modal-spec-${idx}`}
                      className={idx % 2 === 0 ? 'bg-slate-50/80' : 'bg-white'}
                    >
                      <td className="p-2.5 sm:p-3.5 font-bold text-slate-700 w-[38%] sm:w-1/3 align-top break-words">
                        {row.label}
                      </td>
                      <td className="p-2.5 sm:p-3.5 text-slate-800 font-medium w-[62%] sm:w-2/3 align-top break-words leading-relaxed">
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
            <button
              type="button"
              onClick={closeModal}
              className="w-full sm:w-auto min-h-11 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold transition cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
