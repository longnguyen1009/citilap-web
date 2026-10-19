import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRight,
  MapPin,
  Phone,
  Mail,
  Clock,
  ExternalLink,
  MessageCircle,
  Store,
} from "lucide-react";
import { businessProfile } from "@/config/business-profile";
import ContactForm from "@/components/contact/ContactForm";
import { getStorefrontSettings } from "@/server/services/storefront-cms.service";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStorefrontSettings();
  const brandName = settings?.storeName || businessProfile.brandName;
  const phone = settings?.storePhone || businessProfile.displayPhone;
  const email = settings?.storeEmail || businessProfile.email;

  return {
    title: `Liên hệ & Hệ thống chi nhánh | ${brandName}`,
    description: `Liên hệ với ${brandName} - Hotline: ${phone}, Email: ${email}. Địa chỉ chi nhánh Hà Nội & Bắc Ninh, giờ làm việc và hướng dẫn chỉ đường.`,
    alternates: {
      canonical: `${businessProfile.canonicalSiteUrl}/lien-he`,
    },
    openGraph: {
      title: `Liên hệ ${brandName} - ${settings?.motto || businessProfile.traditionalMotto}`,
      description: `Hotline: ${phone}. Địa chỉ cơ sở Hà Nội và Bắc Ninh.`,
      url: `${businessProfile.canonicalSiteUrl}/lien-he`,
    },
  };
}

export default async function ContactPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const appointment = query.intent === 'appointment';
  const productId = typeof query.product === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(query.product) ? query.product : '';
  const unitCode = typeof query.unit === 'string' && /^[a-zA-Z0-9_-]{2,64}$/.test(query.unit) ? query.unit : '';
  const settings = await getStorefrontSettings();
  const hanoi = businessProfile.locations.find((l) => l.id === "hanoi")!;
  const bacNinh = businessProfile.locations.find((l) => l.id === "bac-ninh")!;
  const hcm = businessProfile.locations.find((l) => l.id === "hcm")!;

  const brandName = settings?.storeName || businessProfile.brandName;
  const phone = settings?.storePhone || businessProfile.displayPhone;
  const telHref = settings?.storePhone ? `tel:${settings.storePhone.replace(/\s+/g, "")}` : businessProfile.telHref;
  const email = settings?.storeEmail || businessProfile.email;
  const zaloUrl = settings?.zaloUrl || businessProfile.socialProfiles.zalo;
  const zaloPhone = settings?.storePhone || businessProfile.socialProfiles.zaloPhone;
  const hanoiAddr = settings?.addressHanoi || hanoi.address;
  const bacNinhAddr = settings ? settings.addressBacNinh : bacNinh.address;
  const bacNinhPhone = settings?.storePhoneBacNinh || bacNinh.displayPhone;
  const bacNinhTelHref = settings?.storePhoneBacNinh ? `tel:${settings.storePhoneBacNinh.replace(/\s+/g, "")}` : bacNinh.telHref;
  const hours = settings?.openingHours || "T2 - T7: 09:00 - 20:00 (Chủ nhật: Theo lịch hẹn trước)";

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
            <span className="text-gray-900 font-bold">Liên hệ & Chi nhánh</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1240px] mt-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tight">
            Liên hệ với {brandName}
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            Đội ngũ chuyên viên kỹ thuật luôn sẵn sàng hỗ trợ giải đáp thắc mắc về cấu hình máy, kiểm tra tình trạng hàng và chính sách hậu mãi.
          </p>
        </div>

        {/* 2. Quick Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <a
            href={telHref}
            className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:border-blue-500 hover:shadow-md transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
              <Phone className="w-5 h-5" />
            </div>
            <div className="text-xs text-gray-500 font-medium">Hotline tư vấn chính</div>
            <div className="text-base font-bold text-gray-900 mt-0.5">{phone}</div>
            <div className="text-[11px] text-blue-600 font-medium mt-1">Bấm để gọi ngay →</div>
          </a>

          {bacNinhAddr ? (
            <a
              href={bacNinhTelHref}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:border-emerald-500 hover:shadow-md transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                <Phone className="w-5 h-5" />
              </div>
              <div className="text-xs text-gray-500 font-medium">Hotline cơ sở Bắc Ninh</div>
              <div className="text-base font-bold text-gray-900 mt-0.5">{bacNinhPhone}</div>
              <div className="text-[11px] text-emerald-600 font-medium mt-1">Bấm để gọi ngay →</div>
            </a>
          ) : (
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs opacity-60">
              <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center mb-3">
                <Store className="w-5 h-5" />
              </div>
              <div className="text-xs text-gray-500 font-medium">Hỗ trợ kỹ thuật</div>
              <div className="text-base font-bold text-gray-900 mt-0.5">{phone}</div>
              <div className="text-[11px] text-gray-500 font-medium mt-1">{businessProfile.supportHours}</div>
            </div>
          )}

          <a
            href={`mailto:${email}`}
            className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:border-blue-500 hover:shadow-md transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
              <Mail className="w-5 h-5" />
            </div>
            <div className="text-xs text-gray-500 font-medium">Email liên hệ</div>
            <div className="text-sm font-bold text-gray-900 mt-0.5 truncate">{email}</div>
            <div className="text-[11px] text-purple-600 font-medium mt-1">Gửi thư hỗ trợ →</div>
          </a>

          <a
            href={zaloUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:border-blue-500 hover:shadow-md transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="text-xs text-gray-500 font-medium">Kênh Zalo tư vấn</div>
            <div className="text-base font-bold text-gray-900 mt-0.5">{zaloPhone}</div>
            <div className="text-[11px] text-sky-600 font-medium mt-1">Chat Zalo trực tiếp →</div>
          </a>
        </div>

        {/* 3. Detailed Showrooms Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12">
          {/* Left: Showroom List (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <h2 className="text-xl font-black text-gray-900 uppercase flex items-center gap-2">
              <Store className="w-5 h-5 text-blue-600" /> Hệ thống cơ sở phục vụ
            </h2>

            {/* Cơ sở Hà Nội */}
            <div className="bg-white rounded-2xl p-6 border-2 border-blue-500/80 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 mb-1">
                    Trụ sở chính • Đang hoạt động
                  </span>
                  <h3 className="text-lg font-bold text-gray-900">{hanoi.name}</h3>
                </div>
                {hanoi.mapsUrl && (
                  <a
                    href={hanoi.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition"
                  >
                    <MapPin className="w-3.5 h-3.5 text-red-500" /> Chỉ đường <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex gap-2.5">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <span><strong>Địa chỉ:</strong> {hanoiAddr}</span>
                </div>
                <div className="flex gap-2.5">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <span><strong>Điện thoại:</strong> <a href={telHref} className="text-blue-600 font-bold hover:underline">{phone}</a></span>
                </div>
                <div className="flex gap-2.5">
                  <Clock className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p><strong>Thời gian hoạt động:</strong> {hours}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 text-xs text-emerald-700 font-medium space-y-1">
                <p>✓ Tiếp khách xem và mua máy trực tiếp tại cơ sở</p>
                <p>✓ Điểm nhận đơn online (Pickup) đã đặt trước trên website</p>
                <p>✓ Hỗ trợ tiếp nhận bảo hành và kiểm tra kỹ thuật</p>
              </div>
            </div>

            {/* Cơ sở Bắc Ninh */}
            {bacNinhAddr && (
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 mb-1">
                      Cơ sở 2 • Đang hoạt động
                    </span>
                    <h3 className="text-lg font-bold text-gray-900">{bacNinh.name}</h3>
                  </div>
                  {bacNinh.mapsUrl && (
                    <a
                      href={bacNinh.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-semibold transition"
                    >
                      <MapPin className="w-3.5 h-3.5 text-red-500" /> Chỉ đường <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex gap-2.5">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <span><strong>Địa chỉ:</strong> {bacNinhAddr}</span>
                  </div>
                  <div className="flex gap-2.5">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <span><strong>Điện thoại:</strong> <a href={bacNinhTelHref} className="text-emerald-600 font-bold hover:underline">{bacNinhPhone}</a></span>
                  </div>
                  <div className="flex gap-2.5">
                    <Clock className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <p><strong>Thời gian hoạt động:</strong> {hours}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 text-xs text-gray-600 space-y-1">
                  <p className="text-emerald-700 font-medium">✓ Đón khách đến xem máy, trải nghiệm và mua trực tiếp</p>
                  <p className="text-gray-500">
                    <em>Lưu ý:</em> Cơ sở Bắc Ninh hiện chưa hỗ trợ nhận đơn online tại quầy. Khách đặt online vui lòng chọn &quot;Giao hàng tận nơi&quot; hoặc gọi hotline {bacNinhPhone}.
                  </p>
                </div>
              </div>
            )}

            {/* Cơ sở TP.HCM (Tạm đóng) */}
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200/80 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-200 text-gray-600">
                  Tạm đóng cửa
                </span>
                <h3 className="text-sm font-bold text-gray-700">{hcm.name}</h3>
              </div>
              <p className="text-xs text-gray-500">{hcm.address}</p>
              <p className="text-[11px] text-gray-500 italic">
                {hcm.statusNotice}
              </p>
            </div>
          </div>

          {/* Right: Message Form (5 cols) */}
          <div className="lg:col-span-5">
            <ContactForm key={`${appointment}-${productId}-${unitCode}`} appointment={appointment} productId={productId} unitCode={unitCode} />
          </div>
        </div>
      </div>
    </div>
  );
}
