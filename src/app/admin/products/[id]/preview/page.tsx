"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  PackageCheck,
  Truck,
  FileText,
} from "lucide-react";
import ProductGallery from "@/components/product/ProductGallery";
import StudioPurchaseSection from "@/components/product/StudioPurchaseSection";
import { CartProvider } from '@/context/CartContext';
import { CompareProvider } from '@/context/CompareContext';
import { SpecChip } from "@/components/ui/SpecChip";
import { sanitizeHtml } from "@/lib/sanitize-html";
import type { ProductDocument } from "@/contracts/cms/product-studio";
import { AdminButton, AdminLoadingState, AdminErrorState } from "@/components/admin/ui";
import { mediaRequest } from '@/components/admin/media/MediaBrowser';
import type { MediaAssetDto } from '@/contracts/cms/media';

interface PreviewPageProps {
  params: Promise<{ id: string }>;
}

interface DetailResponse {
  id: string;
  revision: number;
  document: ProductDocument;
  published: boolean;
}

export default function ProductDraftPreviewPage({ params }: PreviewPageProps) {
  const { id } = use(params);
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaAssetDto[]>([]);
  const publishLock = useRef(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const detail = await mediaRequest<DetailResponse>(`/api/admin/products/${id}`, { cache: 'no-store' });
        const assets = await Promise.all(detail.document.media.map(item => mediaRequest<{ asset: MediaAssetDto }>(`/api/admin/media/${encodeURIComponent(item.assetId)}`).then(result => result.asset)));
        if (active) { setData(detail); setMedia(assets); }
      } catch (err) {
        if (active) setError((err as Error).message || "Không thể tải dữ liệu xem trước.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [id]);

  const handlePublish = async () => {
    if (!data || publishLock.current) return;
    publishLock.current = true;
    setPublishing(true);
    setPublishMessage(null);
    try {
      const updated = await mediaRequest<DetailResponse>(`/api/admin/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedRevision: data.revision,
          action: "publish",
          document: data.document,
        }),
      });
      setData(updated);
      setPublishMessage("Đã xuất bản sản phẩm thành công lên website!");
    } catch (err) {
      setPublishMessage(`Lỗi: ${(err as Error).message}`);
    } finally {
      setPublishing(false);
      publishLock.current = false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <AdminLoadingState message="Đang khởi tạo bản xem trước Storefront từ tài liệu nháp..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <AdminErrorState
          message={error || "Không tìm thấy dữ liệu bản nháp của sản phẩm này."}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const { document: doc, revision, published } = data;
  const galleryImages = doc.media
    .filter((m) => media.find(asset => asset.id === m.assetId)?.kind === 'IMAGE')
    .map((m) => ({
      url: media.find(asset => asset.id === m.assetId)?.url || '',
      alt: m.alt || doc.name,
      variantId: m.variantId || null,
    }));

  const primaryCover = galleryImages[0]?.url || "";
  const safeContent = sanitizeHtml(doc.contentHtml || doc.description || "");

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* 1. TOP ADMIN PREVIEW BAR (Sticky) */}
      <header className="sticky top-0 z-50 bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/products/${id}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại biên tập</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                BẢN XEM TRƯỚC (DRAFT PREVIEW)
              </span>
              <span className="text-xs text-slate-400 font-mono">rev #{revision}</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                  published
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                {published ? "Đã xuất bản trên Web" : "Chưa xuất bản"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {publishMessage && (
              <span className="text-xs text-amber-300 font-medium mr-2">{publishMessage}</span>
            )}
            <AdminButton
              variant="primary"
              size="sm"
              icon={<Globe className="w-3.5 h-3.5" />}
              onClick={() => void handlePublish()}
              loading={publishing}
            >
              {published ? "Cập nhật website" : "Xuất bản website"}
            </AdminButton>
          </div>
        </div>
      </header>

      {/* 2. STOREFRONT PDP LAYOUT (Exact reproduction using Storefront design system) */}
      <div className="pb-24">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Đường dẫn trang" className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 max-w-7xl">
            <ol className="flex items-center text-xs sm:text-sm text-gray-500 py-2.5 font-medium flex-wrap gap-y-1">
              <li>Trang chủ</li>
              <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-gray-400 shrink-0" />
              <li>Sản phẩm</li>
              <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-gray-400 shrink-0" />
              <li className="text-gray-900 font-semibold truncate max-w-xs sm:max-w-md">
                {doc.name}
              </li>
            </ol>
          </div>
        </nav>

        {/* Main PDP Container */}
        <main className="container mx-auto px-4 max-w-7xl mt-5 sm:mt-6">
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
            {/* Gallery Column (Col 5) */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-4 sticky top-16">
                <ProductGallery
                  images={galleryImages.length > 0 ? galleryImages : [primaryCover]}
                  productName={doc.name}
                  selectedImage={primaryCover}
                />
              </div>
            </div>

            {/* Right Column: Info, Variants & Purchase Section (Col 7) */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-5 sm:p-7 flex flex-col space-y-5">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                  {doc.name}
                </h1>

                {/* Quick Specs Highlight Chips */}
                {doc.specs.some((s) => s.value) && (
                  <div className="border border-blue-50 rounded-xl p-3.5 bg-blue-50/30 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 uppercase tracking-wide">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Cấu hình tóm tắt
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {doc.specs
                        .filter((s) => s.value)
                        .map((s) => (
                          <SpecChip key={s.key} label={s.key} value={s.value} />
                        ))}
                    </div>
                  </div>
                )}

                {/* Studio Purchase & Variant Section */}
                <p className="text-xs text-amber-800">Xem bản nháp đã lưu, chưa tính chương trình ưu đãi. Thao tác mua hàng tắt trong bản xem trước.</p>
                <CartProvider><CompareProvider><div inert>
                <StudioPurchaseSection
                  studio={{
                    ...doc,
                    canOrder: doc.availability === "AVAILABLE" || doc.availability === "PREORDER",
                  }}
                  productId={id}
                  image={primaryCover}
                />
                </div></CompareProvider></CartProvider>

                {/* Brand Commitments */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Cam kết chính hãng 100%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Giao hàng toàn quốc</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PackageCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Bảo hành theo tiêu chuẩn hãng</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Hóa đơn VAT đầy đủ</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Bottom Section: Full Specifications & Rich Article Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Specs Table (Col 5) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-5">
                <h3 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                  Thông số kỹ thuật chi tiết
                </h3>
                <div className="divide-y divide-gray-100 text-xs">
                  {doc.specs.map((s) => (
                    <div key={s.key} className="py-2.5 flex justify-between gap-4">
                      <span className="font-semibold text-gray-500 shrink-0">{s.key}</span>
                      <span className="text-gray-900 text-right font-medium">{s.value || "--"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Article (Col 7) */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-6 sm:p-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                  Đặc điểm nổi bật & Bài viết giới thiệu
                </h3>
                {safeContent ? (
                  <div
                    className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: safeContent }}
                  />
                ) : (
                  <p className="text-xs text-gray-500 italic">
                    Chưa có bài viết giới thiệu chi tiết cho sản phẩm này.
                  </p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
