"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Mail,
  Users,
  Package,
  FolderTree,
  Images,
  Tag,
  Menu,
  Settings,
  LogOut,
  ExternalLink,
  X,
  Sparkles,
} from "lucide-react";
import AdminBreadcrumbs, { type BreadcrumbItem } from "@/components/admin/ui/AdminBreadcrumbs";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavGroup {
  groupName: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    groupName: "Tổng quan & Bán hàng",
    items: [
      { name: "Tổng quan", href: "/admin/dashboard", icon: LayoutDashboard },
      { name: "Đơn hàng", href: "/admin/orders", icon: ShoppingCart },
      { name: "Hộp thư liên hệ", href: "/admin/contacts", icon: Mail },
      { name: "Khách hàng", href: "/admin/customers", icon: Users },
    ],
  },
  {
    groupName: "Catalog & Sản phẩm",
    items: [
      { name: "Sản phẩm", href: "/admin/products", icon: Package },
      { name: "Thương hiệu", href: "/admin/brands", icon: Tag },
      { name: "Thư viện Media", href: "/admin/media", icon: Images },
    ],
  },
  {
    groupName: "Nội dung & Hệ thống",
    items: [
      { name: "Danh mục sản phẩm", href: "/admin/categories", icon: FolderTree },
      { name: "Menu & Bộ sưu tập", href: "/admin/navigation", icon: Menu },
      { name: "Cài đặt hệ thống", href: "/admin/settings", icon: Settings },
    ],
  },
];

function getBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  if (pathname === "/admin" || pathname === "/admin/dashboard") {
    return [{ label: "Tổng quan" }];
  }
  if (pathname === "/admin/orders") {
    return [{ label: "Bán hàng" }, { label: "Đơn hàng" }];
  }
  if (pathname.startsWith("/admin/orders/")) {
    return [{ label: "Đơn hàng", href: "/admin/orders" }, { label: "Chi tiết đơn" }];
  }
  if (pathname === "/admin/contacts") {
    return [{ label: "Bán hàng" }, { label: "Hộp thư liên hệ" }];
  }
  if (pathname === "/admin/customers") {
    return [{ label: "Bán hàng" }, { label: "Khách hàng" }];
  }
  if (pathname === "/admin/products") {
    return [{ label: "Sản phẩm" }, { label: "Danh sách sản phẩm" }];
  }
  if (pathname === "/admin/products/new") {
    return [{ label: "Sản phẩm", href: "/admin/products" }, { label: "Thêm sản phẩm mới" }];
  }
  if (pathname.startsWith("/admin/products/")) {
    return [{ label: "Sản phẩm", href: "/admin/products" }, { label: "Biên tập sản phẩm" }];
  }
  if (pathname === "/admin/product-studio") {
    return [{ label: "Sản phẩm", href: "/admin/products" }, { label: "Biên tập sản phẩm" }];
  }
  if (pathname === "/admin/media") {
    return [{ label: "Catalog" }, { label: "Thư viện Media" }];
  }
  if (pathname === "/admin/categories") {
    return [{ label: "Nội dung" }, { label: "Danh mục sản phẩm" }];
  }
  if (pathname === "/admin/navigation") {
    return [{ label: "Nội dung" }, { label: "Menu & Bộ sưu tập" }];
  }
  if (pathname === "/admin/settings") {
    return [{ label: "Hệ thống" }, { label: "Cài đặt hệ thống" }];
  }
  return [{ label: "Quản trị" }];
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const isItemActive = (href: string) => {
    if (pathname === href) return true;
    if (href === "/admin/dashboard" || href === "/admin") return false;
    return pathname.startsWith(`${href}/`);
  };

  // Keyboard navigation & focus management for mobile drawer
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
      closeButtonRef.current?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setSidebarOpen(false);
          openButtonRef.current?.focus();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [sidebarOpen]);

  const handleCloseDrawer = () => {
    setSidebarOpen(false);
    openButtonRef.current?.focus();
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    router.replace("/login");
    router.refresh();
  };

  const breadcrumbs = getBreadcrumbsFromPath(pathname);

  const renderNavLinks = () => (
    <div className="space-y-6">
      {navGroups.map((group) => (
        <div key={group.groupName}>
          <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {group.groupName}
          </div>
          <nav className="space-y-0.5" aria-label={group.groupName}>
            {group.items.map((item) => {
              const active = isItemActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
                    active
                      ? "bg-blue-600 text-white shadow-xs font-semibold"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-4 h-4 shrink-0 text-slate-300" aria-hidden="true" />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        active
                          ? "bg-blue-800 text-blue-100"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </div>
  );

  const sidebarFooter = (
    <div className="p-3 border-t border-slate-800 space-y-1">
      <Link
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
      >
        <span className="flex items-center gap-2.5">
          <ExternalLink className="w-4 h-4 text-slate-400" aria-hidden="true" />
          <span>Xem website</span>
        </span>
        <span className="text-[10px] text-slate-500 uppercase font-semibold">Mở tab</span>
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-lg w-full transition text-left cursor-pointer"
      >
        <LogOut className="w-4 h-4 text-slate-400" aria-hidden="true" />
        <span>Đăng xuất</span>
      </button>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside
        className="w-64 bg-slate-900 text-white flex-shrink-0 hidden md:flex flex-col border-r border-slate-800 select-none"
        aria-label="Thanh điều hướng quản trị"
      >
        <div className="h-14 flex items-center px-5 border-b border-slate-800">
          <Link href="/admin/dashboard" className="flex items-center gap-2 text-lg font-bold text-white tracking-tight">
            <span className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-xs">
              CL
            </span>
            <span>CitiLap Admin</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {renderNavLinks()}
        </div>

        {sidebarFooter}
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Thanh điều hướng quản trị"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={handleCloseDrawer}
            aria-hidden="true"
          />

          {/* Drawer container */}
          <aside className="relative w-72 max-w-[80vw] bg-slate-900 text-white flex flex-col h-full shadow-2xl z-10">
            <div className="h-14 flex items-center justify-between px-5 border-b border-slate-800">
              <Link
                href="/admin/dashboard"
                onClick={handleCloseDrawer}
                className="flex items-center gap-2 text-base font-bold text-white tracking-tight"
              >
                <span className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-black">
                  CL
                </span>
                <span>CitiLap Admin</span>
              </Link>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={handleCloseDrawer}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                aria-label="Đóng thanh điều hướng (Esc)"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4">
              {renderNavLinks()}
            </div>

            {sidebarFooter}
          </aside>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-slate-200/90 flex items-center justify-between px-4 sm:px-6 z-10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              ref={openButtonRef}
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              aria-label="Mở thanh điều hướng"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* Unified Breadcrumbs on Topbar */}
            <div className="min-w-0">
              <AdminBreadcrumbs items={breadcrumbs} />
            </div>
          </div>

          {/* Right actions: Quick Storefront link & User info */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50/60 border border-slate-200 px-3 py-1.5 rounded-lg transition"
              title="Mở website cửa hàng trên tab mới"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Xem website</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-red-600 p-1.5 sm:px-2 sm:py-1.5 rounded-lg hover:bg-slate-100 transition"
              title="Đăng xuất khỏi hệ thống quản trị"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
