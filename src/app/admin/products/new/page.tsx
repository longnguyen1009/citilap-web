"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Save, Upload, Image as ImageIcon, X, Plus } from "lucide-react";

type Category = { id: string; name: string };

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { void fetch("/api/categories").then((response) => response.json()).then((result) => { if (result.success) setCategories(result.data); }); }, []);
  const saveProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "");
    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const response = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, slug, price: Number(form.get("price")), originalPrice: form.get("originalPrice"), description: form.get("description"), stock: Number(form.get("stock")), status: form.get("status"), categoryId: form.get("categoryId"), images: [] }) });
    setSaving(false);
    if (response.ok) {
      setMessage("Đã lưu sản phẩm.");
      router.push("/admin/products");
    } else {
      setMessage("Không thể lưu sản phẩm. Hãy kiểm tra danh mục và thông tin bắt buộc.");
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
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Basic Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 pb-2 border-b border-gray-100">Thông tin cơ bản</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tên sản phẩm *</label>
                <input required name="name" type="text" placeholder="Nhập tên sản phẩm (VD: Lenovo Legion 5...)" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Giá bán (VNĐ) *</label>
                  <input required name="price" type="number" min="0" placeholder="0" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Giá gốc (VNĐ)</label>
                  <input name="originalPrice" type="number" min="0" placeholder="0" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Mô tả ngắn</label>
                <textarea name="description" rows={3} placeholder="Mô tả nổi bật về sản phẩm..." className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
              </div>
            </div>
          </div>

          {/* Media / Images */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 pb-2 border-b border-gray-100">Hình ảnh sản phẩm</h2>
            
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition cursor-pointer mb-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <p className="font-bold text-gray-700 mb-1">Click để tải ảnh lên</p>
              <p className="text-sm text-gray-500">Hoặc kéo thả file vào đây (PNG, JPG, max 5MB)</p>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="aspect-square border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 bg-gray-50">
                  <ImageIcon className="w-6 h-6 opacity-50" />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4">Tính năng tải ảnh lên sẽ được bổ sung sau. Ảnh sản phẩm hiện được quản lý qua URL.</p>
          </div>

          {/* Specifications */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Thông số kỹ thuật</h2>
              <button className="text-sm font-bold text-blue-600 flex items-center gap-1 hover:text-blue-800 transition">
                <Plus className="w-4 h-4" /> Thêm thông số
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <input type="text" defaultValue="CPU" className="w-1/3 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium bg-gray-50" />
                <div className="flex-1 flex gap-2">
                  <input type="text" placeholder="VD: Intel Core i7-13700H" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"><X className="w-5 h-5" /></button>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <input type="text" defaultValue="RAM" className="w-1/3 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium bg-gray-50" />
                <div className="flex-1 flex gap-2">
                  <input type="text" placeholder="VD: 16GB DDR5 4800MHz" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"><X className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <input type="text" placeholder="Tên thông số (VD: Màn hình)" className="w-1/3 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <div className="flex-1 flex gap-2">
                  <input type="text" placeholder="Giá trị (VD: 15.6 inch FHD 144Hz)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  <button className="p-2 text-gray-400 cursor-not-allowed rounded-lg transition"><X className="w-5 h-5" /></button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column - Organization & Settings */}
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
                <input name="stock" type="number" min="0" placeholder="0" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Mã sản phẩm (SKU)</label>
                <input type="text" placeholder="VD: LNV-LG5-01" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
              </div>
            </div>
          </div>

          {/* Organization */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">Phân loại</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Danh mục chính</label>
                <select required name="categoryId" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Thương hiệu</label>
                <select className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">-- Chọn thương hiệu --</option>
                  <option value="lenovo">Lenovo</option>
                  <option value="asus">Asus</option>
                  <option value="dell">Dell</option>
                  <option value="apple">Apple</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tags</label>
                <input type="text" placeholder="Nhập tag, cách nhau bởi dấu phẩy" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-md flex items-center gap-1">gaming <X className="w-3 h-3 cursor-pointer" /></span>
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-md flex items-center gap-1">rtx 3050 <X className="w-3 h-3 cursor-pointer" /></span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
      {message && <p className="fixed bottom-6 right-6 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg">{message}</p>}
    </form>
  );
}
