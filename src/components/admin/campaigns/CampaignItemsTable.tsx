'use client';

import { useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import CampaignProductPicker, { type CampaignPickerTarget } from '@/components/admin/products/CampaignProductPicker';
import { type CampaignItemForm } from './types';

interface CampaignItemsTableProps {
  items: CampaignItemForm[];
  readOnly?: boolean;
  onAddEmptyRow: () => void;
  onPickerAdd: (targets: CampaignPickerTarget[]) => void;
  onRemoveRow: (index: number) => void;
  onRemoveProduct?: (productId: string) => void;
  onChangeRow: (index: number, field: keyof CampaignItemForm, value: string) => void;
  onApplyBulkDiscountPct: (pct: number) => void;
}

interface IndexedItem {
  item: CampaignItemForm;
  index: number;
}

interface ProductGroup {
  key: string;
  productId: string;
  productName: string;
  entries: IndexedItem[];
  isManualRow: boolean;
}

function extractProductTitleAndOption(displayName?: string): { title: string; optionLabel: string } {
  if (!displayName) return { title: '', optionLabel: '' };
  const sep = displayName.indexOf(' · ');
  if (sep < 0) return { title: displayName.trim(), optionLabel: '' };
  return {
    title: displayName.slice(0, sep).trim(),
    optionLabel: displayName.slice(sep + 3).trim(),
  };
}

function cleanNumericInput(raw: string): string {
  return raw.replace(/\D/g, '');
}

export default function CampaignItemsTable({
  items,
  readOnly = false,
  onAddEmptyRow,
  onPickerAdd,
  onRemoveRow,
  onRemoveProduct,
  onChangeRow,
  onApplyBulkDiscountPct,
}: CampaignItemsTableProps) {
  const { groups, uniqueProductCount } = useMemo(() => {
    const groupList: ProductGroup[] = [];
    const byProduct = new Map<string, ProductGroup>();

    items.forEach((item, index) => {
      const pid = item.productId.trim();
      if (!pid) {
        groupList.push({
          key: `manual-${index}`,
          productId: '',
          productName: '',
          entries: [{ item, index }],
          isManualRow: true,
        });
        return;
      }

      let group = byProduct.get(pid);
      const { title } = extractProductTitleAndOption(item.displayName);
      if (!group) {
        group = {
          key: `prod-${pid}`,
          productId: pid,
          productName: title || pid,
          entries: [],
          isManualRow: false,
        };
        byProduct.set(pid, group);
        groupList.push(group);
      } else if (!group.productName && title) {
        group.productName = title;
      }
      group.entries.push({ item, index });
    });

    return {
      groups: groupList,
      uniqueProductCount: byProduct.size + groupList.filter((g) => g.isManualRow).length,
    };
  }, [items]);

  return (
    <div className="pt-3 border-t border-slate-200 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-xs font-bold text-slate-900">
            Sản phẩm khuyến mại ({uniqueProductCount} sản phẩm
            {items.length > uniqueProductCount ? ` · ${items.length} option` : ''})
          </h3>
          {uniqueProductCount > 10 && (
            <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
              Homepage hiển thị tối đa 10 SP
            </span>
          )}
          {!readOnly && items.length > 0 && (
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-slate-500">Giảm nhanh theo giá gốc:</span>
              {[3, 5, 10, 15, 20].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => onApplyBulkDiscountPct(pct)}
                  className="px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold cursor-pointer transition"
                  title={`Áp dụng giảm ${pct}% trên giá gốc cho tất cả option`}
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

      {items.length === 0 ? (
        <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
          {readOnly
            ? 'Chiến dịch này không có sản phẩm nào.'
            : 'Tìm chọn sản phẩm phía trên hoặc bấm "Thêm dòng".'}
        </div>
      ) : (
        <div className="space-y-2.5">
          {groups.map((group) => {
            if (group.isManualRow) {
              const { item: it, index: idx } = group.entries[0];
              const sale = Number(it.salePrice);
              const reg = Number(it.regularPrice);
              const hasNumbers = Number.isFinite(sale) && Number.isFinite(reg) && reg > 0 && sale > 0;
              const discountPct = hasNumbers ? Math.round((1 - sale / reg) * 100) : null;
              const isValidSale = hasNumbers && sale < reg;

              return (
                <div
                  key={group.key}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-12 gap-2 items-center"
                >
                  <div className="md:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      disabled={readOnly}
                      value={it.productId}
                      onChange={(e) => onChangeRow(idx, 'productId', e.target.value)}
                      placeholder="Product ID"
                      aria-label="Product ID"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono disabled:opacity-60"
                    />
                    <input
                      type="text"
                      disabled={readOnly}
                      value={it.variantId || ''}
                      onChange={(e) => onChangeRow(idx, 'variantId', e.target.value)}
                      placeholder="Variant ID (trống = gốc)"
                      aria-label="Variant ID"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono disabled:opacity-60"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      disabled={readOnly}
                      value={it.salePrice}
                      onChange={(e) => onChangeRow(idx, 'salePrice', cleanNumericInput(e.target.value))}
                      placeholder="Giá sale (₫)"
                      aria-label="Giá sale"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono tabular-nums font-bold text-red-600 disabled:opacity-60"
                    />
                  </div>
                  <div className="md:col-span-3 flex items-center gap-1.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      disabled={readOnly}
                      value={it.regularPrice || ''}
                      onChange={(e) => onChangeRow(idx, 'regularPrice', cleanNumericInput(e.target.value))}
                      placeholder="Giá gốc (₫)"
                      aria-label="Giá gốc"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono tabular-nums text-slate-700 disabled:opacity-60"
                    />
                    {discountPct !== null && (
                      <span
                        className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isValidSale ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {isValidSale ? `-${discountPct}%` : '>= gốc'}
                      </span>
                    )}
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => onRemoveRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                        title="Xóa dòng này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            const firstDiscountedIndex = group.entries.find(({ item }) => {
              const s = Number(item.salePrice);
              const r = Number(item.regularPrice);
              return String(item.salePrice ?? '').trim() !== '' && Number.isFinite(s) && s > 0 && (!r || s < r);
            })?.index;

            return (
              <div
                key={group.key}
                className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden"
              >
                {/* Single Product Group Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3 py-2 border-b border-slate-200/80">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{group.productName}</span>
                      {group.entries.length > 1 && (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                          {group.entries.length} option
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono truncate">
                      ID: {group.productId}
                    </p>
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onRemoveProduct) {
                          onRemoveProduct(group.productId);
                        } else {
                          [...group.entries]
                            .sort((a, b) => b.index - a.index)
                            .forEach((e) => onRemoveRow(e.index));
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer shrink-0"
                      title="Xóa sản phẩm này khỏi chiến dịch"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Xóa SP</span>
                    </button>
                  )}
                </div>

                {/* Options List inside the single product */}
                <div className="divide-y divide-slate-100">
                  {group.entries.map(({ item: it, index: idx }, optIdx) => {
                    const { optionLabel } = extractProductTitleAndOption(it.displayName);
                    const hasBlankSale = String(it.salePrice ?? '').trim() === '';
                    const sale = Number(it.salePrice);
                    const reg = Number(it.regularPrice);
                    const hasNumbers =
                      !hasBlankSale && Number.isFinite(sale) && Number.isFinite(reg) && reg > 0 && sale > 0;
                    const discountPct = hasNumbers ? Math.round((1 - sale / reg) * 100) : null;
                    const isValidSale = hasNumbers && sale < reg;
                    const isHomepageWinner = firstDiscountedIndex === idx;

                    return (
                      <div
                        key={it.id || `${it.productId}-${it.variantId || ''}-${idx}`}
                        className="px-3 py-2 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center"
                      >
                        <div className="md:col-span-5 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                              Option {optIdx + 1}
                            </span>
                            <span className="text-xs font-medium text-slate-800 break-words">
                              {optionLabel || (it.variantId ? `Variant: ${it.variantId}` : 'Mặc định')}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                            {hasBlankSale ? (
                              <span className="text-slate-400">
                                Bỏ trống = không giảm option này
                              </span>
                            ) : isHomepageWinner && isValidSale ? (
                              <span className="inline-flex items-center rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 font-semibold text-emerald-700">
                                Hiển thị ngoài Homepage ({sale.toLocaleString('vi-VN')}₫ · -{discountPct}%)
                              </span>
                            ) : isValidSale && discountPct !== null ? (
                              <span className="inline-flex items-center rounded bg-rose-50 px-1.5 py-0.5 font-semibold text-rose-700">
                                Giảm {discountPct}% ({sale.toLocaleString('vi-VN')}₫)
                              </span>
                            ) : discountPct !== null ? (
                              <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">
                                Giá sale phải nhỏ hơn giá gốc
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Sale Price */}
                        <div className="md:col-span-3">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Giá sale (₫)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            disabled={readOnly}
                            value={it.salePrice}
                            onChange={(e) =>
                              onChangeRow(idx, 'salePrice', cleanNumericInput(e.target.value))
                            }
                            placeholder="VD: 15900000"
                            aria-label="Giá sale"
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono tabular-nums font-bold text-red-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:opacity-60"
                          />
                        </div>

                        {/* Regular Price */}
                        <div className="md:col-span-3">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Giá gốc (₫)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            disabled={readOnly}
                            value={it.regularPrice ?? ''}
                            onChange={(e) =>
                              onChangeRow(idx, 'regularPrice', cleanNumericInput(e.target.value))
                            }
                            placeholder="Giá gốc (₫)"
                            aria-label="Giá gốc"
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono tabular-nums text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:opacity-60"
                          />
                        </div>

                        {/* Remove option */}
                        <div className="md:col-span-1 flex justify-end md:pt-4">
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => onRemoveRow(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                              title="Xóa option này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
