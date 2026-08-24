"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Edit, Trash2, Tag, RefreshCw } from "lucide-react";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  status: string;
  images: string;
  category?: { name: string } | null;
};

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=150";

function getImage(images: string) {
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) && parsed[0] ? parsed[0] : FALLBACK_IMAGE;
  } catch {
    return images || FALLBACK_IMAGE;
  }
}

const statusLabel: Record<string, { text: string; className: string }> = {
  active: { text: "Đang bán", className: "bg-green-100 text-green-800" },
  draft: { text: "Bản nháp", className: "bg-gray-100 text-gray-600" },
  archived: { text: "Lưu trữ", className: "bg-yellow-100 text-yellow-800" },
};

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadProducts = useCallback(async (search: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/products${search ? `?search=${encodeURIComponent(search)}` : ""}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error);
      setProducts(result.data);
    } catch {
      setMessage("Không thể tải danh sách sản phẩm.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/products${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ""}`);
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error);
        if (!canceled) setProducts(result.data);
      } catch {
        if (!canceled) setMessage("Không thể tải danh sách sản phẩm.");
      } finally {
        if (!canceled) setLoading(false);
      }
    };
    void load();
    return () => { canceled = true; };
  }, [searchTerm]);

  const categories = useMemo(() => [...new Set(products.map((product) => product.category?.name).filter(Boolean))], [products]);
  const filteredProducts = products.filter((product) => {
    const categoryMatches = !categoryFilter || product.category?.name === categoryFilter;
    const stockMatches = !stockFilter || (stockFilter === "in" ? product.stock > 0 : product.stock === 0);
    const statusMatches = !statusFilter || product.status === statusFilter;
    return categoryMatches && stockMatches && statusMatches;
  });

  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`Xóa sản phẩm “${product.name}”?`)) return;
    const response = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    if (response.ok) {
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setMessage("Đã xóa sản phẩm.");
    } else {
      setMessage("Không thể xóa sản phẩm.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Sản phẩm</h1>
          <p className="text-sm text-gray-500 mt-1">Thêm, sửa, xoá và quản lý kho hàng của bạn.</p>
        </div>
        <Link
          href="/admin/products/new"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm shadow-blue-600/30 transition flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> Thêm sản phẩm
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between bg-gray-50/50">
          <div className="relative max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm tên sản phẩm, mã SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              <option value="">Tất cả danh mục</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              <option value="">Trạng thái đăng</option>
              <option value="active">Đang bán</option>
              <option value="draft">Bản nháp</option>
              <option value="archived">Lưu trữ</option>
            </select>
            <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              <option value="">Trạng thái kho</option>
              <option value="in">Còn hàng</option>
              <option value="out">Hết hàng</option>
            </select>
            <button type="button" onClick={() => void loadProducts(searchTerm)} title="Tải lại" className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition"><RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} /></button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Sản phẩm
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Danh mục
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Giá bán
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Kho hàng
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Đang tải sản phẩm...</td></tr> : filteredProducts.length === 0 ? <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Không tìm thấy sản phẩm phù hợp.</td></tr> : filteredProducts.map((product) => {
                const status = statusLabel[product.status] || statusLabel.active;
                return (
                  <tr key={product.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded border border-gray-200 p-1 flex-shrink-0 bg-white">
                          <img src={getImage(product.images)} alt={product.name} className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{product.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">SKU: {product.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">
                        <Tag className="w-3.5 h-3.5" />
                        {product.category?.name || "Chưa phân loại"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {product.price.toLocaleString("vi-VN")}đ
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.stock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2.5 py-1 inline-flex w-fit text-xs leading-5 font-bold rounded-full ${status.className}`}>
                          {status.text}
                        </span>
                        <span className={`px-2.5 py-1 inline-flex w-fit text-xs leading-5 font-bold rounded-full ${
                          product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {product.stock > 0 ? "Còn hàng" : "Hết hàng"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/products/${product.id}`} title="Chỉnh sửa" className="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded-md hover:bg-blue-100 transition">
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button type="button" title="Xóa" onClick={() => void deleteProduct(product)} className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-md hover:bg-red-100 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-700">
            Hiển thị <span className="font-bold">{filteredProducts.length}</span> trong số <span className="font-bold">{products.length}</span> sản phẩm
          </div>
          <div className="flex gap-2">
            <span className="text-sm text-gray-500">{message}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
