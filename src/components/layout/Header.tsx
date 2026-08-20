import Link from "next/link";
import { 
  Search, Menu, PhoneCall, MapPin, 
  ClipboardCheck, User, Monitor, ChevronDown, ChevronRight
} from "lucide-react";
import CartIcon from "./CartIcon";

const categoryMenu = [
  { name: "Laptop Mới", href: "/category/laptop-moi" },
  { 
    name: "Laptop Gaming", 
    href: "/category/laptop-gaming",
    children: [
      { name: "Acer Gaming", href: "/category/laptop-gaming?brand=acer" },
      { name: "Asus Gaming", href: "/category/laptop-gaming?brand=asus" },
      { name: "Dell Gaming", href: "/category/laptop-gaming?brand=dell" },
      { name: "Lenovo Gaming", href: "/category/laptop-gaming?brand=lenovo" },
      { name: "HP Gaming", href: "/category/laptop-gaming?brand=hp" },
      { name: "MSI Gaming", href: "/category/laptop-gaming?brand=msi" },
    ]
  },
  { 
    name: "Laptop Văn Phòng", 
    href: "/category/laptop-van-phong",
    children: [
      { name: "Acer Văn Phòng", href: "/category/laptop-van-phong?brand=acer" },
      { name: "Asus Văn Phòng", href: "/category/laptop-van-phong?brand=asus" },
      { name: "Dell Văn Phòng", href: "/category/laptop-van-phong?brand=dell" },
      { name: "Lenovo Văn Phòng", href: "/category/laptop-van-phong?brand=lenovo" },
      { name: "HP Văn Phòng", href: "/category/laptop-van-phong?brand=hp" },
      { name: "LG Văn Phòng", href: "/category/laptop-van-phong?brand=lg" },
      { name: "MSI Văn Phòng", href: "/category/laptop-van-phong?brand=msi" },
      { name: "Sam Sung Văn Phòng", href: "/category/laptop-van-phong?brand=samsung" },
    ]
  },
  { 
    name: "Laptop Đồ Họa – Kĩ Thuật", 
    href: "/category/laptop-do-hoa",
    children: [
      { name: "Acer Đồ Họa", href: "/category/laptop-do-hoa?brand=acer" },
      { name: "Dell Đồ Họa", href: "/category/laptop-do-hoa?brand=dell" },
      { name: "Lenovo Đồ Họa", href: "/category/laptop-do-hoa?brand=lenovo" },
      { name: "HP Đồ Họa", href: "/category/laptop-do-hoa?brand=hp" },
    ]
  },
  { name: "Laptop Like New", href: "/category/laptop-cu" },
  { name: "Linh Kiện – Phụ Kiện", href: "/category/linh-kien" },
  { name: "Microsoft Surface", href: "/category/surface" },
  { name: "PC- Máy tính để bàn", href: "/category/pc" },
  { name: "Linh kiện PC- Máy bàn", href: "/category/linh-kien-pc" },
  { name: "Camera", href: "/category/camera" },
];

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
            <div className="relative group hidden md:block">
              <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition shadow-[0_0_15px_rgba(37,99,235,0.4)] cursor-pointer">
                <Menu className="w-5 h-5" />
                <span>Danh mục</span>
              </button>
              {/* Dropdown Menu (Level 1) */}
              <div className="absolute top-full left-0 pt-3 w-[260px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                <div className="bg-white rounded-b-lg shadow-2xl py-2 text-sm text-gray-700 relative border border-gray-100 min-h-[420px]">
                  {categoryMenu.map((item, idx) => (
                    <div key={idx} className="group/item">
                      <Link 
                        href={item.href} 
                        className="flex items-center justify-between px-5 py-3 border-l-[3px] border-transparent hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50/50 transition-all font-medium"
                      >
                        {item.name}
                        {item.children && <ChevronRight className="w-4 h-4 text-gray-400 group-hover/item:text-blue-600 transition-colors" />}
                      </Link>
                      
                      {/* Sub-menu (Level 2) - Fixed Mega Menu Size */}
                      {item.children && (
                        <div className="absolute top-0 left-full w-[800px] h-full opacity-0 invisible group-hover/item:opacity-100 group-hover/item:visible transition-all duration-300 pl-0.5 z-50">
                          <div className="bg-[#f8fafc] w-full h-full p-6 shadow-[15px_0_20px_-5px_rgba(0,0,0,0.1)] border-l border-gray-100 rounded-r-lg flex flex-col flex-wrap content-start gap-x-4 gap-y-3">
                            {item.children.map((sub, sidx) => (
                              <Link 
                                key={sidx}
                                href={sub.href}
                                className="group/link bg-white border border-gray-100 shadow-sm text-gray-700 hover:text-blue-700 hover:border-blue-300 hover:shadow-md px-4 py-3 rounded-lg transition-all font-medium w-[220px] truncate flex items-center gap-3"
                              >
                                <div className="w-2 h-2 rounded-full bg-gray-200 group-hover/link:bg-blue-600 transition-colors shrink-0"></div>
                                {sub.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
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
