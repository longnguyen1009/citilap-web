"use client";

import Link from "next/link";
import { Plus, Edit, Trash2, Tag, Laptop, Monitor, Mouse, Search, MoreVertical, Check, X } from "lucide-react";

export default function CategoriesPage() {
  const categories = [
    { id: "CAT-001", name: "Laptop Gaming", slug: "laptop-gaming", icon: Laptop, productsCount: 145, status: "Hoạt động", type: "Danh mục chính" },
    { id: "CAT-002", name: "Laptop Văn phòng", slug: "laptop-van-phong", icon: Laptop, productsCount: 230, status: "Hoạt động", type: "Danh mục chính" },
    { id: "CAT-003", name: "Phụ kiện", slug: "phu-kien", icon: Mouse, productsCount: 450, status: "Hoạt động", type: "Danh mục chính" },
    { id: "CAT-004", name: "Màn hình", slug: "man-hinh", icon: Monitor, productsCount: 85, status: "Hoạt động", type: "Danh mục chính" },
    { id: "CAT-005", name: "Bàn phím cơ", slug: "ban-phim-co", icon: Tag, productsCount: 120, status: "Hoạt động", type: "Danh mục con (Thuộc Phụ kiện)" },
    { id: "CAT-006", name: "Chuột Gaming", slug: "chuot-gaming", icon: Tag, productsCount: 95, status: "Ẩn", type: "Danh mục con (Thuộc Phụ kiện)" },
  ];

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Danh mục</h1>
          <p className="text-sm text-gray-500 mt-1">Sắp xếp và cấu trúc các nhóm sản phẩm trên website.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm shadow-blue-600/30 transition flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" /> Thêm danh mục
        </button>
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
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition"
                />
              </div>
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
                    <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">
                      Trạng thái
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50 transition group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                            <category.icon className="w-5 h-5" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-gray-900">{category.name}</div>
                            <div className="text-xs text-gray-500 mt-1">{category.type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900">
                        {category.productsCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {category.status === "Hoạt động" ? (
                          <span className="inline-flex items-center justify-center p-1 rounded-full bg-green-100 text-green-600">
                            <Check className="w-4 h-4" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center p-1 rounded-full bg-gray-100 text-gray-400">
                            <X className="w-4 h-4" />
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded-md hover:bg-blue-100 transition">
                            <Edit className="w-4 h-4" />
                          </button>
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
          </div>
        </div>

        {/* Add/Edit Form Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 pb-2 border-b border-gray-100 flex items-center justify-between">
              Thêm/Sửa danh mục
              <button className="text-gray-400 hover:text-gray-600"><MoreVertical className="w-5 h-5" /></button>
            </h2>

            <form className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tên danh mục *</label>
                <input type="text" placeholder="VD: Laptop Gaming..." className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Đường dẫn (Slug)</label>
                <input type="text" placeholder="laptop-gaming" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 text-gray-500 transition" />
                <p className="text-xs text-gray-500 mt-2">Đường dẫn URL sẽ tự động tạo từ tên danh mục nếu để trống.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Danh mục cha</label>
                <select className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white transition">
                  <option value="">Không có (Danh mục cấp 1)</option>
                  <option value="laptop-gaming">Laptop Gaming</option>
                  <option value="phu-kien">Phụ kiện</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Mô tả</label>
                <textarea rows={3} placeholder="Mô tả về danh mục này..." className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition"></textarea>
              </div>
              
              <div className="pt-2">
                <button type="button" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-sm transition">
                  Lưu danh mục
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
