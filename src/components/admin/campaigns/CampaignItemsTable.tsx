'use client';

import { Plus, Trash2 } from 'lucide-react';
import CampaignProductPicker, { type CampaignPickerTarget } from '@/components/admin/products/CampaignProductPicker';
import { type CampaignItemForm } from './types';

interface CampaignItemsTableProps {
  items: CampaignItemForm[];
  readOnly?: boolean;
  onAddEmptyRow: () => void;
  onPickerAdd: (targets: CampaignPickerTarget[]) => void;
  onRemoveRow: (index: number) => void;
  onChangeRow: (index: number, field: keyof CampaignItemForm, value: string) => void;
  onApplyBulkDiscountPct: (pct: number) => void;
}

export default function CampaignItemsTable({
  items,
  readOnly = false,
  onAddEmptyRow,
  onPickerAdd,
  onRemoveRow,
  onChangeRow,
  onApplyBulkDiscountPct,
}: CampaignItemsTableProps) {
  return (
    <div className="pt-3 border-t border-slate-200 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-xs font-bold text-slate-900">
            Sản phẩm khuyến mại ({items.length})
          </h3>
          {!readOnly && items.length > 0 && (
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-slate-500">Giảm nhanh theo giá gốc:</span>
              {[3, 5, 10, 15, 20].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => onApplyBulkDiscountPct(pct)}
                  className="px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold cursor-pointer transition"
                  title={`Áp dụng giảm ${pct}% trên giá gốc cho tất cả sản phẩm`}
                >
                  -{pct}%
                </button>
              ))}
            </div>
          )}
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={onAddEmptyRow}
            className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm dòng
          </button>
        )}
      </div>

      {!readOnly && <CampaignProductPicker onAdd={onPickerAdd} disabled={readOnly} />}
      <p className="text-xs text-slate-500">Giới hạn suất và thống kê đã bán chưa khả dụng.</p>

      {items.length === 0 ? (
        <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
          {readOnly
            ? 'Chiến dịch này không có sản phẩm nào.'
            : 'Tìm chọn sản phẩm phía trên hoặc bấm "Thêm dòng".'}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="hidden lg:grid grid-cols-12 gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600 uppercase tracking-wide">
            <div className="col-span-4">Sản phẩm &amp; Xem trước giá</div>
            <div className="col-span-2">Giá Sale (₫)</div>
            <div className="col-span-2">Giá gốc (₫) / % Giảm</div>
            <div className="col-span-1">Giới hạn suất</div>
            <div className="col-span-1">Tối đa/khách</div>
            <div className="col-span-1 text-center">Đã bán</div>
            <div className="col-span-1 text-right">Xóa</div>
          </div>

          {items.map((it, idx) => {
            const sale = Number(it.salePrice);
            const reg = Number(it.regularPrice);
            const hasNumbers =
              Number.isFinite(sale) && Number.isFinite(reg) && reg > 0 && sale > 0;
            const discountPct = hasNumbers ? Math.round((1 - sale / reg) * 100) : null;
            const isValidSale = hasNumbers && sale < reg;
            const soldCount = typeof it.soldCount === 'number' && it.soldCount >= 0 ? it.soldCount : 0;
            const qtyLimitNum =
              it.quantityLimit !== undefined && it.quantityLimit !== '' && it.quantityLimit !== null
                ? Number(it.quantityLimit)
                : null;
            const isExhausted =
              qtyLimitNum !== null && Number.isFinite(qtyLimitNum) && qtyLimitNum > 0 && soldCount >= qtyLimitNum;

            return (
              <div
                key={it.id || `${it.productId}-${it.variantId || ''}-${idx}`}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 lg:grid-cols-12 gap-2 items-center"
              >
                {/* Product Info + Storefront Price Preview */}
                <div className="lg:col-span-4 min-w-0 space-y-1">
                  {it.displayName ? (
                    <div>
                      <p
                        className="text-xs font-semibold text-slate-900 truncate"
                        title={it.displayName}
                      >
                        {it.displayName}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        ID: {it.productId}
                        {it.variantId ? ` · Variant: ${it.variantId}` : ' · Bản gốc'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={it.productId}
                        onChange={(e) => onChangeRow(idx, 'productId', e.target.value)}
                        placeholder="Product ID"
                        aria-label="Product ID"
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono disabled:opacity-60"
                      />
                      <input
                        type="text"
                        disabled={readOnly}
                        value={it.variantId || ''}
                        onChange={(e) => onChangeRow(idx, 'variantId', e.target.value)}
                        placeholder="Variant ID (trống = gốc)"
                        aria-label="Variant ID"
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono disabled:opacity-60"
                      />
                    </div>
                  )}

                  {/* Storefront Price Preview */}
                  {isValidSale && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] bg-white border border-slate-200/80 rounded-md px-2 py-0.5 w-fit">
                      <span className="text-slate-500">Storefront:</span>
                      <span className="font-bold text-rose-600 font-mono tabular-nums">
                        {sale.toLocaleString('vi-VN')}₫
                      </span>
                      <span className="line-through text-slate-400 font-mono tabular-nums text-[10px]">
                        {reg.toLocaleString('vi-VN')}₫
                      </span>
                      {discountPct !== null && discountPct > 0 && (
                        <span className="px-1 py-0.2 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">
                          -{discountPct}%
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Sale Price */}
                <div className="lg:col-span-2">
                  <span className="block text-[10px] text-slate-500 mb-0.5 lg:hidden font-semibold">
                    Giá Sale (₫):
                  </span>
                  <input
                    type="number"
                    disabled={readOnly}
                    min={1}
                    value={it.salePrice}
                    onChange={(e) => onChangeRow(idx, 'salePrice', e.target.value)}
                    placeholder="Giá sale (₫)"
                    aria-label="Giá sale"
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono tabular-nums font-bold text-red-600 disabled:opacity-60"
                  />
                </div>

                {/* Regular Price & Discount Badge */}
                <div className="lg:col-span-2">
                  <span className="block text-[10px] text-slate-500 mb-0.5 lg:hidden font-semibold">
                    Giá gốc (₫):
                  </span>
                  <div className="space-y-1">
                    <input
                      type="number"
                      disabled={readOnly}
                      min={1}
                      value={it.regularPrice || ''}
                      onChange={(e) => onChangeRow(idx, 'regularPrice', e.target.value)}
                      placeholder="Giá gốc (₫)"
                      aria-label="Giá gốc"
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono tabular-nums text-slate-600 disabled:opacity-60"
                    />
                    {discountPct !== null && (
                      <div className="flex items-center gap-1">
                        {isValidSale && discountPct > 0 ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                            Giảm {discountPct}% (-{(reg - sale).toLocaleString('vi-VN')}₫)
                          </span>
                        ) : (
                          <span
                            className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-700"
                            title="Giá sale phải nhỏ hơn giá bán thường"
                          >
                            Giá sale phải &lt; giá gốc
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quantity Limit */}
                <div className="lg:col-span-1">
                  <span className="block text-[10px] text-slate-500 mb-0.5 lg:hidden font-semibold">
                    Giới hạn suất:
                  </span>
                  <input
                    type="number"
                    disabled
                    min={1}
                    value={it.quantityLimit ?? ''}
                    onChange={(e) => onChangeRow(idx, 'quantityLimit', e.target.value)}
                    placeholder="Không giới hạn"
                    title="Tổng số suất bán giá Flash Sale (trống = Không giới hạn)"
                    aria-label="Giới hạn suất"
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono tabular-nums text-slate-700 placeholder:text-[10px] disabled:opacity-60"
                  />
                </div>

                {/* Per Customer Limit */}
                <div className="lg:col-span-1">
                  <span className="block text-[10px] text-slate-500 mb-0.5 lg:hidden font-semibold">
                    Tối đa/khách:
                  </span>
                  <input
                    type="number"
                    disabled
                    min={1}
                    value={it.perCustomerLimit ?? ''}
                    onChange={(e) => onChangeRow(idx, 'perCustomerLimit', e.target.value)}
                    placeholder="Không giới hạn"
                    title="Số lượng tối đa mỗi khách được mua (trống = Không giới hạn)"
                    aria-label="Tối đa mỗi khách"
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono tabular-nums text-slate-700 placeholder:text-[10px] disabled:opacity-60"
                  />
                </div>

                {/* Sold Count */}
                <div className="lg:col-span-1 flex lg:justify-center items-center gap-1">
                  <span className="text-[10px] text-slate-500 lg:hidden font-semibold">Đã bán:</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold tabular-nums ${
                      isExhausted
                        ? 'bg-rose-100 text-rose-700'
                        : soldCount > 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200/70 text-slate-600'
                    }`}
                    title={isExhausted ? 'Đã hết suất Flash Sale' : 'Số lượng đã bán trong chiến dịch'}
                  >
                    Chưa khả dụng
                  </span>
                </div>

                {/* Remove button */}
                <div className="lg:col-span-1 flex justify-end">
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onRemoveRow(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                      title="Xóa mục này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
