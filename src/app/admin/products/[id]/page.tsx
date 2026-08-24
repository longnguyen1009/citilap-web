"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ArrowLeft, Save, RefreshCw } from "lucide-react";

type Category = { id: string; name: string };

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice: number | null;
  images: string;
  stock: number;
  status: string;
  specs: string | null;
  tags: string | null;
  categoryId: string;
};

function parseImages(images: string): string[] {
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : images ? [images] : [];
  } catch {
    return images ? images.split(",").map((s) => s.trim()).filter(Boolean) : [];
  }
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [productRes, categoriesRes] = await Promise.all([
          fetch(`/api/products/${id}`),
          fetch("/api/categories"),
        ]);
        const productResult = await productRes.json();
        const categoriesResult = await categoriesRes.json();
        if (canceled) return;
        if (productResult.success) setProduct(productResult.data);
        if (categoriesResult.success) setCategories(categoriesResult.data);
      } finally {
        if (!canceled) setLoading(false);
      }
    };
    void load();
    return () => { canceled = true; };
  }, [id]);

  const saveProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!product) return;
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "");
    const originalPrice = form.get("originalPrice");
    const response = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug: product.slug, // giữ nguyên slug để không vỡ URL cũ
        price: Number(form.get("price")),
        originalPrice: originalPrice ? Number(originalPrice) : null,
        description: form.get("description"),
        stock: Number(form.get("stock")),
        status: form.get("status"),
        categoryId: form.get("categoryId"),
        tags: form.get("tags"),
        images: parseImages(product.images),
      }),
    });
    setSaving(false);
    setMessage(response.ok ? "Đã lưu thay đổi." : "Không thể lưu. Hãy kiểm tra thông tin bắt buộc.");
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center py-32 text-gray-500">
        <RefreshCw className="w-5 h-5 animate-spin mr-3" /> Đang tải sản phẩm...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-5xl mx-auto py-32 text-center">
        <p className="text-gray-500 mb-4">Không tìm thấy sản phẩm.</p>
        <Link href="/admin/products" className="text-blue-600 font-bold hover:underline">← Quay lại danh sách</Link>
      </div>
    );
  }

  const images = parseImages(product.images);

  return (
    <form onSubmit={saveProduct} className="max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/products" className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-blue-600 hover:border-blue-300 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chỉnh sửa sản phẩm</h1>
            <p className="text-sm text-gray-500 mt-1">Cập nhật thông tin, giá bán và tồn kho.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/products" className="bg-white border border-gray-300 text-gray-700 font-medium py-2 px-6 rounded-lg shadow-sm hover:bg-gray-50 transition flex items-center justify-center">
            Hủy
          </Link>
          <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-sm transition flex items-center gap-2 disabled:opacity-60">
            <Save className="w-4 h-4" /> Lưu thay đổi
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 pb-2 border-b border-gray-100">Thông tin cơ bản</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tên sản phẩm *</label>
                <input required name="name" defaultValue={product.name} type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Giá bán (VNĐ) *</label>
                  <input required name="price" defaultValue={product.price} type="number" min="0" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Giá gốc (VNĐ)</label>
                  <input name="originalPrice" defaultValue={product.originalPrice ?? ""} type="number" min="0" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Mô tả</label>
                <textarea name="description" rows={5} defaultValue={product.description} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 pb-2 border-b border-gray-100">Hình ảnh sản phẩm</h2>
            {images.length === 0 ? (
              <p className="text-sm text-gray-500">Sản phẩm chưa có hình ảnh.</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
                {images.map((src, i) => (
                  <div key={i} className="aspect-square border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <img src={src} alt="" className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-4">Tính năng tải ảnh lên sẽ được bổ sung sau.</p>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">Kho & Trạng thái</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Trạng thái</label>
                <select name="status" defaultValue={product.status} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="active">Đang bán (Hiển thị)</option>
                  <option value="draft">Bản nháp (Ẩn)</option>
                  <option value="archived">Lưu trữ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Số lượng tồn kho</label>
                <input name="stock" defaultValue={product.stock} type="number" min="0" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">Phân loại</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Danh mục chính</label>
                <select required name="categoryId" defaultValue={product.categoryId} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tags</label>
                <input name="tags" defaultValue={product.tags ?? ""} type="text" placeholder="tag1, tag2, tag3" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {message && <p className="fixed bottom-6 right-6 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg">{message}</p>}
    </form>
  );
}
