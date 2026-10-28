import Link from "next/link";
import {
  ClipboardCheck,
  Heart,
  PhoneCall,
  ShieldCheck,
  RefreshCw,
  Truck,
  Store,
  HelpCircle,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { getStorefrontSettings } from "@/server/services/storefront-cms.service";
import { businessProfile } from "@/config/business-profile";

export const metadata = {
  title: "Trung tâm hỗ trợ & Tra cứu khách hàng | CitiLap",
  robots: { index: false, follow: true },
};

export default async function ProfilePage() {
  const settings = await getStorefrontSettings();
  const phone = settings?.storePhone || businessProfile.displayPhone;
  const telHref = settings?.storePhone
    ? `tel:${settings.storePhone.replace(/\s+/g, "")}`
    : businessProfile.telHref;
  const zaloUrl = settings?.zaloUrl || businessProfile.socialProfiles.zalo;

  const quickActions = [
    {
      title: "Tra cứu đơn hàng",
      description: "Kiểm tra trạng thái đơn hàng, sản phẩm đã đặt và thông tin thanh toán.",
      href: "/order-tracking",
      icon: ClipboardCheck,
      cta: "Mở trang tra cứu",
    },
    {
      title: "Sản phẩm yêu thích",
      description: "Danh sách laptop và phụ kiện bạn đã lưu trên thiết bị này để so sánh sau.",
      href: "/wishlist",
      icon: Heart,
      cta: "Xem danh sách đã lưu",
    },
    {
      title: "Hệ thống cửa hàng",
      description: "Địa chỉ showroom Hà Nội & Bắc Ninh, giờ mở cửa và chỉ đường Google Maps.",
      href: "/he-thong-cua-hang",
      icon: Store,
      cta: "Xem địa chỉ showroom",
    },
    {
      title: "Liên hệ & Yêu cầu tư vấn",
      description: "Gửi yêu cầu tư vấn cấu hình, báo giá doanh nghiệp hoặc hỗ trợ kỹ thuật.",
      href: "/lien-he",
      icon: MessageSquare,
      cta: "Gửi yêu cầu hỗ trợ",
    },
  ];

  const policyLinks = [
    { label: "Chính sách bảo hành", href: "/chinh-sach-bao-hanh", icon: ShieldCheck },
    { label: "Chính sách đổi trả 7 ngày", href: "/chinh-sach-doi-tra", icon: RefreshCw },
    { label: "Chính sách vận chuyển & đồng kiểm", href: "/chinh-sach-van-chuyen", icon: Truck },
    { label: "Hướng dẫn mua hàng & thanh toán", href: "/huong-dan-mua-hang", icon: HelpCircle },
    { label: "Câu hỏi thường gặp (FAQ)", href: "/cau-hoi-thuong-gap", icon: HelpCircle },
  ];

  return (
    <div className="bg-slate-50 min-h-[70vh] py-8 md:py-12">
      <div className="container mx-auto max-w-[1370px] px-4 space-y-8">
        {/* Hero header */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200/60 px-3 py-1 rounded-full">
              Mua sắm không cần tài khoản
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Trung tâm Hỗ trợ &amp; Tiện ích Khách hàng
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Tại CitiLap, bạn có thể đặt hàng, tra cứu trạng thái đơn và bảo hành trực tiếp qua mã đơn hàng hoặc số điện thoại mà không cần đăng ký tài khoản.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
            <a
              href={telHref}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-3 rounded-xl transition shadow-xs"
            >
              <PhoneCall className="w-4 h-4" />
              Hotline: {phone}
            </a>
            {zaloUrl && (
              <a
                href={zaloUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-sm px-5 py-2.5 rounded-xl transition"
              >
                Chat Zalo kỹ thuật &amp; tư vấn
              </a>
            )}
          </div>
        </div>

        {/* Quick action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickActions.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:border-blue-500 hover:shadow-md transition flex flex-col justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition">
                      {item.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition">
                  {item.cta} <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            );
          })}
        </div>

        {/* Policies & Guides */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
          <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 mb-4">
            Chính sách &amp; Hướng dẫn mua hàng
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {policyLinks.map((policy) => {
              const Icon = policy.icon;
              return (
                <Link
                  key={policy.href}
                  href={policy.href}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200/70 hover:border-blue-400 hover:bg-blue-50/40 text-xs sm:text-sm font-semibold text-slate-700 hover:text-blue-700 transition"
                >
                  <Icon className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{policy.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
