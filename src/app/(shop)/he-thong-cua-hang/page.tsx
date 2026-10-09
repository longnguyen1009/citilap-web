import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight,
  MapPin,
  Phone,
  ExternalLink,
  Store,
} from "lucide-react";
import { businessProfile } from "@/config/business-profile";

export const metadata: Metadata = {
  title: `Hệ thống showroom & chi nhánh | ${businessProfile.brandName}`,
  description: `Hệ thống cơ sở ${businessProfile.brandName} tại Hà Nội và Bắc Ninh. Địa chỉ, hotline, giờ mở cửa Thứ 2 – Thứ 7: 09:00 – 20:00 (Chủ nhật hẹn trước). Trải nghiệm trực tiếp laptop gaming & ultrabook.`,
  alternates: {
    canonical: `${businessProfile.canonicalSiteUrl}/he-thong-cua-hang`,
  },
  openGraph: {
    title: `Hệ thống cơ sở ${businessProfile.brandName}`,
    description: `Cơ sở Hà Nội: Số 23/40 Tạ Quang Bửu • Cơ sở Bắc Ninh: Số 40 Trần Hưng Đạo. Giờ làm việc: 09:00 - 20:00.`,
    url: `${businessProfile.canonicalSiteUrl}/he-thong-cua-hang`,
  },
};

export default function StoresPage() {
  const hanoi = businessProfile.locations.find((l) => l.id === "hanoi")!;
  const bacNinh = businessProfile.locations.find((l) => l.id === "bac-ninh")!;
  const hcm = businessProfile.locations.find((l) => l.id === "hcm")!;

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-16">
      {/* 1. Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-[1240px]">
          <nav className="flex text-sm text-gray-500 py-3.5 font-medium items-center">
            <Link href="/" className="hover:text-blue-600 transition">
              Trang chủ
            </Link>
            <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            <span className="text-gray-900 font-bold">Hệ thống cơ sở CitiLap</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1240px] mt-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
            <Store className="w-3.5 h-3.5" /> Điểm trải nghiệm sản phẩm thực tế
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tight">
            Hệ thống cơ sở & Showroom
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            Quý khách có thể đến trực tiếp trải nghiệm máy, kiểm tra ngoại hình và nhận tư vấn cấu hình từ các kỹ thuật viên giàu kinh nghiệm.
          </p>
        </div>

        {/* 2. Stores Grid */}
        <div className="space-y-12 mb-16">
          {/* Card 1: Hà Nội (Head Office & Online Pickup) */}
          <div id="hanoi" className="bg-white rounded-3xl border-2 border-blue-600/90 shadow-md overflow-hidden">
            <div className="p-6 md:p-8 lg:p-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 uppercase tracking-wider">
                      Trụ sở chính • Đang hoạt động
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      Điểm nhận đơn Online
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-gray-900">
                    {hanoi.name}
                  </h2>
                </div>

                <div className="flex flex-wrap gap-3">
                  <a
                    href={hanoi.telHref}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-2 shadow-sm"
                  >
                    <Phone className="w-4 h-4" /> Gọi hotline: {hanoi.displayPhone}
                  </a>
                  {hanoi.mapsUrl && (
                    <a
                      href={hanoi.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition inline-flex items-center gap-2"
                    >
                      <MapPin className="w-4 h-4 text-red-500" /> Chỉ đường Google Maps <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-gray-100 text-sm">
                <div className="space-y-1">
                  <span className="text-xs text-gray-400 font-semibold uppercase">Địa chỉ cơ sở</span>
                  <p className="font-bold text-gray-900">{hanoi.address}</p>
                  <p className="text-xs text-blue-600 font-medium">{hanoi.freeshipNote}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-gray-400 font-semibold uppercase">Giờ đón khách</span>
                  <p className="font-bold text-gray-900">Thứ Hai – Thứ Bảy: 09:00 – 20:00</p>
                  <p className="text-xs text-amber-700 font-medium">Chủ nhật: Tiếp khách theo lịch hẹn trước</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-gray-400 font-semibold uppercase">Dịch vụ tại cơ sở</span>
                  <p className="text-xs text-gray-700 font-medium">✓ Đón khách xem và trải nghiệm laptop thực tế</p>
                  <p className="text-xs text-gray-700 font-medium">✓ Nhận đơn online trực tiếp tại quầy (Pickup)</p>
                  <p className="text-xs text-gray-700 font-medium">✓ Tiếp nhận kiểm tra bảo hành & nâng cấp máy</p>
                </div>
              </div>

              {/* Photos Gallery for Hanoi Store */}
              {hanoi.photos && hanoi.photos.length > 0 && (
                <div className="pt-6">
                  <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase flex items-center gap-2">
                    <Store className="w-4 h-4 text-blue-600" /> Hình ảnh không gian thực tế tại CitiLap Hà Nội
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {hanoi.photos.map((photoUrl, idx) => (
                      <div
                        key={idx}
                        className="relative h-44 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 group"
                      >
                        <Image
                          src={photoUrl}
                          alt={`Cơ sở CitiLap Hà Nội ảnh ${idx + 1}`}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover group-hover:scale-105 transition duration-300"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Bắc Ninh (Active Walk-in Store) */}
          <div id="bac-ninh" className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 md:p-8 lg:p-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                      Cơ sở 2 • Đang hoạt động
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                      Mua trực tiếp tại showroom
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-gray-900">
                    {bacNinh.name}
                  </h2>
                </div>

                <div className="flex flex-wrap gap-3">
                  <a
                    href={bacNinh.telHref}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-2 shadow-sm"
                  >
                    <Phone className="w-4 h-4" /> Gọi hotline: {bacNinh.displayPhone}
                  </a>
                  {bacNinh.mapsUrl && (
                    <a
                      href={bacNinh.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition inline-flex items-center gap-2"
                    >
                      <MapPin className="w-4 h-4 text-red-500" /> Chỉ đường Google Maps <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-gray-100 text-sm">
                <div className="space-y-1">
                  <span className="text-xs text-gray-400 font-semibold uppercase">Địa chỉ cơ sở</span>
                  <p className="font-bold text-gray-900">{bacNinh.address}</p>
                  <p className="text-xs text-gray-500">Phục vụ khách hàng khu vực Bắc Ninh và lân cận</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-gray-400 font-semibold uppercase">Giờ đón khách</span>
                  <p className="font-bold text-gray-900">Thứ Hai – Thứ Bảy: 09:00 – 20:00</p>
                  <p className="text-xs text-amber-700 font-medium">Chủ nhật: Tiếp khách theo lịch hẹn trước</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-gray-400 font-semibold uppercase">Dịch vụ tại cơ sở</span>
                  <p className="text-xs text-emerald-700 font-semibold">✓ Đón khách đến xem máy và mua trực tiếp</p>
                  <p className="text-xs text-gray-600 font-medium">✓ Tiếp nhận hỗ trợ kỹ thuật và bảo hành</p>
                  <p className="text-xs text-amber-700 font-medium">
                    <em>(Lưu ý: Chưa hỗ trợ nhận đơn online đặt trước tại quầy)</em>
                  </p>
                </div>
              </div>

              <div className="pt-4 p-4 bg-blue-50/60 rounded-2xl border border-blue-100 text-xs text-blue-900 space-y-1">
                <p className="font-bold">Hướng dẫn dành cho khách hàng tại Bắc Ninh:</p>
                <p>
                  Quý khách hoàn toàn có thể đến trực tiếp cơ sở Số 40 Trần Hưng Đạo để xem và mua máy. Nếu quý khách muốn đặt hàng qua website, vui lòng chọn hình thức <strong>&quot;Giao hàng tận nơi&quot;</strong> để chuyên viên sắp xếp giao máy tận nhà hoặc liên hệ hotline <strong>{bacNinh.displayPhone}</strong> để được hướng dẫn nhanh chóng.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: TP.HCM (Temporarily Closed Notice) */}
          <div id="hcm" className="bg-gray-50 rounded-3xl border border-gray-200/80 p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-700 uppercase tracking-wider">
                  Tạm đóng cửa
                </span>
                <h3 className="text-lg font-bold text-gray-800">{hcm.name}</h3>
              </div>
              <span className="text-xs text-gray-500">Địa chỉ lịch sử</span>
            </div>

            <p className="text-sm text-gray-600 mb-2">{hcm.address}</p>
            <p className="text-xs text-gray-500 italic">
              {hcm.statusNotice} Khách hàng khu vực phía Nam có nhu cầu đặt mua máy vui lòng chọn hình thức giao hàng toàn quốc hoặc liên hệ hotline <strong className="text-gray-700">{businessProfile.displayPhone}</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
