"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Search, Filter, Edit, Trash2, Tag } from "lucide-react";

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const products = [
    { id: "PROD-001", name: "Lenovo Legion 5 15ARH7H", category: "Laptop Gaming", price: 28490000, stock: 15, status: "Còn hàng", image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=150" },
    { id: "PROD-002", name: "MacBook Pro 14 M3", category: "Laptop Văn phòng", price: 39990000, stock: 8, status: "Còn hàng", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=150" },
    { id: "PROD-003", name: "Chuột Logitech G102", category: "Phụ kiện", price: 450000, stock: 0, status: "Hết hàng", image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=150" },
    { id: "PROD-004", name: "Bàn phím cơ Akko 3098", category: "Phụ kiện", price: 1250000, stock: 24, status: "Còn hàng", image: "https://images.unsplash.com/photo-1595225476474-87563907a212?q=80&w=150" },
    { id: "PROD-005", name: "Màn hình Dell UltraSharp U2723QE", category: "Màn hình", price: 14500000, stock: 5, status: "Còn hàng", image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=150" },
  ];

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
          <div className="flex gap-2">
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              <option value="">Tất cả danh mục</option>
              <option value="Laptop Gaming">Laptop Gaming</option>
              <option value="Laptop Văn phòng">Laptop Văn phòng</option>
              <option value="Phụ kiện">Phụ kiện</option>
            </select>
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              <option value="">Trạng thái kho</option>
              <option value="Còn hàng">Còn hàng</option>
              <option value="Hết hàng">Hết hàng</option>
            </select>
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
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded border border-gray-200 p-1 flex-shrink-0 bg-white">
                        <img src={product.image} alt="" className="w-full h-full object-contain" />
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
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {product.price.toLocaleString("vi-VN")}đ
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {product.stock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                      product.status === 'Còn hàng' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/products/${product.id}`} className="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded-md hover:bg-blue-100 transition">
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-md hover:bg-red-100 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-700">
            Hiển thị <span className="font-bold">1</span> đến <span className="font-bold">5</span> trong số <span className="font-bold">45</span> sản phẩm
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-gray-300 rounded bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">Trước</button>
            <button className="px-3 py-1 border border-gray-300 rounded bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">Tiếp</button>
          </div>
        </div>
      </div>
    </div>
  );
}
