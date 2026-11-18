"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/ui/Container";

const labelMap: Record<string, string> = {
  "": "Trang chủ",
  category: "Danh mục",
  "phan-loai": "Danh mục sản phẩm",
  product: "Sản phẩm",
  laptop: "Laptop",
  "san-pham": "Sản phẩm",
  cart: "Giỏ hàng",
  checkout: "Thanh toán",
  search: "Tìm kiếm",
  "hot-sale": "Hot Sale",
  contact: "Liên hệ",
  "lien-he": "Liên hệ & Hỗ trợ",
  "gioi-thieu": "Giới thiệu CitiLap",
  "he-thong-cua-hang": "Hệ thống cửa hàng",
  news: "Tin tức & Kinh nghiệm",
  profile: "Hỗ trợ khách hàng",
  orders: "Đơn hàng",
  "order-tracking": "Tra cứu đơn hàng & Kiểm định",
  wishlist: "Sản phẩm yêu thích",
  "so-sanh": "So sánh sản phẩm",
  "chon-laptop": "Tư vấn chọn Laptop",
  brand: "Thương hiệu",
  collection: "Bộ sưu tập",
  "chinh-sach": "Chính sách",
  "laptop-gaming": "Laptop Gaming",
  "laptop-van-phong": "Laptop Văn Phòng",
  macbook: "Apple MacBook",
  "laptop-do-hoa": "Laptop Đồ Họa",
  "laptop-workstation": "Laptop Đồ Họa & Workstation",
  "may-luot": "Máy Lướt - Like New",
  "laptop-likenew": "Laptop Like New",
  "laptop-cu": "Laptop Like New",
  "laptop-moi": "Laptop Mới",
  "phu-kien": "Phụ Kiện Công Nghệ",
  "linh-kien": "Linh Kiện & Phụ Kiện",
  gear: "Gear & Phụ kiện",
  "cau-hoi-thuong-gap": "Câu hỏi thường gặp",
  "huong-dan-mua-hang": "Hướng dẫn mua hàng",
  "dieu-khoan-mua-hang": "Điều khoản mua hàng",
  "chinh-sach-bao-hanh": "Chính sách bảo hành",
  "chinh-sach-doi-tra": "Chính sách đổi trả",
  "chinh-sach-van-chuyen": "Chính sách vận chuyển",
  "chinh-sach-bao-mat": "Chính sách bảo mật",
  "bao-hanh": "Chính sách bảo hành",
  "doi-tra": "Chính sách đổi trả",
  "van-chuyen": "Chính sách vận chuyển",
  "thanh-toan": "Phương thức thanh toán",
  "bao-mat": "Chính sách bảo mật",
  success: "Đặt hàng thành công",
};

function getSegmentLabel(segment: string): string {
  if (labelMap[segment]) return labelMap[segment];
  if (segment.length > 20) return "Chi tiết";
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
}

export interface BreadcrumbItem {
  label: string;
  href: string;
}

function BreadcrumbNav({ crumbs }: { crumbs: BreadcrumbItem[] }) {
  return (
    <div className="bg-white border-b border-slate-200">
      <Container>
        <nav
          aria-label="Breadcrumb"
          className="flex items-center text-[11px] sm:text-sm text-slate-500 py-2 sm:py-2.5 font-medium overflow-x-auto hide-scrollbar"
        >
          {crumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center whitespace-nowrap min-w-0">
              {i > 0 && (
                <ChevronRight className="w-3.5 h-3.5 mx-1 sm:mx-1.5 text-slate-300 shrink-0" aria-hidden="true" />
              )}
              {i === crumbs.length - 1 ? (
                <span className="text-slate-900 font-semibold max-w-[180px] sm:max-w-none truncate" aria-current="page" title={crumb.label}>
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  title={crumb.label}
                  className="hover:text-blue-600 transition-colors max-w-[115px] sm:max-w-none truncate"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </Container>
    </div>
  );
}

export default function Breadcrumb({ items }: { items?: BreadcrumbItem[] }) {
  const pathname = usePathname();

  // If explicit items provided, use them
  if (items) {
    return <BreadcrumbNav crumbs={items} />;
  }

  // Auto-generate from URL path
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: BreadcrumbItem[] = [{ label: "Trang chủ", href: "/" }];

  let accumulatedPath = "";
  for (const segment of segments) {
    accumulatedPath += `/${segment}`;
    crumbs.push({
      label: getSegmentLabel(segment),
      href: accumulatedPath,
    });
  }

  if (crumbs.length <= 1) return null;

  return <BreadcrumbNav crumbs={crumbs} />;
}
