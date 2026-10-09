"use client";

import Link from "next/link";
import { Search, Package, Phone, AlertCircle } from "lucide-react";
import { useState } from "react";
import { businessProfile } from "@/config/business-profile";

export default function OrderTrackingPage() {
  const [orderCode, setOrderCode] = useState("");
  const [phone, setPhone] = useState("");
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<{
    found: boolean;
    orderNumber?: string;
    status?: string;
    message?: string;
  } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderCode.trim() || !phone.trim()) return;

    setLoading(true);
    setSearched(true);

    // Thông báo trạng thái tra cứu cho khách
    setTimeout(() => {
      setLoading(false);
      setLookupResult({
        found: false,
        message: `Hệ thống chưa tìm thấy đơn hàng "${orderCode.trim()}" khớp với số điện thoại "${phone.trim()}". Vui lòng kiểm tra lại mã đơn (dạng CTL-YYYYMMDD-XXXX) hoặc liên hệ Hotline ${businessProfile.displayPhone} để được chuyên viên hỗ trợ tra cứu trực tiếp.`,
      });
    }, 600);
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-16">
      {/* 1. Breadcrumb */}
      <div className="bg-white border-b border-gray-200 mb-8">
        <div className="container mx-auto px-4 max-w-[1240px]">
          <nav className="flex text-sm text-gray-500 py-3.5 font-medium items-center">
            <Link href="/" className="hover:text-blue-600 transition">
              Trang chủ
            </Link>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-900 font-bold">Tra cứu đơn hàng</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1240px]">
        <div className="max-w-2xl mx-auto">
          {/* 2. Header & Search Form */}
          <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-sm border border-gray-200 text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <Package className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2 uppercase tracking-tight">
              Tra cứu đơn hàng
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mb-6 max-w-md mx-auto leading-relaxed">
              Vui lòng nhập mã đơn hàng (được cấp khi đặt hàng thành công) và số điện thoại để kiểm tra trạng thái xử lý.
            </p>

            <form onSubmit={handleSearch} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mã đơn hàng *
                </label>
                <div className="relative">
                  <Package className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={orderCode}
                    onChange={(e) => setOrderCode(e.target.value)}
                    placeholder="Ví dụ: CTL-20261009-XXXX"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Số điện thoại người nhận *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ví dụ: 0988 776 655"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-xl text-sm transition uppercase shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                {loading ? "Đang tìm kiếm..." : "Tra cứu yêu cầu đặt hàng"}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span>Cần hỗ trợ tra cứu nhanh?</span>
              <a
                href={businessProfile.telHref}
                className="font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <Phone className="w-3.5 h-3.5" /> Hotline: {businessProfile.displayPhone}
              </a>
            </div>
          </div>

          {/* 3. Lookup Result State */}
          {searched && lookupResult && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-200 animate-in fade-in">
              <div className="flex items-start gap-3.5 text-sm text-gray-700">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="font-bold text-gray-900 text-base">Kết quả tra cứu</h3>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                    {lookupResult.message}
                  </p>
                  <p className="text-xs text-gray-500">
                    Chuyên viên chăm sóc khách hàng CitiLap hỗ trợ tra cứu trực tiếp qua hotline <strong>{businessProfile.displayPhone}</strong> từ 09:00 đến 20:00 (Thứ 2 đến Thứ 7).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
