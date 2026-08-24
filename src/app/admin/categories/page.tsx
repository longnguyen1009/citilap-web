"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Tag, Search, X } from "lucide-react";

type Category = { id: string; name: string; slug: string; parentId: string | null; parent?: { name: string } | null; _count: { products: number } };

function toSlug(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const loadCategories = async () => {
    const response = await fetch("/api/categories");
    const result = await response.json();
    if (result.success) setCategories(result.data);
  };

  useEffect(() => {
    let canceled = false;
    const load = async () => { const response = await fetch("/api/categories"); const result = await response.json(); if (result.success && !canceled) setCategories(result.data); };
    void load();
    return () => { canceled = true; };
  }, []);

  const visibleCategories = categories.filter((category) => category.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const resetForm = () => {
    setName("");
    setSlug("");
    setParentId("");
    setEditingId(null);
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setName(category.name);
    setSlug(category.slug);
    setParentId(category.parentId || "");
    setMessage("");
  };

  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const generatedSlug = slug || toSlug(name);
    try {
      const response = editingId
        ? await fetch(`/api/categories/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, slug: generatedSlug, parentId: parentId || null }) })
        : await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, slug: generatedSlug, parentId: parentId || null }) });
      if (response.ok) {
        setMessage(editingId ? "Đã cập nhật danh mục." : "Đã thêm danh mục.");
        resetForm();
        void loadCategories();
      } else {
        const result = await response.json().catch(() => null);
        setMessage(result?.error || "Không thể lưu danh mục. Tên hoặc slug có thể đã tồn tại.");
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (category: Category) => {
    if (!window.confirm(`Xóa danh mục “${category.name}”?`)) return;
    const response = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
    if (response.ok) {
      setCategories((items) => items.filter((item) => item.id !== category.id));
      if (editingId === category.id) resetForm();
      setMessage("Đã xóa danh mục.");
    } else {
      setMessage("Danh mục đã có sản phẩm hoặc danh mục con nên không thể xóa.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Danh mục</h1>
          <p className="text-sm text-gray-500 mt-1">Sắp xếp và cấu trúc các nhóm sản phẩm trên website.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Main List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
              <div className="relative max-w-sm w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Tìm kiếm danh mục..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition"
                />
              </div>
              <span className="text-sm text-gray-500">{visibleCategories.length} danh mục</span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                      Tên danh mục
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">
                      Số SP
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visibleCategories.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-500">Không tìm thấy danh mục phù hợp.</td></tr>
                  ) : (
                    visibleCategories.map((category) => (
                      <tr key={category.id} className={`hover:bg-gray-50 transition group ${editingId === category.id ? "bg-blue-50/50" : ""}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                              <Tag className="w-5 h-5" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-bold text-gray-900">{category.name}</div>
                              <div className="text-xs text-gray-500 mt-1">{category.parent?.name ? `Danh mục con của ${category.parent.name}` : "Danh mục cấp 1"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900">
                          {category._count.products}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" title="Chỉnh sửa" onClick={() => startEdit(category)} className="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded-md hover:bg-blue-100 transition">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button type="button" title="Xóa" onClick={() => void deleteCategory(category)} className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-md hover:bg-red-100 transition">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add/Edit Form Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 pb-2 border-b border-gray-100 flex items-center justify-between">
              {editingId ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
              {editingId && (
                <button type="button" onClick={resetForm} title="Hủy chỉnh sửa" className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              )}
            </h2>

            <form onSubmit={saveCategory} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tên danh mục *</label>
                <input required value={name} onChange={(event) => setName(event.target.value)} type="text" placeholder="VD: Laptop Gaming..." className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Đường dẫn (Slug)</label>
                <input value={slug} onChange={(event) => setSlug(event.target.value)} type="text" placeholder="laptop-gaming" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 text-gray-500 transition" />
                <p className="text-xs text-gray-500 mt-2">Đường dẫn URL sẽ tự động tạo từ tên danh mục nếu để trống.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Danh mục cha</label>
                <select value={parentId} onChange={(event) => setParentId(event.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white transition">
                  <option value="">Không có (Danh mục cấp 1)</option>
                  {categories
                    .filter((category) => !category.parentId && category.id !== editingId)
                    .map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </div>

              <div className="pt-2">
                <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-60">
                  <Plus className="w-4 h-4" /> {editingId ? "Lưu thay đổi" : "Thêm danh mục"}
                </button>
                {message && <p className="text-sm text-center text-gray-500 mt-3">{message}</p>}
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
