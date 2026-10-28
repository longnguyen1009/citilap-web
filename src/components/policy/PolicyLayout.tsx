import Link from "next/link";
import {
  ShieldCheck,
  RefreshCw,
  Truck,
  Lock,
  FileText,
  HelpCircle,
  Phone,
  ChevronRight,
} from "lucide-react";
import { businessProfile } from "@/config/business-profile";

export interface PolicyNavItem {
  slug: string;
  href: string;
  title: string;
  icon: React.ElementType;
}

export const policyNavItems: PolicyNavItem[] = [
  { slug: "cau-hoi-thuong-gap", href: "/cau-hoi-thuong-gap", title: "Câu hỏi thường gặp", icon: HelpCircle },
  {
    slug: "huong-dan-mua-hang",
    href: "/huong-dan-mua-hang",
    title: "Hướng dẫn mua hàng",
    icon: HelpCircle,
  },
  {
    slug: "chinh-sach-bao-hanh",
    href: "/chinh-sach-bao-hanh",
    title: "Chính sách bảo hành",
    icon: ShieldCheck,
  },
  {
    slug: "chinh-sach-doi-tra",
    href: "/chinh-sach-doi-tra",
    title: "Chính sách đổi trả & hoàn tiền",
    icon: RefreshCw,
  },
  {
    slug: "chinh-sach-van-chuyen",
    href: "/chinh-sach-van-chuyen",
    title: "Chính sách vận chuyển",
    icon: Truck,
  },
  {
    slug: "dieu-khoan-mua-hang",
    href: "/dieu-khoan-mua-hang",
    title: "Điều khoản mua hàng",
    icon: FileText,
  },
  {
    slug: "chinh-sach-bao-mat",
    href: "/chinh-sach-bao-mat",
    title: "Chính sách bảo mật thông tin",
    icon: Lock,
  },
];

interface PolicyLayoutProps {
  currentSlug: string;
  title: string;
  subtitle?: string;
  isPublished?: boolean;
  lastUpdated?: string;
  children: React.ReactNode;
}

export default function PolicyLayout({
  currentSlug,
  title,
  subtitle,
  lastUpdated,
  children,
}: PolicyLayoutProps) {
  return (
    <div className="bg-[#f8fafc] min-h-screen pb-16">
      {/* 1. Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <nav aria-label="Đường dẫn trang" className="flex flex-wrap gap-y-2 text-sm text-gray-500 py-3.5 font-medium items-center">
            <Link href="/" className="hover:text-blue-600 transition">
              Trang chủ
            </Link>
            <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            <span className="text-gray-400">Chính sách & Hướng dẫn</span>
            <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            <span aria-current="page" className="text-gray-900 font-bold">{title}</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1370px] mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* 2. Left Sidebar (4 cols) */}
          <div className="order-2 lg:order-1 lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-4 sticky top-24">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 py-2">
                Danh mục chính sách
              </h2>
              <nav aria-label="Chính sách và hỗ trợ" className="space-y-1">
                {policyNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.slug === currentSlug;
                  return (
                    <Link
                      key={item.slug}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs md:text-sm font-semibold transition ${
                        isActive
                          ? "bg-blue-50 text-blue-700 font-bold shadow-2xs"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-600" : "text-gray-400"}`} />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Support Hotline Widget */}
              <div className="mt-6 pt-4 border-t border-gray-100 px-3">
                <div className="text-xs text-gray-500 font-medium mb-1">Cần hỗ trợ trực tiếp?</div>
                <a
                  href={businessProfile.telHref}
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold text-sm"
                >
                  <Phone className="w-4 h-4" /> Hotline: {businessProfile.displayPhone}
                </a>
                <div className="text-[11px] text-gray-400 mt-1">
                  Thứ 2 – Thứ 7: 09:00 – 20:00 (CN hẹn trước)
                </div>
              </div>
            </div>
          </div>

          {/* 3. Main Content Area (8 cols) */}
          <div className="order-1 min-w-0 lg:order-2 lg:col-span-8">
            <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-6 sm:p-10 md:p-12">
              {/* Title & Subtitle */}
              <div className="border-b border-gray-100 pb-6 mb-8">
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs sm:text-sm text-gray-500 mt-2 leading-relaxed">
                    {subtitle}
                  </p>
                )}
                <div className="text-[11px] text-gray-400 mt-2">
                  {lastUpdated && <>Cập nhật: {lastUpdated} · </>}Đơn vị phụ trách: {businessProfile.brandName}
                </div>
              </div>

              {/* Dynamic Children Content */}
              <div className="prose prose-sm sm:prose-base max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
