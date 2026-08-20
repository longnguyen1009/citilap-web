import Link from "next/link";
import { Search, Package, Truck, CheckCircle2, MapPin, Phone } from "lucide-react";

export default function OrderTrackingPage() {
  return (
    <div className="bg-[#fcfaf9] min-h-screen pb-12">
      <div className="bg-white border-b border-gray-200 mb-8">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <nav className="flex text-sm text-gray-500 py-3 font-medium items-center">
            <Link href="/" className="hover:text-blue-600 transition">Trang chủ</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-800 font-bold">Tra cứu đơn hàng</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1370px]">
        <div className="max-w-4xl mx-auto">
          {/* Header & Search Form */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8 text-center">
            <h1 className="text-3xl font-black text-gray-900 mb-2 uppercase">Tra cứu đơn hàng</h1>
            <p className="text-gray-500 mb-8 max-w-lg mx-auto">
              Vui lòng nhập mã đơn hàng (đã được gửi qua Email) và số điện thoại mua hàng để kiểm tra tình trạng vận chuyển.
            </p>
            
            <form className="max-w-2xl mx-auto flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Package className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Mã đơn hàng (VD: CTL123456)" 
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition font-medium"
                />
              </div>
              <div className="flex-1 relative">
                <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Số điện thoại mua hàng" 
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition font-medium"
                />
              </div>
              <button 
                type="button" 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
              >
                <Search className="w-5 h-5" />
                Tra cứu
              </button>
            </form>
          </div>

          {/* Result Area (Mock Data) */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="border-b border-gray-100 pb-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Thông tin đơn hàng: #CTL123456</h2>
                <p className="text-gray-500 mt-1">Khách hàng: <strong>Nguyễn Văn A</strong> - 0899.188.186</p>
              </div>
              <div className="bg-green-50 text-green-600 border border-green-100 font-bold px-4 py-2 rounded-lg inline-flex items-center gap-2 w-fit">
                <CheckCircle2 className="w-5 h-5" />
                Đang vận chuyển
              </div>
            </div>

            {/* Timeline */}
            <div className="relative pl-4 md:pl-0">
              {/* Vertical line for mobile */}
              <div className="md:hidden absolute left-8 top-4 bottom-4 w-0.5 bg-gray-200"></div>

              <div className="flex flex-col md:flex-row justify-between relative z-10 gap-8 md:gap-0">
                {/* Horizontal line for desktop */}
                <div className="hidden md:block absolute left-8 right-8 top-6 h-1 bg-gray-100 -z-10">
                  <div className="h-full bg-blue-500 w-[60%]"></div>
                </div>

                {/* Step 1 */}
                <div className="flex md:flex-col items-center gap-4 md:gap-3 md:w-1/4 relative group">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 ring-4 ring-white z-10 shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="md:text-center">
                    <h3 className="font-bold text-gray-900">Xác nhận đơn</h3>
                    <p className="text-sm text-gray-500 mt-1">10:30 - 20/08/2026</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex md:flex-col items-center gap-4 md:gap-3 md:w-1/4 relative group">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 ring-4 ring-white z-10 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="md:text-center">
                    <h3 className="font-bold text-gray-900">Đã lấy hàng</h3>
                    <p className="text-sm text-gray-500 mt-1">14:15 - 20/08/2026</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex md:flex-col items-center gap-4 md:gap-3 md:w-1/4 relative group">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 ring-4 ring-white z-10 shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="md:text-center">
                    <h3 className="font-bold text-blue-600">Đang giao hàng</h3>
                    <p className="text-sm text-gray-500 mt-1">Dự kiến giao trong hôm nay</p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex md:flex-col items-center gap-4 md:gap-3 md:w-1/4 relative group">
                  <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 border-2 border-gray-200 flex items-center justify-center ring-4 ring-white z-10 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="md:text-center">
                    <h3 className="font-bold text-gray-400">Giao thành công</h3>
                    <p className="text-sm text-gray-400 mt-1">Chờ cập nhật</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery details */}
            <div className="mt-12 bg-gray-50 rounded-xl p-6 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                Chi tiết hành trình
              </h3>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-blue-500 text-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-gray-900 text-sm">Đơn hàng đang được giao tới bạn</div>
                      <div className="text-xs font-medium text-blue-600">08:30 - Hôm nay</div>
                    </div>
                    <div className="text-gray-500 text-sm">Shipper: Trần Văn B - 0987.654.321</div>
                  </div>
                </div>
                
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-gray-300 text-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-gray-700 text-sm">Đã đến kho phân loại (Quận 1, TP.HCM)</div>
                      <div className="text-xs font-medium text-gray-500">18:45 - Hôm qua</div>
                    </div>
                    <div className="text-gray-500 text-sm">Đơn hàng đã được phân loại thành công</div>
                  </div>
                </div>

                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-gray-300 text-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-gray-700 text-sm">Cửa hàng đã chuẩn bị xong hàng</div>
                      <div className="text-xs font-medium text-gray-500">14:15 - Hôm qua</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
