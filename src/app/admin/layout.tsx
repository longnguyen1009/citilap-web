"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Bell,
  Menu,
  ShoppingCart,
  Package,
  FolderTree,
  Mail,
  Images,
  X,
  ExternalLink
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: "Thư viện ảnh & video", href: "/admin/media", icon: Images },
    { name: "Tổng quan", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Đơn hàng", href: "/admin/orders", icon: ShoppingCart },
    { name: "Quản lý sản phẩm", href: "/admin/products", icon: Package },
    { name: "Product Studio", href: "/admin/product-studio", icon: FolderTree },
    { name: "Danh mục", href: "/admin/categories", icon: FolderTree },
    { name: "Menu & bộ sưu tập", href: "/admin/navigation", icon: Menu },
    { name: "Hộp thư liên hệ", href: "/admin/contacts", icon: Mail },
    { name: "Khách hàng", href: "/admin/customers", icon: Users },
    { name: "Cấu hình & Giao diện", href: "/admin/settings", icon: Settings },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    router.replace("/login");
    router.refresh();
  };

  const sidebarContent = (
    <>
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <Link href="/admin/dashboard" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
          CitiLap Admin
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-6">
        <nav className="space-y-1 px-3">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="p-4 border-t border-slate-800 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg w-full transition"
        >
          <ExternalLink className="w-5 h-5" />
          Xem trang bán hàng
        </Link>
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg w-full transition">
          <LogOut className="w-5 h-5" />
          Đăng xuất
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar - desktop */}
      <aside className="w-64 bg-slate-900 text-white flex-shrink-0 hidden md:flex flex-col">
        {sidebarContent}
      </aside>

      {/* Sidebar - mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
              aria-label="Đóng menu"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-500 hover:text-gray-700" aria-label="Mở menu">
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1 px-4 hidden md:block">
            <span className="text-sm text-gray-500">
              {navigation.find((item) => isActive(item.href))?.name ?? "Admin"}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button className="text-gray-400 hover:text-gray-500 relative" aria-label="Thông báo">
              <Bell className="h-6 w-6" />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
            </button>
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
              A
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
