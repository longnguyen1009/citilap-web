"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid3X3, ShoppingCart, Search, User } from "lucide-react";
import { useCart } from "@/context/CartContext";

const navItems = [
  { href: "/", icon: Home, label: "Trang chủ" },
  { href: "/category/laptop-gaming", icon: Grid3X3, label: "Danh mục" },
  { href: "/search", icon: Search, label: "Tìm kiếm" },
  { href: "/cart", icon: ShoppingCart, label: "Giỏ hàng" },
  { href: "/profile", icon: User, label: "Tài khoản" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { cartCount } = useCart();

  return (
    <nav aria-label="Điều hướng chính" className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden safe-area-bottom">
      <div className="grid grid-cols-5 h-14">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 relative transition ${
                isActive ? "text-blue-600" : "text-gray-500"
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                {item.href === "/cart" && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium leading-tight ${isActive ? "text-blue-600" : "text-gray-500"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
