"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, Menu, PhoneCall,
  ClipboardCheck, User, Monitor, ChevronDown, ChevronRight,
  Laptop, Gamepad2, Briefcase, Palette, RefreshCw, Cpu,
  Tablet, HardDrive, Camera, Sparkles, ArrowRight, X, Heart
} from "lucide-react";
import CartIcon from "./CartIcon";
import { useWishlist } from "@/context/WishlistContext";

const categoryIcons: Record<string, React.ElementType> = {
  "Laptop Mới": Sparkles,
  "Laptop Gaming": Gamepad2,
  "Laptop Văn Phòng": Briefcase,
  "Laptop Đồ Họa – Kĩ Thuật": Palette,
  "Laptop Like New": RefreshCw,
  "Linh Kiện – Phụ Kiện": Cpu,
  "Microsoft Surface": Tablet,
  "PC- Máy tính để bàn": HardDrive,
  "Linh kiện PC- Máy bàn": Cpu,
  "Camera": Camera,
};

const categoryMenu = [
  { name: "Laptop Mới", href: "/category/laptop-moi" },
  {
    name: "Laptop Gaming",
    href: "/category/laptop-gaming",
    children: [
      { name: "Lenovo Legion", href: "/category/laptop-gaming?brand=lenovo&series=legion" },
      { name: "Asus ROG", href: "/category/laptop-gaming?brand=asus&series=rog" },
      { name: "Acer Predator", href: "/category/laptop-gaming?brand=acer&series=predator" },
      { name: "MSI Gaming", href: "/category/laptop-gaming?brand=msi" },
      { name: "HP Omen", href: "/category/laptop-gaming?brand=hp&series=omen" },
      { name: "Dell Alienware", href: "/category/laptop-gaming?brand=dell&series=alienware" },
      { name: "Gigabyte AORUS", href: "/category/laptop-gaming?brand=gigabyte&series=aorus" },
      { name: "Lenovo LOQ", href: "/category/laptop-gaming?brand=lenovo&series=loq" },
    ]
  },
  {
    name: "Laptop Văn Phòng",
    href: "/category/laptop-van-phong",
    children: [
      { name: "MacBook Air", href: "/category/laptop-van-phong?brand=apple&series=macbook-air" },
      { name: "MacBook Pro", href: "/category/laptop-van-phong?brand=apple&series=macbook-pro" },
      { name: "Dell XPS", href: "/category/laptop-van-phong?brand=dell&series=xps" },
      { name: "Dell Inspiron", href: "/category/laptop-van-phong?brand=dell&series=inspiron" },
      { name: "Lenovo ThinkPad", href: "/category/laptop-van-phong?brand=lenovo&series=thinkpad" },
      { name: "Lenovo IdeaPad", href: "/category/laptop-van-phong?brand=lenovo&series=ideapad" },
      { name: "HP EliteBook", href: "/category/laptop-van-phong?brand=hp&series=elitebook" },
      { name: "HP Pavilion", href: "/category/laptop-van-phong?brand=hp&series=pavilion" },
      { name: "Asus ZenBook", href: "/category/laptop-van-phong?brand=asus&series=zenbook" },
      { name: "Acer Swift", href: "/category/laptop-van-phong?brand=acer&series=swift" },
    ]
  },
  {
    name: "Laptop Đồ Họa – Kĩ Thuật",
    href: "/category/laptop-do-hoa",
    children: [
      { name: "Dell Precision", href: "/category/laptop-do-hoa?brand=dell&series=precision" },
      { name: "Lenovo ThinkPad P", href: "/category/laptop-do-hoa?brand=lenovo&series=thinkpad-p" },
      { name: "HP ZBook", href: "/category/laptop-do-hoa?brand=hp&series=zbook" },
      { name: "Asus ProArt", href: "/category/laptop-do-hoa?brand=asus&series=proart" },
      { name: "Acer ConceptD", href: "/category/laptop-do-hoa?brand=acer&series=conceptd" },
      { name: "MSI Creator", href: "/category/laptop-do-hoa?brand=msi&series=creator" },
    ]
  },
  {
    name: "Laptop Like New",
    href: "/category/laptop-cu",
    children: [
      { name: "MacBook Cũ", href: "/category/laptop-cu?brand=apple" },
      { name: "Dell Cũ", href: "/category/laptop-cu?brand=dell" },
      { name: "Lenovo Cũ", href: "/category/laptop-cu?brand=lenovo" },
      { name: "HP Cũ", href: "/category/laptop-cu?brand=hp" },
      { name: "Asus Cũ", href: "/category/laptop-cu?brand=asus" },
      { name: "Acer Cũ", href: "/category/laptop-cu?brand=acer" },
    ]
  },
  {
    name: "Linh Kiện – Phụ Kiện",
    href: "/category/linh-kien",
    children: [
      { name: "Bàn Phím", href: "/category/linh-kien?sub=ban-phim" },
      { name: "Chuột Máy Tính", href: "/category/linh-kien?sub=chuot" },
      { name: "Tai Nghe", href: "/category/linh-kien?sub=tai-nghe" },
      { name: "Webcam", href: "/category/linh-kien?sub=webcam" },
      { name: "Ổ Cứng SSD", href: "/category/linh-kien?sub=ssd" },
      { name: "RAM Laptop", href: "/category/linh-kien?sub=ram" },
      { name: "Sạc & Cáp", href: "/category/linh-kien?sub=sac-cap" },
      { name: "Túi & Balo", href: "/category/linh-kien?sub=tui-balo" },
    ]
  },
  {
    name: "Microsoft Surface",
    href: "/category/surface",
    children: [
      { name: "Surface Pro", href: "/category/surface?series=pro" },
      { name: "Surface Laptop", href: "/category/surface?series=laptop" },
      { name: "Surface Go", href: "/category/surface?series=go" },
      { name: "Surface Book", href: "/category/surface?series=book" },
    ]
  },
  {
    name: "PC- Máy tính để bàn",
    href: "/category/pc",
    children: [
      { name: "PC Gaming", href: "/category/pc?sub=gaming" },
      { name: "PC Văn Phòng", href: "/category/pc?sub=van-phong" },
      { name: "PC Đồ Họa", href: "/category/pc?sub=do-hoa" },
      { name: "PC Mini", href: "/category/pc?sub=mini" },
      { name: "All-in-One", href: "/category/pc?sub=all-in-one" },
    ]
  },
  {
    name: "Linh kiện PC- Máy bàn",
    href: "/category/linh-kien-pc",
    children: [
      { name: "CPU / Bộ vi xử lý", href: "/category/linh-kien-pc?sub=cpu" },
      { name: "Mainboard", href: "/category/linh-kien-pc?sub=mainboard" },
      { name: "RAM PC", href: "/category/linh-kien-pc?sub=ram" },
      { name: "VGA / Card màn hình", href: "/category/linh-kien-pc?sub=vga" },
      { name: "Nguồn Máy Tính", href: "/category/linh-kien-pc?sub=nguon" },
      { name: "Case / Thùng máy", href: "/category/linh-kien-pc?sub=case" },
      { name: "Tản Nhiệt", href: "/category/linh-kien-pc?sub=tan-nhiet" },
      { name: "Ổ Cứng SSD / HDD", href: "/category/linh-kien-pc?sub=o-cung" },
    ]
  },
  {
    name: "Camera",
    href: "/category/camera",
    children: [
      { name: "Camera Wifi", href: "/category/camera?sub=wifi" },
      { name: "Camera IP", href: "/category/camera?sub=ip" },
      { name: "Camera Hành Trình", href: "/category/camera?sub=hanh-trinh" },
      { name: "Phụ Kiện Camera", href: "/category/camera?sub=phu-kien" },
    ]
  },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const { wishlistCount } = useWishlist();

  // Đóng menu khi click bên ngoài
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setHoveredItem(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Đóng menu khi scroll
  useEffect(() => {
    function handleScroll() {
      setMenuOpen(false);
      setHoveredItem(null);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { name: "HOT SALE", href: "/hot-sale", hot: true },
    {
      name: "Laptop Gaming",
      href: "/category/laptop-gaming",
      children: [
        { name: "Lenovo Legion", href: "/category/laptop-gaming?brand=lenovo&series=legion" },
        { name: "Asus ROG", href: "/category/laptop-gaming?brand=asus&series=rog" },
        { name: "Acer Predator", href: "/category/laptop-gaming?brand=acer&series=predator" },
        { name: "MSI Gaming", href: "/category/laptop-gaming?brand=msi" },
        { name: "HP Omen", href: "/category/laptop-gaming?brand=hp&series=omen" },
        { name: "Dell Alienware", href: "/category/laptop-gaming?brand=dell&series=alienware" },
        { name: "Lenovo LOQ", href: "/category/laptop-gaming?brand=lenovo&series=loq" },
        { name: "Gigabyte AORUS", href: "/category/laptop-gaming?brand=gigabyte&series=aorus" },
      ]
    },
    {
      name: "Laptop Văn Phòng",
      href: "/category/laptop-van-phong",
      children: [
        { name: "MacBook Air", href: "/category/laptop-van-phong?brand=apple&series=macbook-air" },
        { name: "MacBook Pro", href: "/category/laptop-van-phong?brand=apple&series=macbook-pro" },
        { name: "Dell XPS", href: "/category/laptop-van-phong?brand=dell&series=xps" },
        { name: "Dell Inspiron", href: "/category/laptop-van-phong?brand=dell&series=inspiron" },
        { name: "Lenovo ThinkPad", href: "/category/laptop-van-phong?brand=lenovo&series=thinkpad" },
        { name: "Lenovo IdeaPad", href: "/category/laptop-van-phong?brand=lenovo&series=ideapad" },
        { name: "HP EliteBook", href: "/category/laptop-van-phong?brand=hp&series=elitebook" },
        { name: "HP Pavilion", href: "/category/laptop-van-phong?brand=hp&series=pavilion" },
        { name: "Asus ZenBook", href: "/category/laptop-van-phong?brand=asus&series=zenbook" },
        { name: "Acer Swift", href: "/category/laptop-van-phong?brand=acer&series=swift" },
      ]
    },
    { name: "Laptop Đồ Hoạ - Kỹ Thuật", href: "/category/laptop-do-hoa" },
    { name: "Apple - Macbook", href: "/category/macbook" },
    { name: "Linh Kiện - Phụ Kiện", href: "/category/linh-kien" },
    { name: "Tin tức - Review", href: "/news" },
  ];

  const [hoveredNav, setHoveredNav] = useState<number | null>(null);

  return (
    <header className="w-full sticky top-0 z-50 shadow-md">
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
            <div className="relative hidden md:block" ref={menuRef}>
              {/* Button Danh mục - Click to toggle */}
              <button
                onClick={() => {
                  setMenuOpen(!menuOpen);
                  setHoveredItem(null);
                }}
                className={`flex items-center gap-2.5 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${
                  menuOpen
                    ? "bg-gradient-to-r from-blue-700 to-blue-800 shadow-xl shadow-blue-600/40"
                    : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 hover:-translate-y-0.5"
                }`}
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                <span>Danh mục</span>
                <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform duration-300 ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown Menu */}
              {menuOpen && (
                <div className="absolute top-full left-0 pt-3 w-[280px] z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="bg-white rounded-2xl shadow-2xl shadow-gray-200/60 py-2 text-sm text-gray-700 relative border border-gray-100/80">
                    {/* Decorative top gradient */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-t-2xl"></div>

                    {categoryMenu.map((item, idx) => {
                      const IconComponent = categoryIcons[item.name] || Laptop;
                      const hasChildren = !!item.children;
                      const isHovered = hoveredItem === idx;

                      return (
                        <div
                          key={idx}
                          className="relative"
                          onMouseEnter={() => hasChildren && setHoveredItem(idx)}
                          onMouseLeave={() => hasChildren && setHoveredItem(null)}
                        >
                          <Link
                            href={item.href}
                            onClick={() => !hasChildren && setMenuOpen(false)}
                            className={`flex items-center justify-between px-5 py-3 border-l-[3px] transition-all duration-200 font-medium ${
                              isHovered
                                ? "border-blue-500 text-blue-600 bg-gradient-to-r from-blue-50/80 to-transparent"
                                : "border-transparent hover:border-blue-500 hover:text-blue-600 hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 ${
                                isHovered ? "bg-blue-100" : "bg-gray-100"
                              }`}>
                                <IconComponent className={`w-4 h-4 transition-colors duration-200 ${
                                  isHovered ? "text-blue-600" : "text-gray-400"
                                }`} />
                              </div>
                              <span>{item.name}</span>
                            </div>
                            {hasChildren && (
                              <ChevronRight className={`w-4 h-4 transition-all duration-200 ${
                                isHovered ? "text-blue-500 translate-x-0.5" : "text-gray-300"
                              }`} />
                            )}
                          </Link>

                          {/* Sub-menu (Level 2) - Mega Menu */}
                          {hasChildren && isHovered && (
                            <>
                              {/* Mega Menu - sát ngay bên phải menu chính */}
                              <div className="absolute top-0 left-full w-[420px] z-50">
                                <div className="bg-white shadow-2xl shadow-gray-200/80 rounded-xl border border-gray-100/80 overflow-hidden">
                                  {/* Compact header */}
                                  <div className="bg-blue-600 px-4 py-3 flex items-center gap-2">
                                    <IconComponent className="w-4 h-4 text-white" />
                                    <span className="font-bold text-xs text-white">{item.name}</span>
                                  </div>

                                  {/* Compact brand list */}
                                  <div className="p-3 grid grid-cols-2 gap-2">
                                    {item.children!.map((sub, sidx) => (
                                      <Link
                                        key={sidx}
                                        href={sub.href}
                                        onClick={() => setMenuOpen(false)}
                                        className="group/link flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-all duration-150 text-sm font-medium"
                                      >
                                        <ChevronRight className="w-3 h-3 text-gray-300 group-hover/link:text-blue-500 transition-colors" />
                                        <span className="truncate">{sub.name}</span>
                                      </Link>
                                    ))}
                                  </div>

                                  {/* Compact view all */}
                                  <div className="px-3 pb-3">
                                    <Link
                                      href={item.href}
                                      onClick={() => setMenuOpen(false)}
                                      className="flex items-center justify-center gap-1 w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-150 text-xs font-bold"
                                    >
                                      Xem tất cả
                                      <ArrowRight className="w-3 h-3" />
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Footer */}
                    <div className="mt-2 px-5 py-3 border-t border-gray-100 bg-gradient-to-b from-gray-50/50 to-transparent">
                      <Link
                        href="/category"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition-all duration-200 font-bold text-xs"
                      >
                        Xem tất cả danh mục
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="relative flex-grow">
              <form
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  if (searchQuery.trim()) router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                }}
                className="relative"
              >
                <input
                  type="text"
                  placeholder="Bạn cần tìm gì..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-4 pr-12 rounded bg-white text-gray-800 outline-none text-sm focus:ring-2 focus:ring-blue-500"
                />
                <button type="submit" className="absolute right-0 top-0 h-10 w-12 flex items-center justify-center text-gray-800 hover:text-blue-600">
                  <Search className="w-5 h-5" />
                </button>
              </form>
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

            <Link href="/wishlist" className="flex flex-col items-center justify-center bg-[#1f2937] hover:bg-[#374151] rounded w-16 h-10 transition relative">
              <Heart className="w-4 h-4 text-gray-300 mb-0.5" />
              <span className="text-[10px] text-gray-300">Yêu thích</span>
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {wishlistCount > 9 ? "9+" : wishlistCount}
                </span>
              )}
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
              <li
                key={index}
                className="relative"
                onMouseEnter={() => item.children && setHoveredNav(index)}
                onMouseLeave={() => item.children && setHoveredNav(null)}
              >
                <Link
                  href={item.href}
                  className={`flex items-center gap-1 text-sm font-bold uppercase transition hover:text-blue-600 ${
                    item.hot ? "text-red-600" : "text-gray-800"
                  }`}
                >
                  {item.name}
                  {item.children && <ChevronDown className="w-4 h-4" />}
                </Link>

                {/* Dropdown */}
                {item.children && hoveredNav === index && (
                  <div className="absolute top-full left-0 pt-2 z-50">
                    <div className="bg-white rounded-xl shadow-xl shadow-gray-200/60 border border-gray-100 py-2 min-w-[200px]">
                      {item.children.map((sub, sidx) => (
                        <Link
                          key={sidx}
                          href={sub.href}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors font-medium"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </header>
  );
}
