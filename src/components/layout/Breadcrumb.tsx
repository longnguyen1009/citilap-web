"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const labelMap: Record<string, string> = {
  "": "Trang chủ",
  category: "Danh mục",
  product: "Sản phẩm",
  cart: "Giỏ hàng",
  checkout: "Thanh toán",
  search: "Tìm kiếm",
  "hot-sale": "Hot Sale",
  contact: "Liên hệ",
  news: "Tin tức",
  profile: "Tài khoản",
  orders: "Đơn hàng",
  "chinh-sach": "Chính sách",
  "laptop-gaming": "Laptop Gaming",
  "laptop-van-phong": "Laptop Văn Phòng",
  macbook: "MacBook",
  "laptop-do-hoa": "Laptop Đồ Họa",
  "may-luot": "Máy Lướt - Like New",
  "phu-kien": "Phụ Kiện",
  "linh-kien": "Linh Kiện PC",
  gear: "Gear & Phụ kiện",
  "huong-dan-mua-hang": "Hướng dẫn mua hàng",
  "bao-hanh": "Chính sách bảo hành",
  "doi-tra": "Chính sách đổi trả",
  "van-chuyen": "Chính sách vận chuyển",
  "thanh-toan": "Phương thức thanh toán",
  "bao-mat": "Chính sách bảo mật",
  success: "Thành công",
};

function getSegmentLabel(segment: string): string {
  if (labelMap[segment]) return labelMap[segment];
  if (segment.length > 20) return "Chi tiết";
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
}

interface BreadcrumbItem {
  label: string;
  href: string;
}

function BreadcrumbNav({ crumbs }: { crumbs: BreadcrumbItem[] }) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 max-w-[1370px]">
        <nav className="flex items-center text-sm text-gray-500 py-3 font-medium overflow-x-auto">
          {crumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center whitespace-nowrap">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-gray-400 shrink-0" />}
              {i === crumbs.length - 1 ? (
                <span className="text-gray-800 font-bold">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="hover:text-blue-600 transition">{crumb.label}</Link>
              )}
            </span>
          ))}
        </nav>
      </div>
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
  const crumbs: BreadcrumbItem[] = [
    { label: "Trang chủ", href: "/" },
  ];

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
