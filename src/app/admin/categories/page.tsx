"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Tag, Search, X, ChevronRight, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  parentId: string | null;
  parent?: { name: string } | null;
  subCategories?: { id: string; name: string; slug: string; _count: { products: number } }[];
  _count: { products: number };
};

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [parentId, setParentId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const loadCategories = async () => {
    const response = await fetch("/api/categories");
    const result = await response.json();
    if (result.success) setCategories(result.data);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load remote data after mount
    void loadCategories();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter: only show root categories in main list (children shown inline)
  const rootCategories = categories.filter(
    (c) => !c.parentId && c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setName("");
    setSlug("");
    setDescription("");
    setImage("");
    setParentId("");
    setEditingId(null);
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setName(category.name);
    setSlug(category.slug);
    setDescription(category.description || "");
    setImage(category.image || "");
    setParentId(category.parentId || "");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const generatedSlug = slug || toSlug(name);
    try {
      const response = editingId
        ? await fetch(`/api/categories/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, slug: generatedSlug, description, image, parentId: parentId || null }),
          })
        : await fetch("/api/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, slug: generatedSlug, description, image, parentId: parentId || null }),
          });
      if (response.ok) {
        setMessage(editingId ? "Đã cập nhật danh mục." : "Đã thêm danh mục mới!");
        resetForm();
        void loadCategories();
      } else {
        const result = await response.json().catch(() => null);
        setMessage(result?.error || "Không thể lưu. Tên hoặc slug có thể đã tồn tại.");
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (category: Category) => {
    if (!window.confirm(`Xóa danh mục "${category.name}"? Hành động này không thể hoàn tác.`)) return;
    const response = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
    if (response.ok) {
      setCategories((items) => items.filter((item) => item.id !== category.id));
      if (editingId === category.id) resetForm();
      setMessage("Đã xóa danh mục.");
    } else {
      const result = await response.json().catch(() => null);
      setMessage(result?.error || "Không thể xóa danh mục có sản phẩm hoặc danh mục con.");
    }
  };

  const totalProducts = categories.reduce((sum, c) => sum + (c._count?.products ?? 0), 0);

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Danh mục</h1>
          <p className="text-sm text-gray-500 mt-1">Tạo, chỉnh sửa và sắp xếp các nhóm sản phẩm trên website.</p>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 flex items-center gap-2">
            <Tag className="w-4 h-4 text-blue-600" />
            <span className="text-gray-600">Tổng:</span>
            <span className="font-bold text-gray-900">{categories.length}</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 flex items-center gap-2">
            <Tag className="w-4 h-4 text-green-600" />
            <span className="text-gray-600">Sản phẩm:</span>
            <span className="font-bold text-gray-900">{totalProducts}</span>
          </div>
        </div>
      </div>

      {/* Toast */}
      {message && (
        <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium">{message}</span>
          <button onClick={() => setMessage("")}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Search bar */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm danh mục..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
              <span className="text-sm text-gray-500 ml-3">{rootCategories.length} danh mục gốc</span>
            </div>

            {/* Category tree */}
            <div className="divide-y divide-gray-100">
              {rootCategories.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  <Tag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p>Không tìm thấy danh mục phù hợp.</p>
                </div>
              ) : (
                rootCategories.map((category) => {
                  const isExpanded = expandedIds.has(category.id);
                  const children = categories.filter((c) => c.parentId === category.id);
                  const isEditing = editingId === category.id;

                  return (
                    <div key={category.id}>
                      {/* Root category row */}
                      <div className={`flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition group ${isEditing ? "bg-blue-50/50" : ""}`}>
                        {/* Expand toggle */}
                        <button
                          onClick={() => toggleExpand(category.id)}
                          className={`w-6 h-6 flex items-center justify-center rounded transition ${children.length > 0 ? "text-gray-400 hover:text-gray-700" : "text-transparent"}`}
                        >
                          {children.length > 0 && (
                            <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          )}
                        </button>

                        {/* Icon / Image */}
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                          {category.image ? (
                            <div className="relative w-full h-full">
                              <Image src={category.image} alt="" fill sizes="40px" className="object-cover" />
                            </div>
                          ) : (
                            <Tag className="w-5 h-5 text-gray-400" />
                          )}
                        </div>

                        {/* Name + slug + description */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{category.name}</span>
                            {children.length > 0 && (
                              <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                                {children.length} con
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 font-mono">/{category.slug}</div>
                          {category.description && (
                            <div className="text-xs text-gray-500 mt-0.5 truncate">{category.description}</div>
                          )}
                        </div>

                        {/* Product count */}
                        <div className="text-center shrink-0">
                          <span className="text-sm font-bold text-gray-900">{category._count?.products ?? 0}</span>
                          <span className="text-[10px] text-gray-400 block">sản phẩm</span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(category)}
                            className="text-blue-600 hover:text-blue-800 p-1.5 rounded-md hover:bg-blue-50 transition"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => void deleteCategory(category)}
                            className="text-red-500 hover:text-red-700 p-1.5 rounded-md hover:bg-red-50 transition"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Children (sub-categories) */}
                      {isExpanded && children.length > 0 && (
                        <div className="bg-gray-50/50 border-t border-gray-100">
                          {children.map((child) => (
                            <div
                              key={child.id}
                              className={`flex items-center gap-4 pl-14 pr-4 py-3 hover:bg-gray-100/50 transition group ${editingId === child.id ? "bg-blue-50/50" : ""}`}
                            >
                              <div className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center shrink-0">
                                <Tag className="w-3.5 h-3.5 text-gray-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-800">{child.name}</span>
                                <span className="text-xs text-gray-400 ml-2 font-mono">/{child.slug}</span>
                              </div>
                              <span className="text-xs text-gray-500 shrink-0">{child._count?.products ?? 0} SP</span>
                              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => startEdit({ ...child, description: null, image: null, parentId: category.id, parent: null, subCategories: [], _count: child._count })}
                                  className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => void deleteCategory({ ...child, description: null, image: null, parentId: category.id, parent: null, subCategories: [], _count: child._count })}
                                  className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Add/Edit Form Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 pb-2 border-b border-gray-100 flex items-center justify-between">
              {editingId ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
              {editingId && (
                <button type="button" onClick={resetForm} title="Hủy chỉnh sửa" className="text-gray-400 hover:text-gray-600 transition">
                  <X className="w-5 h-5" />
                </button>
              )}
            </h2>

            <form onSubmit={saveCategory} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tên danh mục *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingId && !slug) setSlug(toSlug(e.target.value));
                  }}
                  type="text"
                  placeholder="VD: Laptop Gaming"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Đường dẫn (Slug)</label>
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                  <span className="bg-gray-50 px-3 py-2.5 text-sm text-gray-400 border-r border-gray-300">/</span>
                  <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    type="text"
                    placeholder={name ? toSlug(name) : "laptop-gaming"}
                    className="flex-1 px-3 py-2.5 text-sm outline-none bg-white"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Tự tạo từ tên nếu để trống.</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Mô tả</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Mô tả ngắn về danh mục (hiển thị trên SEO)"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition resize-y text-sm"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Ảnh danh mục (URL)</label>
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                    />
                  </div>
                  {image && (
                    <div className="w-10 h-10 rounded border border-gray-200 bg-gray-50 flex-shrink-0 overflow-hidden">
                      <div className="relative w-full h-full">
                        <Image src={image} alt="" fill sizes="40px" className="object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Parent category */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Danh mục cha</label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white transition"
                >
                  <option value="">— Không có (Danh mục cấp 1) —</option>
                  {categories
                    .filter((c) => !c.parentId && c.id !== editingId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Plus className="w-4 h-4" />
                  {saving ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Thêm danh mục"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
