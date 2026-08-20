"use client";

import Link from "next/link";
import { useState } from "react";
import { User, Package, MapPin, LogOut, ChevronRight, CheckCircle2, Truck, Bell } from "lucide-react";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("info");

  return (
    <div className="bg-[#f1f5f9] min-h-screen pb-12">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <nav className="flex text-sm text-gray-500 py-3 font-medium items-center">
            <Link href="/" className="hover:text-blue-600 transition">Trang chủ</Link>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span className="text-gray-800 font-bold">Tài khoản của tôi</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1370px] mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Sidebar Menu */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
              {/* User Avatar Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-center text-white relative">
                <div className="w-20 h-20 bg-white/20 rounded-full mx-auto mb-3 flex items-center justify-center border-4 border-white shadow-lg backdrop-blur-sm">
                  <span className="text-3xl font-black text-white">A</span>
                </div>
                <h2 className="font-bold text-lg">Nguyễn Văn A</h2>
                <div className="inline-flex items-center gap-1 bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-0.5 rounded-full mt-1 uppercase">
                  Thành viên Vàng
                </div>
              </div>

              {/* Menu Links */}
              <div className="p-3">
                <button 
                  onClick={() => setActiveTab("info")}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left font-semibold rounded-lg transition-colors ${activeTab === 'info' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <User className="w-5 h-5" /> Thông tin tài khoản
                </button>
                <button 
                  onClick={() => setActiveTab("orders")}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left font-semibold rounded-lg transition-colors ${activeTab === 'orders' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Package className="w-5 h-5" /> Lịch sử mua hàng
                </button>
                <button 
                  onClick={() => setActiveTab("address")}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left font-semibold rounded-lg transition-colors ${activeTab === 'address' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <MapPin className="w-5 h-5" /> Sổ địa chỉ
                </button>
                <button 
                  onClick={() => setActiveTab("notifications")}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left font-semibold rounded-lg transition-colors ${activeTab === 'notifications' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5" /> Thông báo
                  </div>
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">3</span>
                </button>
                <div className="h-px bg-gray-100 my-2 mx-4"></div>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-left font-semibold rounded-lg text-red-600 hover:bg-red-50 transition-colors">
                  <LogOut className="w-5 h-5" /> Đăng xuất
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            
            {/* Tab: Thông tin tài khoản */}
            {activeTab === 'info' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h1 className="text-2xl font-black text-gray-900 mb-6 uppercase">Hồ Sơ Của Tôi</h1>
                <p className="text-gray-500 mb-8 pb-6 border-b border-gray-100">Quản lý thông tin hồ sơ để bảo mật tài khoản</p>

                <form className="max-w-2xl space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <label className="text-gray-600 font-semibold md:text-right">Tên đăng nhập</label>
                    <div className="md:col-span-2 text-gray-800 font-bold">nguyen_van_a</div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <label className="text-gray-600 font-semibold md:text-right">Họ và tên</label>
                    <div className="md:col-span-2">
                      <input type="text" defaultValue="Nguyễn Văn A" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <label className="text-gray-600 font-semibold md:text-right">Email</label>
                    <div className="md:col-span-2 flex items-center gap-4">
                      <span className="text-gray-800 font-medium">nguyenvana***@gmail.com</span>
                      <button type="button" className="text-blue-600 text-sm font-bold hover:underline">Thay đổi</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <label className="text-gray-600 font-semibold md:text-right">Số điện thoại</label>
                    <div className="md:col-span-2 flex items-center gap-4">
                      <span className="text-gray-800 font-medium">*********86</span>
                      <button type="button" className="text-blue-600 text-sm font-bold hover:underline">Thay đổi</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <label className="text-gray-600 font-semibold md:text-right">Giới tính</label>
                    <div className="md:col-span-2 flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="gender" defaultChecked className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                        <span>Nam</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="gender" className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                        <span>Nữ</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="gender" className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                        <span>Khác</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center pt-4">
                    <div className="md:col-span-1"></div>
                    <div className="md:col-span-2">
                      <button type="button" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-lg shadow-md transition-colors">
                        Lưu thông tin
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Tab: Lịch sử mua hàng */}
            {activeTab === 'orders' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h1 className="text-2xl font-black text-gray-900 mb-6 uppercase">Lịch sử mua hàng</h1>
                
                {/* Tabs trạng thái */}
                <div className="flex overflow-x-auto border-b border-gray-200 mb-6 hide-scrollbar">
                  {["Tất cả", "Chờ thanh toán", "Đang xử lý", "Đang vận chuyển", "Đã giao", "Đã hủy"].map((tab, i) => (
                    <button key={i} className={`flex-shrink-0 px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${i === 0 ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-blue-600'}`}>
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Danh sách đơn hàng */}
                <div className="space-y-6">
                  {/* Order 1 */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-6 py-3 flex justify-between items-center border-b border-gray-200">
                      <div className="font-bold text-gray-800 text-sm">Đơn hàng #CTL123456</div>
                      <div className="text-blue-600 font-bold text-sm flex items-center gap-2 uppercase">
                        <Truck className="w-4 h-4" /> Đang vận chuyển
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex gap-4">
                        <img src="https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=200&auto=format&fit=crop" alt="product" className="w-20 h-20 object-contain border border-gray-200 rounded-lg p-2" />
                        <div className="flex-grow">
                          <h3 className="font-bold text-gray-900 text-sm mb-1">Lenovo Legion 5 15ARH7H (Ryzen 7 6800H / 16GB / 512GB)</h3>
                          <p className="text-gray-500 text-sm">Phân loại: Xám</p>
                          <div className="text-sm text-gray-500 mt-1">x1</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="font-bold text-gray-900">28.490.000đ</span>
                        </div>
                      </div>
                      <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between items-center">
                        <span className="text-gray-500 text-sm">Ngày đặt: 20/08/2026</span>
                        <div className="flex gap-3">
                          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition">Chi tiết đơn</button>
                          <Link href="/order-tracking" className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-bold text-white hover:bg-blue-700 transition shadow-md shadow-blue-600/20">Theo dõi</Link>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order 2 */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-6 py-3 flex justify-between items-center border-b border-gray-200">
                      <div className="font-bold text-gray-800 text-sm">Đơn hàng #CTL987654</div>
                      <div className="text-green-600 font-bold text-sm flex items-center gap-2 uppercase">
                        <CheckCircle2 className="w-4 h-4" /> Đã giao thành công
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex gap-4">
                        <img src="https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=200&auto=format&fit=crop" alt="product" className="w-20 h-20 object-contain border border-gray-200 rounded-lg p-2" />
                        <div className="flex-grow">
                          <h3 className="font-bold text-gray-900 text-sm mb-1">Chuột Logitech G102 Lightsync</h3>
                          <p className="text-gray-500 text-sm">Phân loại: Đen</p>
                          <div className="text-sm text-gray-500 mt-1">x1</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="font-bold text-gray-900">450.000đ</span>
                        </div>
                      </div>
                      <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between items-center">
                        <span className="text-gray-500 text-sm">Ngày đặt: 10/05/2026</span>
                        <div className="flex gap-3">
                          <button className="px-4 py-2 border border-blue-600 rounded-lg text-sm font-bold text-blue-600 hover:bg-blue-50 transition">Mua lại</button>
                          <button className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-bold text-white hover:bg-blue-700 transition shadow-md shadow-blue-600/20">Đánh giá</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Other tabs placeholder */}
            {activeTab !== 'info' && activeTab !== 'orders' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 min-h-[400px] flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="font-bold text-lg">Tính năng đang được cập nhật</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
