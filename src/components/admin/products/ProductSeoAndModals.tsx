'use client';

import Link from 'next/link';
import { AlertTriangle, Check, Search } from 'lucide-react';
import { AdminButton, AdminCard } from '@/components/admin/ui';
import { availabilityLabels, type ProductDocument } from '@/contracts/cms/product-studio';
import { productHref } from '@/lib/product-paths';
import MediaDialog from '../media/MediaDialog';
import StudioAsset from './StudioAsset';

const money = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

export function ProductSeoChecklistPanel({
  doc,
  updateDoc,
}: {
  doc: ProductDocument;
  updateDoc: <K extends keyof ProductDocument>(key: K, value: ProductDocument[K]) => void;
}) {
  const checklist = [
    { label: 'Tên sản phẩm & đường dẫn (slug)', ok: Boolean(doc.name.trim() && doc.slug.trim()) },
    { label: 'Danh mục sản phẩm', ok: Boolean(doc.categoryId.trim()) },
    { label: 'Giá bán hợp lệ (> 0đ)', ok: doc.price > 0 },
    { label: 'Tối thiểu 1 ảnh đại diện có mô tả ALT', ok: doc.media.length > 0 && doc.media.every(m => Boolean(m.alt.trim())) },
    { label: 'Thông số kỹ thuật cơ bản (≥ 3 thông số)', ok: doc.specs.filter(s => Boolean(s.value?.trim())).length >= 3 },
    { label: 'Tiêu đề & Mô tả SEO', ok: Boolean((doc.seoTitle || doc.name).trim() && (doc.seoDescription || doc.description).trim()) },
  ];

  return (
    <div className="space-y-4">
      <AdminCard title="SEO">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="product-seo-title" className="text-xs font-semibold text-slate-700">
                Tiêu đề SEO
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {doc.seoTitle.length}/70
              </span>
            </div>
            <input
              type="text"
              id="product-seo-title"
              value={doc.seoTitle}
              onChange={e => updateDoc('seoTitle', e.target.value)}
              placeholder={`${doc.name || 'Tên sản phẩm'} | CitiLap`}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="product-seo-description" className="text-xs font-semibold text-slate-700">
                Mô tả SEO
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {doc.seoDescription.length}/160
              </span>
            </div>
            <textarea
              rows={3}
              id="product-seo-description"
              value={doc.seoDescription}
              onChange={e => updateDoc('seoDescription', e.target.value)}
              placeholder="Tóm tắt ưu đãi, bảo hành, trả góp..."
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>

          {/* Google SERP Snippet Preview */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-0.5">
            <div className="text-blue-700 text-sm font-medium truncate">
              {doc.seoTitle || doc.name || 'Tiêu đề sản phẩm'}
            </div>
            <div className="text-emerald-700 text-xs truncate">
              https://citilap.vn{productHref({ ...doc, slug: doc.slug || 'duong-dan-san-pham' })}
            </div>
            <div className="text-slate-600 text-xs line-clamp-2">
              {doc.seoDescription || doc.description || 'Mô tả hiển thị trên Google...'}
            </div>
          </div>
        </div>
      </AdminCard>

      <AdminCard title="Kiểm tra mức độ sẵn sàng xuất bản (Readiness Checklist)">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {checklist.map(item => (
            <div
              key={item.label}
              className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                item.ok
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/60 border-amber-200 text-amber-900'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                  item.ok ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                }`}
              >
                {item.ok ? <Check className="w-3 h-3" /> : '!'}
              </span>
              <span className="font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
}

export function ProductPreviewModal({
  id,
  doc,
  onClose,
}: {
  id?: string | null;
  doc: ProductDocument;
  onClose: () => void;
}) {
  return (
    <MediaDialog title="Xem trước trang sản phẩm (Bản nháp)" onClose={onClose}>
      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Đây là tóm tắt nội dung đang biên tập, chưa tính chương trình ưu đãi trên website.</span>
        </div>
        {id && (
          <Link
            href={`/admin/products/${id}/preview`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-sm font-semibold text-blue-700 underline"
          >
            Mở bố cục Storefront với bản nháp đã lưu ↗
          </Link>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Hình ảnh sản phẩm</h3>
            <div className="grid grid-cols-3 gap-2">
              {doc.media.map(m => (
                <div key={m.assetId} className="aspect-square bg-slate-100 rounded-lg overflow-hidden border">
                  <StudioAsset id={m.assetId} />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">{doc.name || 'Tên sản phẩm'}</h2>
            <div className="text-2xl font-bold text-blue-600">{money(doc.price)}</div>
            {doc.originalPrice != null && (
              <div className="text-sm text-slate-400 line-through">{money(doc.originalPrice)}</div>
            )}
            <div className="text-xs font-medium px-2 py-1 bg-slate-100 rounded inline-block text-slate-700">
              Trạng thái: {availabilityLabels[doc.availability]}
            </div>
            <p className="text-sm text-slate-600">{doc.description}</p>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Thông số kỹ thuật</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {doc.specs.map(s => (
              <div key={s.key} className="p-2 bg-slate-50 rounded flex justify-between">
                <span className="font-semibold text-slate-600">{s.key}:</span>
                <span className="text-slate-800">{s.value || '--'}</span>
              </div>
            ))}
          </div>
        </div>

        {doc.variants.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Các cấu hình</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {doc.variants.map(v => (
                <div key={v.id} className="p-2 border border-slate-200 rounded-lg">
                  <div className="font-bold text-slate-800">{v.name || v.sku}</div>
                  <div className="text-blue-600 font-semibold">{money(v.price)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MediaDialog>
  );
}

export function RelatedProductsPickerModal({
  doc,
  updateDoc,
  relatedSearch,
  setRelatedSearch,
  loadingRelated,
  relatedCandidates,
  fetchRelatedCandidates,
  onClose,
}: {
  doc: ProductDocument;
  updateDoc: <K extends keyof ProductDocument>(key: K, value: ProductDocument[K]) => void;
  relatedSearch: string;
  setRelatedSearch: (val: string) => void;
  loadingRelated: boolean;
  relatedCandidates: { id: string; name: string; sku?: string; image?: string; price: number }[];
  fetchRelatedCandidates: (query: string) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <MediaDialog
      title="Chọn sản phẩm liên quan / Đề xuất mua kèm"
      onClose={onClose}
    >
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={relatedSearch}
              onChange={e => {
                const val = e.target.value;
                setRelatedSearch(val);
                void fetchRelatedCandidates(val);
              }}
              placeholder="Tìm sản phẩm theo tên hoặc SKU..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white">
          {loadingRelated ? (
            <div className="p-8 text-center text-xs text-slate-500">Đang tìm sản phẩm...</div>
          ) : relatedCandidates.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">Không tìm thấy sản phẩm phù hợp.</div>
          ) : (
            relatedCandidates.map(candidate => {
              const isSelected = (doc.relatedProductIds || []).includes(candidate.id);
              const isMax = (doc.relatedProductIds || []).length >= 10;
              return (
                <div
                  key={candidate.id}
                  className="p-3 flex items-center justify-between hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {candidate.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={candidate.image}
                        alt=""
                        className="w-10 h-10 rounded object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400 text-xs">
                        SP
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {candidate.name}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        {candidate.sku && <span>SKU: {candidate.sku}</span>}
                        <span className="text-blue-600 font-medium">{money(candidate.price)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {isSelected ? (
                      <button
                        type="button"
                        onClick={() => {
                          updateDoc(
                            'relatedProductIds',
                            (doc.relatedProductIds || []).filter(item => item !== candidate.id)
                          );
                        }}
                        className="text-xs px-2.5 py-1 rounded border border-rose-200 bg-rose-50 text-rose-600 font-medium hover:bg-rose-100 cursor-pointer"
                      >
                        Bỏ chọn
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isMax}
                        onClick={() => {
                          if (isMax) return;
                          updateDoc('relatedProductIds', [
                            ...(doc.relatedProductIds || []),
                            candidate.id,
                          ]);
                        }}
                        className="text-xs px-2.5 py-1 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-40 cursor-pointer"
                      >
                        {isMax ? 'Đã tối đa 10' : 'Chọn'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>Đã chọn: {(doc.relatedProductIds || []).length} / 10 sản phẩm</span>
          <AdminButton variant="primary" size="sm" onClick={onClose}>
            Hoàn tất
          </AdminButton>
        </div>
      </div>
    </MediaDialog>
  );
}
