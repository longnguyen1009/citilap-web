import Link from "next/link";
import { Laptop, Monitor, Mouse, Keyboard, Headphones, Shield, Cpu, ChevronRight, Menu } from "lucide-react";

export default function VerticalMenu() {
  const categories = [
    { name: "Laptop Mới", icon: Laptop, href: "/category/laptop-moi" },
    { name: "Laptop Gaming", icon: Laptop, href: "/category/laptop-gaming" },
    { name: "Laptop Văn Phòng", icon: Laptop, href: "/category/laptop-van-phong" },
    { name: "Laptop Đồ Họa", icon: Laptop, href: "/category/laptop-do-hoa" },
    { name: "Linh Kiện PC", icon: Cpu, href: "/category/linh-kien" },
    { name: "Màn Hình Máy Tính", icon: Monitor, href: "/category/man-hinh" },
    { name: "Bàn Phím", icon: Keyboard, href: "/category/ban-phim" },
    { name: "Chuột Máy Tính", icon: Mouse, href: "/category/chuot" },
    { name: "Tai Nghe", icon: Headphones, href: "/category/tai-nghe" },
    { name: "Phụ Kiện Khác", icon: Shield, href: "/category/phu-kien" },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hidden lg:block h-full">
      <div className="bg-[#d3000b] text-white px-4 py-3 flex items-center gap-2 font-bold uppercase text-sm">
        <Menu className="w-5 h-5" />
        Danh mục sản phẩm
      </div>
      <ul className="flex flex-col py-2">
        {categories.map((cat, index) => (
          <li key={index} className="group border-b border-gray-100 last:border-0 relative">
            <Link 
              href={cat.href} 
              className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 hover:text-[#d3000b] transition text-sm font-medium text-gray-700"
            >
              <div className="flex items-center gap-3">
                <cat.icon className="w-4 h-4 text-gray-400 group-hover:text-[#d3000b]" />
                {cat.name}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#d3000b]" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
