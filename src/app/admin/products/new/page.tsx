"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Save, Upload, X, Plus, Trash2 } from "lucide-react";

type Category = { id: string; name: string };

type SpecRow = { key: string; value: string };

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // Dynamic specs
  const [specs, setSpecs] = useState<SpecRow[]>([
    { key: "CPU", value: "" },
    { key: "RAM", value: "" },
    { key: "SSD", value: "" },
    { key: "GPU", value: "" },
    { key: "Màn hình", value: "" },
  ]);

  // Image URLs
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    void fetch("/api/categories")
      .then((r) => r.json())
      .then((result) => { if (result.success) setCategories(result.data); });
  }, []);

  const addSpec = () => setSpecs([...specs, { key: "", value: "" }]);
  const removeSpec = (i: number) => setSpecs(specs.filter((_, idx) => idx !== i));
  const updateSpec = (i: number, field: keyof SpecRow, val: string) => {
    const copy = [...specs];
    copy[i] = { ...copy[i], [field]: val };
    setSpecs(copy);
  };

  const addImageUrl = () => setImageUrls([...imageUrls, ""]);
  const removeImageUrl = (i: number) => setImageUrls(imageUrls.filter((_, idx) => idx !== i));
  const updateImageUrl = (i: number, val: string) => {
    const copy = [...imageUrls];
    copy[i] = val;
    setImageUrls(copy);
  };

  const specsToJSON = (): Record<string, string> => {
    const obj: Record<string, string> = {};
    specs.forEach((s) => { if (s.key.trim() && s.value.trim()) obj[s.key.trim()] = s.value.trim(); });
    return obj;
  };

  const saveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") || "");
    const slug = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const filteredImages = imageUrls.map((u) => u.trim()).filter(Boolean);
    const price = Number(form.get("price"));
    const originalPriceValue = form.get("originalPrice");
    const originalPrice = originalPriceValue ? Number(originalPriceValue) : null;
    if (!name.trim() || !Number.isFinite(price) || price < 0 || (originalPrice !== null && (!Number.isFinite(originalPrice) || originalPrice < price))) {
      setSaving(false);
      setMessage("Vui lòng kiểm tra tên và giá sản phẩm. Giá gốc phải lớn hơn hoặc bằng giá bán.");
      return;
    }
    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, slug,
        price,
        originalPrice,
        description: form.get("description"),
        stock: Number(form.get("stock")),
        status: form.get("status"),
        categoryId: form.get("categoryId"),
        tags: form.get("tags"),
        images: filteredImages.length > 0 ? filteredImages : [],
        specs: specsToJSON(),
      }),
    });
    setSaving(false);
    if (response.ok) {
      setMessage("Đã lưu sản phẩm thành công!");
      setTimeout(() => router.push("/admin/products"), 1000);
    } else {
      setMessage("Không thể lưu. Hãy kiểm tra thông tin bắt buộc.");
    }
  };

  return (
    <form onSubmit={saveProduct} className="max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/products" className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-blue-600 hover:border-blue-300 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Thêm sản phẩm mới</h1>
            <p className="text-sm text-gray-500 mt-1">Điền thông tin chi tiết để đăng bán sản phẩm.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/products" className="bg-white border border-gray-300 text-gray-700 font-medium py-2 px-6 rounded-lg shadow-sm hover:bg-gray-50 transition flex items-center justify-center">
            Hủy
          </Link>
          <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-sm transition flex items-center gap-2 disabled:opacity-60">
            <Save className="w-4 h-4" /> Lưu sản phẩm
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Main Info */}
        <div className="lg:col-span-2 space-y-8">
          {/* Basic Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 pb-2 border-b border-gray-100">Thông tin cơ bản</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tên sản phẩm *</label>
                <input required name="name" type="text" placeholder="VD: Lenovo Legion 5 15ARH7H..." className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Giá bán (VNĐ) *</label>
                  <input required name="price" type="number" min="0" placeholder="0" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Giá gốc (VNĐ)</label>
                  <input name="originalPrice" type="number" min="0" placeholder="Để trống nếu không giảm" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Mô tả sản phẩm</label>
                <textarea name="description" rows={4} placeholder="Mô tả chi tiết về sản phẩm..." className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-y" />
              </div>
            </div>
          </div>

          {/* Images (URL) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 pb-2 border-b border-gray-100">Hình ảnh sản phẩm (URL)</h2>
            <div className="space-y-3">
              {imageUrls.map((url, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => updateImageUrl(i, e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  {url && (
                    <div className="w-10 h-10 rounded border border-gray-200 bg-gray-50 flex-shrink-0 overflow-hidden">
                      <img src={url} alt="" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                  )}
                  <button type="button" onClick={() => removeImageUrl(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addImageUrl} className="mt-3 flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800 transition">
              <Plus className="w-4 h-4" /> Thêm ảnh
            </button>
          </div>

          {/* Dynamic Specs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Thông số kỹ thuật</h2>
              <button type="button" onClick={addSpec} className="text-sm font-bold text-blue-600 flex items-center gap-1 hover:text-blue-800 transition">
                <Plus className="w-4 h-4" /> Thêm thông số
              </button>
            </div>
            <div className="space-y-3">
              {specs.map((spec, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <input
                    type="text"
                    value={spec.key}
                    onChange={(e) => updateSpec(i, "key", e.target.value)}
                    placeholder="Tên (VD: CPU)"
                    className="w-1/3 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium bg-gray-50"
                  />
                  <input
                    type="text"
                    value={spec.value}
                    onChange={(e) => updateSpec(i, "value", e.target.value)}
                    placeholder="Giá trị (VD: Ryzen 7 6800H)"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button type="button" onClick={() => removeSpec(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Organization & Settings */}
        <div className="space-y-8">
          {/* Status & Inventory */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">Kho & Trạng thái</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Trạng thái</label>
                <select name="status" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="active">Đang bán (Hiển thị)</option>
                  <option value="draft">Bản nháp (Ẩn)</option>
                  <option value="archived">Lưu trữ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Số lượng tồn kho</label>
                <input name="stock" type="number" min="0" defaultValue={0} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">Phân loại</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Danh mục chính *</label>
                <select required name="categoryId" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tags</label>
                <input name="tags" type="text" placeholder="gaming, rtx 4060, 16GB..." className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
                <p className="text-xs text-gray-400 mt-1">Cách nhau bởi dấu phẩy</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {message && <p className="fixed bottom-6 right-6 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg z-50">{message}</p>}
    </form>
  );
}
