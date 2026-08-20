import Link from "next/link";
import { 
  Search, Menu, PhoneCall, MapPin, 
  ClipboardCheck, User, Monitor, ChevronDown 
} from "lucide-react";
import CartIcon from "./CartIcon";

export default function Header() {
  const navItems = [
    { name: "HOT SALE", href: "/hot-sale", hot: true },
    { name: "Laptop Gaming", href: "/category/laptop-gaming", dropdown: true },
    { name: "Laptop Văn Phòng", href: "/category/laptop-van-phong", dropdown: true },
    { name: "Laptop Đồ Hoạ - Kỹ Thuật", href: "/category/laptop-do-hoa" },
    { name: "Apple - Macbook", href: "/category/macbook" },
    { name: "Linh Kiện - Phụ Kiện", href: "/category/linh-kien" },
    { name: "Tin tức - Review", href: "/news" },
  ];

  return (
    <header className="w-full">
      {/* Top Header */}
      <div className="bg-[#0b1221] text-white py-3">
        <div className="container mx-auto px-4 flex items-center justify-between gap-4 max-w-[1370px]">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <Monitor className="w-10 h-10 text-blue-400" />
            <div className="flex flex-col">
              <span className="text-2xl font-black leading-none tracking-wider text-white">CITILAP.VN</span>
              <span className="text-[9px] tracking-[0.2em] text-blue-400 font-medium uppercase mt-1">Một chữ tín - Vạn niềm tin</span>
            </div>
          </Link>

          {/* Danh mục & Search */}
          <div className="flex flex-grow max-w-3xl items-center gap-4 ml-4">
            <div className="relative group hidden md:block">
              <button className="flex items-center gap-2 bg-[#1f2937] hover:bg-[#374151] px-4 py-2.5 rounded text-sm font-medium transition cursor-pointer">
                <Menu className="w-5 h-5" />
                <span>Danh mục</span>
              </button>
              {/* Dropdown Menu */}
              <div className="absolute top-full left-0 pt-3 w-[260px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                <div className="bg-white rounded-lg shadow-2xl border border-gray-100 py-2 text-sm text-gray-700">
                  <Link href="/category/laptop-gaming" className="block px-5 py-2.5 hover:bg-blue-50 hover:text-blue-600 transition font-bold border-b border-gray-50">Laptop Gaming</Link>
                  <Link href="/category/ultrabook" className="block px-5 py-2.5 hover:bg-blue-50 hover:text-blue-600 transition font-bold border-b border-gray-50">Ultrabook Cao Cấp</Link>
                  <Link href="/category/may-luot" className="block px-5 py-2.5 hover:bg-blue-50 hover:text-blue-600 transition font-bold border-b border-gray-50">Laptop Cũ - Máy Lướt</Link>
                  <Link href="/category/workstation" className="block px-5 py-2.5 hover:bg-blue-50 hover:text-blue-600 transition font-bold border-b border-gray-50">Máy Trạm - Workstation</Link>
                  <Link href="/category/gear" className="block px-5 py-2.5 hover:bg-blue-50 hover:text-blue-600 transition font-bold border-b border-gray-50">Phụ Kiện & Gear</Link>
                  <Link href="/category/apple" className="block px-5 py-2.5 hover:bg-blue-50 hover:text-blue-600 transition font-bold">Apple (MacBook - iPad)</Link>
                </div>
              </div>
            </div>
            <div className="relative flex-grow">
              <input 
                type="text" 
                placeholder="Bạn cần tìm gì..." 
                className="w-full h-10 pl-4 pr-12 rounded bg-white text-gray-800 outline-none text-sm focus:ring-2 focus:ring-blue-500"
              />
              <button className="absolute right-0 top-0 h-10 w-12 flex items-center justify-center text-gray-800 hover:text-blue-600">
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Action Links */}
          <div className="hidden lg:flex items-center gap-8 ml-4">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-gray-300" />
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-400">Hotline</span>
                <span className="text-sm font-bold">0899.188.186</span>
              </div>
            </div>
            
            <Link href="/order-tracking" className="flex items-center gap-2 hover:text-blue-400 transition">
              <ClipboardCheck className="w-5 h-5 text-gray-300" />
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-400">Tra cứu</span>
                <span className="text-xs font-medium">đơn hàng</span>
              </div>
            </Link>

            <Link href="/login" className="flex flex-col items-center justify-center bg-[#1f2937] hover:bg-[#374151] rounded w-16 h-10 transition">
              <User className="w-4 h-4 text-gray-300 mb-0.5" />
              <span className="text-[10px] text-gray-300">Thông tin</span>
            </Link>

            <CartIcon />
          </div>
          
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="bg-white border-b border-gray-200 hidden md:block">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <ul className="flex items-center justify-between py-3">
            {navItems.map((item, index) => (
              <li key={index}>
                <Link 
                  href={item.href} 
                  className={`flex items-center gap-1 text-sm font-bold uppercase transition hover:text-blue-600 ${
                    item.hot ? "text-red-600" : "text-gray-800"
                  }`}
                >
                  {item.name}
                  {item.dropdown && <ChevronDown className="w-4 h-4" />}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </header>
  );
}
