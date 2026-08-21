"use client";

import Link from "next/link";
import { ArrowLeft, Save, Printer, User, MapPin, CreditCard, Truck, Calendar } from "lucide-react";

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  // Mock data
  const order = {
    id: params.id,
    date: "20/08/2026 - 14:30",
    status: "Đang vận chuyển",
    customer: {
      name: "Nguyễn Văn A",
      email: "nguyenvana@gmail.com",
      phone: "0988.123.456",
    },
    shippingAddress: "123 Đường Nguyễn Hữu Cảnh, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh",
    payment: {
      method: "Thanh toán khi nhận hàng (COD)",
      status: "Chưa thanh toán"
    },
    items: [
      { id: 1, name: "Lenovo Legion 5 15ARH7H", variant: "Ryzen 7 6800H / 16GB / 512GB", price: 28490000, quantity: 1, image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=150" },
      { id: 2, name: "Chuột Logitech G102", variant: "Màu Đen", price: 450000, quantity: 2, image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=150" }
    ],
    subtotal: 29390000,
    shipping: 0,
    total: 29390000
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders" className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-blue-600 hover:border-blue-300 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              Đơn hàng <span className="text-blue-600">#{order.id}</span>
              <span className="bg-purple-100 text-purple-800 text-xs px-3 py-1 rounded-full uppercase tracking-wider font-bold">
                {order.status}
              </span>
            </h1>
            <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4" /> Đặt lúc {order.date}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg shadow-sm hover:bg-gray-50 transition flex items-center gap-2">
            <Printer className="w-4 h-4" /> In hóa đơn
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition flex items-center gap-2">
            <Save className="w-4 h-4" /> Cập nhật
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Col: Order Items & Timeline */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Chi tiết sản phẩm</h2>
              <span className="text-sm font-medium text-gray-500">{order.items.length} sản phẩm</span>
            </div>
            <div className="p-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Sản phẩm</th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Đơn giá</th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">SL</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded border border-gray-200 p-1 flex-shrink-0">
                            <img src={item.image} alt="" className="w-full h-full object-contain" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">{item.name}</div>
                            <div className="text-sm text-gray-500 mt-1">{item.variant}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-gray-900">
                        {item.price.toLocaleString("vi-VN")}đ
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500 font-bold">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-red-600">
                        {(item.price * item.quantity).toLocaleString("vi-VN")}đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Totals */}
            <div className="bg-gray-50 p-6 border-t border-gray-200">
              <div className="flex flex-col gap-3 max-w-sm ml-auto">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tạm tính:</span>
                  <span className="font-bold text-gray-900">{order.subtotal.toLocaleString("vi-VN")}đ</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Phí vận chuyển:</span>
                  <span className="font-bold text-gray-900">0đ (Miễn phí)</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between items-end">
                  <span className="font-bold text-gray-900 uppercase">Tổng cộng:</span>
                  <span className="text-2xl font-black text-red-600">{order.total.toLocaleString("vi-VN")}đ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Update Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" /> Cập nhật Trạng thái
            </h2>
            
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Trạng thái đơn hàng</label>
                  <select defaultValue="Đang vận chuyển" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="Chờ xác nhận">Chờ xác nhận</option>
                    <option value="Đang xử lý">Đang xử lý</option>
                    <option value="Đang vận chuyển">Đang vận chuyển</option>
                    <option value="Đã hoàn thành">Đã hoàn thành</option>
                    <option value="Đã hủy">Đã hủy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Trạng thái thanh toán</label>
                  <select defaultValue="Chưa thanh toán" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="Chưa thanh toán">Chưa thanh toán</option>
                    <option value="Đã thanh toán">Đã thanh toán</option>
                    <option value="Đã hoàn tiền">Đã hoàn tiền</option>
                  </select>
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-2">Ghi chú cho khách hàng</label>
                <textarea rows={4} placeholder="Nhập ghi chú hoặc mã vận đơn..." className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
              </div>
            </div>
          </div>

        </div>

        {/* Right Col: Customer & Info */}
        <div className="space-y-6">
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
              <User className="w-5 h-5 text-blue-600" /> Khách hàng
            </h2>
            <div className="space-y-3">
              <div className="font-bold text-gray-900">{order.customer.name}</div>
              <div className="text-sm text-gray-600"><a href={`mailto:${order.customer.email}`} className="hover:text-blue-600">{order.customer.email}</a></div>
              <div className="text-sm text-gray-600"><a href={`tel:${order.customer.phone}`} className="hover:text-blue-600">{order.customer.phone}</a></div>
              <div className="pt-3 border-t border-gray-100 mt-2">
                <Link href="#" className="text-sm font-bold text-blue-600 hover:underline">Xem hồ sơ khách hàng</Link>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
              <MapPin className="w-5 h-5 text-blue-600" /> Giao hàng
            </h2>
            <div className="space-y-3">
              <div className="font-bold text-gray-900">Địa chỉ nhận hàng:</div>
              <p className="text-sm text-gray-600 leading-relaxed">{order.shippingAddress}</p>
              
              <div className="pt-3 border-t border-gray-100 mt-2">
                <div className="font-bold text-gray-900 mb-1">Phương thức vận chuyển:</div>
                <p className="text-sm text-gray-600">Giao hàng tiêu chuẩn</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
              <CreditCard className="w-5 h-5 text-blue-600" /> Thanh toán
            </h2>
            <div className="space-y-3">
              <div className="font-bold text-gray-900">{order.payment.method}</div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Trạng thái:</span>
                <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded font-bold">
                  {order.payment.status}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
