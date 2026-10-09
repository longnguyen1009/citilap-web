"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ArrowLeft, Clock, Download, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import ImageUploader from "@/components/admin/ImageUploader";
import { sanitizeHtml } from "@/lib/sanitize-html";

type Category = { id: string; name: string };
type SpecRow = { key: string; value: string };
type Variant = { id?: string; sku: string; name: string; options: Record<string, string>; price: number; originalPrice: number | null; stock: number; image: string; status: string };
type Product = { id: string; name: string; slug: string; description: string; contentHtml?: string | null; brand?: string | null; model?: string | null; series?: string | null; warranty?: string | null; condition?: string | null; origin?: string | null; seoTitle?: string | null; seoDescription?: string | null; canonicalSlug?: string | null; isFeatured?: boolean; isNewArrival?: boolean; isFlashSale?: boolean; isBestSeller?: boolean; allowBackorder?: boolean; minOrderQty?: number; maxOrderQty?: number | null; lowestPrice30d?: number | null; publishAt?: string | null; unpublishAt?: string | null; price: number; originalPrice: number | null; images: string; stock: number; status: string; specs: string | null; tags: string | null; categoryId: string; variants?: Array<Omit<Variant, "options"> & { options: string }> };

const parseImages = (value: string) => { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter(Boolean) : []; } catch { return value ? value.split(",").map((x) => x.trim()).filter(Boolean) : []; } };
const parseSpecs = (value: string | null): SpecRow[] => { try { const parsed = value ? JSON.parse(value) : {}; return Object.entries(parsed).map(([key, val]) => ({ key, value: String(val) })); } catch { return []; } };
const parseOptions = (value: string): Record<string, string> => { try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" ? parsed : {}; } catch { return {}; } };

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [specs, setSpecs] = useState<SpecRow[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [html, setHtml] = useState("");
  const [htmlMode, setHtmlMode] = useState<"source" | "preview">("source");
  const [history, setHistory] = useState<{ id: string; action: string; actorName?: string | null; snapshot?: string | null; createdAt: string }[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [seo, setSeo] = useState({ seoTitle: "", seoDescription: "", canonicalSlug: "" });
  const [flags, setFlags] = useState({ isFeatured: false, isNewArrival: false, isFlashSale: false, isBestSeller: false });
  const [policy, setPolicy] = useState({ brand: "", model: "", series: "", warranty: "", condition: "", origin: "", allowBackorder: false, minOrderQty: 1, maxOrderQty: "", lowestPrice30d: "", publishAt: "", unpublishAt: "" });
  const [versions, setVersions] = useState<{ id: string; version: number; data: string; createdAt: string }[]>([]);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetch(`/api/products/${id}`), fetch("/api/categories")]).then(async ([productResponse, categoriesResponse]) => {
      const productResult = await productResponse.json(); const categoryResult = await categoriesResponse.json();
      if (cancelled) return;
      if (productResult.success) {
        const p = productResult.data as Product; setProduct(p); setSpecs(parseSpecs(p.specs)); setImages(parseImages(p.images)); setHtml(p.contentHtml || "");
        setVariants((p.variants || []).map((v) => ({ ...v, options: parseOptions(v.options), image: v.image || "" })));
        setSeo({ seoTitle: p.seoTitle || "", seoDescription: p.seoDescription || "", canonicalSlug: p.canonicalSlug || "" });
        setFlags({ isFeatured: Boolean(p.isFeatured), isNewArrival: Boolean(p.isNewArrival), isFlashSale: Boolean(p.isFlashSale), isBestSeller: Boolean(p.isBestSeller) });
        setPolicy({ brand: p.brand || "", model: p.model || "", series: p.series || "", warranty: p.warranty || "", condition: p.condition || "", origin: p.origin || "", allowBackorder: Boolean(p.allowBackorder), minOrderQty: p.minOrderQty ?? 1, maxOrderQty: p.maxOrderQty == null ? "" : String(p.maxOrderQty), lowestPrice30d: p.lowestPrice30d == null ? "" : String(p.lowestPrice30d), publishAt: p.publishAt ? p.publishAt.slice(0, 16) : "", unpublishAt: p.unpublishAt ? p.unpublishAt.slice(0, 16) : "" });
      }
      if (categoryResult.success) setCategories(categoryResult.data);
      void fetch(`/api/products/${id}/edit-history`).then((r) => r.json()).then((res) => { if (!cancelled && res.success) setHistory(res.data || []); }).catch(() => {});
      void fetch(`/api/products/${id}/versions`).then((r) => r.json()).then((res) => { if (!cancelled && res.success) setVersions(res.data || []); }).catch(() => {});
      setLoading(false);
    }).catch(() => { if (!cancelled) { setMessage("Không thể tải dữ liệu sản phẩm."); setLoading(false); } });
    return () => { cancelled = true; };
  }, [id]);

  const updateVariant = (index: number, patch: Partial<Variant>) => setVariants((current) => current.map((variant, i) => i === index ? { ...variant, ...patch } : variant));
  const updateOption = (index: number, key: string, value: string) => setVariants((current) => current.map((variant, i) => i === index ? { ...variant, options: { ...variant.options, [key]: value } } : variant));
  const addVariant = () => setVariants((current) => [...current, { sku: `${product?.slug || "SP"}-${current.length + 1}`.toUpperCase(), name: "", options: { RAM: "", SSD: "" }, price: product?.price || 0, originalPrice: product?.originalPrice || null, stock: 0, image: "", status: "active" }]);
  const specsJson = () => Object.fromEntries(specs.filter((s) => s.key.trim() && s.value.trim()).map((s) => [s.key.trim(), s.value.trim()]));

  const saveProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!product) return; setSaving(true); setMessage("");
    const form = new FormData(event.currentTarget); const price = Number(form.get("price")); const originalRaw = String(form.get("originalPrice") || ""); const originalPrice = originalRaw ? Number(originalRaw) : null;
    if (!String(form.get("name") || "").trim() || !Number.isFinite(price) || price < 0 || (originalPrice !== null && (!Number.isFinite(originalPrice) || originalPrice < price))) { setMessage("Vui lòng kiểm tra tên và giá sản phẩm."); setSaving(false); return; }
    const response = await fetch(`/api/products/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      name: form.get("name"), slug: product.slug, description: form.get("description"), contentHtml: html, price, originalPrice, stock: Number(form.get("stock") || 0), status: form.get("status"), categoryId: form.get("categoryId"), tags: form.get("tags"), images: images.map((x) => x.trim()).filter(Boolean), specs: specsJson(), variants,
      brand: policy.brand || null, model: policy.model || null, series: policy.series || null, warranty: policy.warranty || null, condition: policy.condition || null, origin: policy.origin || null,
      seoTitle: seo.seoTitle || null, seoDescription: seo.seoDescription || null, canonicalSlug: seo.canonicalSlug || null,
      isFeatured: flags.isFeatured, isNewArrival: flags.isNewArrival, isFlashSale: flags.isFlashSale, isBestSeller: flags.isBestSeller,
      allowBackorder: policy.allowBackorder, minOrderQty: policy.minOrderQty, maxOrderQty: policy.maxOrderQty === "" ? null : Number(policy.maxOrderQty), lowestPrice30d: policy.lowestPrice30d === "" ? null : Number(policy.lowestPrice30d), publishAt: policy.publishAt || null, unpublishAt: policy.unpublishAt || null,
    }) });
    const result = await response.json().catch(() => ({})); setSaving(false); setMessage(response.ok ? "Đã lưu thay đổi." : result.error || "Không thể lưu sản phẩm.");
    if (response.ok && result.data) { setProduct(result.data); void fetch(`/api/products/${id}/edit-history`).then((r) => r.json()).then((res) => { if (res.success) setHistory(res.data || []); }).catch(() => {}); }
  };

  const saveAsVersion = async () => {
    if (!product) return;
    const snapshot = { name: product.name, slug: product.slug, description: product.description, price: product.price, originalPrice: product.originalPrice, images, stock: product.stock, categoryId: product.categoryId, specs: specsJson(), variants, brand: policy.brand, model: policy.model, series: policy.series, warranty: policy.warranty, condition: policy.condition, origin: policy.origin, seoTitle: seo.seoTitle, seoDescription: seo.seoDescription, isFeatured: flags.isFeatured, isNewArrival: flags.isNewArrival, isFlashSale: flags.isFlashSale };
    try {
      const res = await fetch(`/api/products/${id}/versions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ snapshot }) });
      const result = await res.json();
      if (result.success) { setVersions((prev) => [result.data, ...prev]); setMessage("Đã lưu version thành công."); } else { setMessage(result.error || "Không thể lưu version."); }
    } catch { setMessage("Không thể lưu version."); }
  };

  const restoreVersion = async (versionId: string) => {
    if (!confirm("Khôi phục version này? Dữ liệu hiện tại sẽ bị thay thế.")) return;
    try {
      const res = await fetch(`/api/products/${id}/versions/${versionId}`, { method: "PATCH" });
      const result = await res.json();
      if (result.success) { window.location.reload(); } else { setMessage(result.error || "Không thể khôi phục."); }
    } catch { setMessage("Không thể khôi phục version."); }
  };

  if (loading) return <div className="max-w-5xl mx-auto flex justify-center py-32 text-gray-500"><RefreshCw className="mr-3 animate-spin" /> Đang tải sản phẩm...</div>;
  if (!product) return <div className="max-w-5xl mx-auto py-32 text-center">Không tìm thấy sản phẩm.</div>;

  return <form onSubmit={saveProduct} className="max-w-6xl mx-auto pb-12">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"><div className="flex items-center gap-4"><Link href="/admin/products" className="p-2 bg-white border rounded-lg"><ArrowLeft className="w-5 h-5" /></Link><div><h1 className="text-2xl font-bold">Chỉnh sửa sản phẩm</h1><p className="text-sm text-gray-500">Quản lý nội dung, cấu hình và tồn kho theo từng phiên bản.</p></div></div><button disabled={saving} className="bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg flex items-center gap-2 disabled:opacity-60"><Save className="w-4 h-4" /> {saving ? "Đang lưu..." : "Lưu thay đổi"}</button></div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8"><div className="lg:col-span-2 space-y-8">
      <section className="bg-white rounded-xl border p-6 space-y-5"><h2 className="text-lg font-bold border-b pb-3">Thông tin cơ bản</h2><div><label className="label">Tên sản phẩm *</label><input required name="name" defaultValue={product.name} className="input" /></div><div className="grid grid-cols-2 gap-4"><div><label className="label">Giá mặc định *</label><input required name="price" type="number" min="0" defaultValue={product.price} className="input" /></div><div><label className="label">Giá gốc</label><input name="originalPrice" type="number" min="0" defaultValue={product.originalPrice ?? ""} className="input" /></div></div><div><label className="label">Mô tả ngắn</label><textarea name="description" rows={4} defaultValue={product.description} className="input resize-y" /></div></section>
      <section className="bg-white rounded-xl border p-6"><div className="flex justify-between items-center border-b pb-3 mb-4"><h2 className="text-lg font-bold">Cấu hình / biến thể</h2><button type="button" onClick={addVariant} className="text-blue-600 font-bold text-sm flex gap-1 items-center"><Plus className="w-4 h-4" /> Thêm cấu hình</button></div><p className="text-xs text-gray-500 mb-4">Mỗi SKU là một cấu hình bán độc lập. Giá và tồn kho của biến thể sẽ được ưu tiên trên trang sản phẩm.</p><div className="space-y-5">{variants.map((variant, index) => <div key={variant.id || index} className="rounded-lg border bg-gray-50 p-4 space-y-3"><div className="flex justify-between"><strong className="text-sm">Cấu hình {index + 1}</strong><button type="button" onClick={() => setVariants(variants.filter((_, i) => i !== index))} className="text-red-500"><Trash2 className="w-4 h-4" /></button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><input value={variant.name} onChange={(e) => updateVariant(index, { name: e.target.value })} placeholder="Tên cấu hình (VD: 16GB / 512GB)" className="input" /><input value={variant.sku} onChange={(e) => updateVariant(index, { sku: e.target.value })} placeholder="SKU" className="input" /></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Object.entries(variant.options).map(([key, value]) => <div key={key} className="flex gap-1"><input value={key} onChange={(e) => { const next = { ...variant.options }; delete next[key]; next[e.target.value] = value; updateVariant(index, { options: next }); }} className="input w-1/2" placeholder="Option" /><input value={value} onChange={(e) => updateOption(index, key, e.target.value)} className="input w-1/2" placeholder="Giá trị" /></div>)}</div><button type="button" onClick={() => updateVariant(index, { options: { ...variant.options, Option: "" } })} className="text-xs text-blue-600 font-bold">+ Thêm option</button><div className="grid grid-cols-2 md:grid-cols-4 gap-3"><input type="number" min="0" value={variant.price} onChange={(e) => updateVariant(index, { price: Number(e.target.value) })} className="input" placeholder="Giá bán" /><input type="number" min="0" value={variant.originalPrice ?? ""} onChange={(e) => updateVariant(index, { originalPrice: e.target.value ? Number(e.target.value) : null })} className="input" placeholder="Giá gốc" /><input type="number" min="0" value={variant.stock} onChange={(e) => updateVariant(index, { stock: Number(e.target.value) })} className="input" placeholder="Tồn kho" /><select value={variant.status} onChange={(e) => updateVariant(index, { status: e.target.value })} className="input"><option value="active">Đang bán</option><option value="draft">Bản nháp</option></select></div><input value={variant.image} onChange={(e) => updateVariant(index, { image: e.target.value })} className="input" placeholder="Ảnh riêng của cấu hình (URL, không bắt buộc)" /></div>)}</div>{variants.length === 0 && <p className="text-center text-sm text-gray-400 py-4">Chưa bật cấu hình. Sản phẩm sẽ dùng giá và tồn kho mặc định.</p>}</section>
      <section className="bg-white rounded-xl border p-6"><div className="flex justify-between items-center border-b pb-3 mb-4"><h2 className="text-lg font-bold">Nội dung chi tiết HTML</h2><div className="flex rounded-lg border overflow-hidden text-sm"><button type="button" onClick={() => setHtmlMode("source")} className={`px-3 py-1.5 ${htmlMode === "source" ? "bg-blue-600 text-white" : "bg-white"}`}>HTML</button><button type="button" onClick={() => setHtmlMode("preview")} className={`px-3 py-1.5 ${htmlMode === "preview" ? "bg-blue-600 text-white" : "bg-white"}`}>Xem trước</button></div></div>{htmlMode === "source" ? <textarea value={html} onChange={(e) => setHtml(e.target.value)} rows={14} className="input font-mono text-sm" placeholder="<h2>Đánh giá chi tiết</h2>\n<p>Nội dung sản phẩm...</p>" /> : <div className="prose max-w-none min-h-56 border rounded-lg p-4" dangerouslySetInnerHTML={{ __html: sanitizeHtml(html || "<p>No content</p>") }} />}</section>
      <section className="bg-white rounded-xl border p-6"><h2 className="text-lg font-bold border-b pb-3 mb-4">Thông số kỹ thuật</h2>{specs.map((spec, index) => <div key={index} className="flex gap-2 mb-2"><input value={spec.key} onChange={(e) => setSpecs(specs.map((s, i) => i === index ? { ...s, key: e.target.value } : s))} className="input w-1/3" placeholder="Tên" /><input value={spec.value} onChange={(e) => setSpecs(specs.map((s, i) => i === index ? { ...s, value: e.target.value } : s))} className="input flex-1" placeholder="Giá trị" /><button type="button" onClick={() => setSpecs(specs.filter((_, i) => i !== index))} className="text-red-500"><Trash2 className="w-4 h-4" /></button></div>)}<button type="button" onClick={() => setSpecs([...specs, { key: "", value: "" }])} className="text-blue-600 text-sm font-bold flex items-center gap-1"><Plus className="w-4 h-4" /> Thêm thông số</button></section>
    </div><aside className="space-y-8">
      <section className="bg-white rounded-xl border p-6 space-y-3"><div className="flex justify-between items-center"><h2 className="text-lg font-bold">Lịch sử chỉnh sửa</h2><button type="button" onClick={() => setHistoryOpen(!historyOpen)} className="text-sm text-blue-600 font-bold">{historyOpen ? "Thu gọn" : "Mở rộng"}</button></div>{history.length === 0 ? <p className="text-sm text-gray-400">Chưa có lịch sử.</p> : history.slice(0, historyOpen ? 50 : 3).map((log) => <div key={log.id} className="text-xs border-b border-gray-100 pb-2 last:border-0 last:pb-0"><div className="font-bold text-gray-800">{log.action}</div><div className="text-gray-500">{log.actorName || "system"} • {new Date(log.createdAt).toLocaleString("vi-VN")}</div>{log.snapshot && <pre className="mt-1 text-[11px] bg-gray-50 rounded p-2 overflow-auto whitespace-pre-wrap max-h-40">{log.snapshot}</pre>}</div>)}</section>

      <section className="bg-white rounded-xl border p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-lg font-bold">Phiên bản (Version)</h2>
          <button type="button" onClick={() => setVersionsOpen(!versionsOpen)} className="text-sm text-blue-600 font-bold">{versionsOpen ? "Thu gọn" : "Mở rộng"}</button>
        </div>
        <p className="text-xs text-gray-500">Lưu snapshot trạng thái hiện tại để có thể khôi phục về sau.</p>
        <button type="button" onClick={saveAsVersion} className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-blue-700"><Save className="w-4 h-4" /> Lưu version hiện tại</button>
        {versions.length === 0 ? <p className="text-sm text-gray-400">Chưa có version nào.</p> : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {versions.slice(0, versionsOpen ? 20 : 5).map((v) => {
              let preview: string = "";
              try { const d = JSON.parse(v.data); preview = d.name || ""; } catch { /* ignore */ }
              return (
                <div key={v.id} className="flex items-center justify-between text-xs border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-800">Version {v.version}{preview ? ` — ${preview}` : ""}</div>
                    <div className="text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(v.createdAt).toLocaleString("vi-VN")}</div>
                  </div>
                  <button type="button" onClick={() => restoreVersion(v.id)} className="ml-2 text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-1 shrink-0"><Download className="w-3 h-3" /> Khôi phục</button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl border p-6 space-y-4"><h2 className="text-lg font-bold border-b pb-3">Kho & trạng thái</h2><div><label className="label">Trạng thái</label><select name="status" defaultValue={product.status} className="input"><option value="active">Đang bán</option><option value="draft">Bản nháp</option><option value="archived">Lưu trữ</option></select></div><div><label className="label">Tồn kho mặc định</label><input name="stock" type="number" min="0" defaultValue={product.stock} className="input" /></div>{variants.length > 0 && <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">Tổng tồn kho cấu hình: {variants.reduce((sum, v) => sum + Math.max(0, v.stock), 0)}</p>}</section>

      <section className="bg-white rounded-xl border p-6 space-y-4"><h2 className="text-lg font-bold border-b pb-3">Thông tin vận hành</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{([
        ["brand", "Thương hiệu (brand)"], ["model", "Model / SKU model"], ["series", "Series / Dòng sản phẩm"], ["warranty", "Chính sách bảo hành"], ["condition", "Tình trạng hàng"], ["origin", "Xuất xứ / Origin"]
      ] as [keyof typeof policy, string][]).map(([key, label]) => <div key={key}><label className="label">{label}</label><input value={String(policy[key] ?? "")} onChange={(e) => setPolicy({ ...policy, [key]: e.target.value })} className="input" placeholder={label} /></div>)}</div></section>

      <section className="bg-white rounded-xl border p-6 space-y-4"><h2 className="text-lg font-bold border-b pb-3">SEO & hiển thị</h2><div><label className="label">SEO title</label><input value={seo.seoTitle} onChange={(e) => setSeo({ ...seo, seoTitle: e.target.value })} className="input" placeholder="Lenovo Legion 5 - Giá tốt, giao nhanh | CITILAP.VN" /></div><div><label className="label">Meta description</label><textarea value={seo.seoDescription} onChange={(e) => setSeo({ ...seo, seoDescription: e.target.value })} rows={3} className="input resize-y" placeholder="Mô tả chuẩn SEO cho trang sản phẩm..." /></div><div><label className="label">Canonical slug</label><input value={seo.canonicalSlug} onChange={(e) => setSeo({ ...seo, canonicalSlug: e.target.value })} className="input" placeholder="Để trống nếu dùng slug mặc định" /></div></section>

      <section className="bg-white rounded-xl border p-6 space-y-4"><h2 className="text-lg font-bold border-b pb-3">Cờ trạng thái & chiến lược</h2>{([
        ["isFeatured", "Sản phẩm nổi bật"], ["isNewArrival", "Hàng mới về"], ["isFlashSale", "Deal chớp nhoáng"], ["isBestSeller", "Bán chạy nhất"]
      ] as [keyof typeof flags, string][]).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={flags[key]} onChange={(e) => setFlags({ ...flags, [key]: e.target.checked })} /> {label}</label>)}</section>

      <section className="bg-white rounded-xl border p-6 space-y-4"><h2 className="text-lg font-bold border-b pb-3">Chính sách bán hàng</h2><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={policy.allowBackorder} onChange={(e) => setPolicy({ ...policy, allowBackorder: e.target.checked })} /> Cho phép đặt hàng khi hết kho (preorder)</label><div className="grid grid-cols-2 gap-3"><div><label className="label">Số lượng mua tối thiểu</label><input type="number" min={1} value={policy.minOrderQty} onChange={(e) => setPolicy({ ...policy, minOrderQty: Math.max(1, Number(e.target.value)) })} className="input" /></div><div><label className="label">Số lượng mua tối đa</label><input type="number" min={0} value={policy.maxOrderQty} onChange={(e) => setPolicy({ ...policy, maxOrderQty: e.target.value })} className="input" placeholder="Không giới hạn" /></div></div><div><label className="label">Giá thấp nhất 30 ngày</label><input type="number" min={0} value={policy.lowestPrice30d} onChange={(e) => setPolicy({ ...policy, lowestPrice30d: e.target.value })} className="input" placeholder="Dùng cho hiển thị khuyến mãi an toàn" /></div><div className="grid grid-cols-2 gap-3"><div><label className="label">Lên lịch xuất bản</label><input type="datetime-local" value={policy.publishAt} onChange={(e) => setPolicy({ ...policy, publishAt: e.target.value })} className="input" /></div><div><label className="label">Lên lịch ẩn</label><input type="datetime-local" value={policy.unpublishAt} onChange={(e) => setPolicy({ ...policy, unpublishAt: e.target.value })} className="input" /></div></div></section>

      <section className="bg-white rounded-xl border p-6 space-y-4"><h2 className="text-lg font-bold border-b pb-3">Phân loại & SEO</h2><div><label className="label">Danh mục</label><select required name="categoryId" defaultValue={product.categoryId} className="input">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div><div><label className="label">Tags</label><input name="tags" defaultValue={product.tags || ""} className="input" placeholder="gaming, rtx, 16gb" /></div><div><label className="label">Slug (không đổi ở màn hình sửa)</label><input value={product.slug} readOnly className="input bg-gray-100 text-gray-500" /></div></section>

      <section className="bg-white rounded-xl border p-6"><h2 className="text-lg font-bold border-b pb-3 mb-4">Thư viện ảnh</h2><ImageUploader images={images} onChange={setImages} productId={product.id} /></section>
    </aside></div>{message && <p className="fixed bottom-6 right-6 rounded-lg bg-slate-900 text-white px-4 py-3 text-sm shadow-lg z-50">{message}</p>}<style jsx>{`.label{display:block;font-size:.875rem;font-weight:700;color:#374151;margin-bottom:.5rem}.input{width:100%;border:1px solid #d1d5db;border-radius:.5rem;padding:.625rem .75rem;outline:none}.input:focus{box-shadow:0 0 0 2px #3b82f6}`}</style></form>;
}
