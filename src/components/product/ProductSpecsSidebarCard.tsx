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
}

export function ProductSpecsSidebarCard({
  productName,
  specs,
  sku,
  warrantyMonths = 12,
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

  if (!specs || specs.length === 0) return null;

  // Build extended full specs list for the modal so it includes complete technical details
  const hasWarrantyRow = specs.some((s) =>
    s.label.toLowerCase().includes('bảo hành')
  );
  const hasSkuRow = specs.some((s) => s.label.toLowerCase().includes('mã'));

  const fullSpecs: SpecRow[] = [
    ...specs,
    ...(sku && !hasSkuRow ? [{ label: 'Mã sản phẩm (SKU)', value: sku }] : []),
    ...(!hasWarrantyRow
      ? [
          {
            label: 'Chế độ bảo hành',
            value: `${warrantyMonths} tháng tại CitiLap · Lỗi 1 đổi 1 trong 7 ngày đầu tiên`,
          },
        ]
      : []),
  ];

  return (
    <>
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <h2 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#2563EB]" />
            THÔNG SỐ KỸ THUẬT
          </h2>
        </div>

        {/* Fixed-height preview container with bottom fade */}
        <div className="relative max-h-[320px] overflow-hidden">
          <div className="divide-y divide-slate-100 text-xs sm:text-sm">
            {specs.map((row, idx) => (
              <div
                key={`${row.label}-${idx}`}
                className="py-2.5 flex justify-between gap-4"
              >
                <span className="text-slate-500 font-medium shrink-0 max-w-[40%]">
                  {row.label}
                </span>
                <span
                  data-spec-key={row.label}
                  className="font-semibold text-slate-800 text-right break-words"
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {specs.length > 5 && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white via-white/90 to-transparent"
            />
          )}
        </div>

        <button
          type="button"
          onClick={openModal}
          className="mt-4 w-full py-2.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-xs sm:text-sm font-bold text-[#2563EB] transition cursor-pointer"
        >
          Xem tất cả thông số ({fullSpecs.length} mục) →
        </button>
      </div>

      {/* Native <dialog> Modal for Full Specifications */}
      <dialog
        ref={dialogRef}
        closedby="any"
        onClick={(e) => {
          if (e.target === dialogRef.current) {
            closeModal();
          }
        }}
        className="m-auto w-[calc(100%-1.5rem)] max-w-2xl rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-xs open:flex open:flex-col max-h-[88vh] overflow-hidden"
      >
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50 shrink-0">
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 line-clamp-1">
            ⚙️ Thông số kỹ thuật chi tiết — {productName}
          </h3>
          <button
            type="button"
            onClick={closeModal}
            aria-label="Đóng bảng thông số"
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-600 font-bold cursor-pointer shrink-0 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-200">
                {fullSpecs.map((row, idx) => (
                  <tr
                    key={`modal-spec-${idx}`}
                    className={idx % 2 === 0 ? 'bg-slate-50/80' : 'bg-white'}
                  >
                    <td className="p-3.5 font-bold text-slate-700 w-2/5 sm:w-1/3 align-top">
                      {row.label}
                    </td>
                    <td className="p-3.5 text-slate-800 font-medium">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
          <button
            type="button"
            onClick={closeModal}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </dialog>
    </>
  );
}
