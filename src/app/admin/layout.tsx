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
  Newspaper,
  FileText,
  LayoutTemplate,
  Zap,
  Search,
  Plus,
  BarChart3,
  ShieldCheck,
  History,
  CornerUpRight,
  Folder,
} from "lucide-react";
import AdminNotificationBell from "@/components/admin/notifications/AdminNotificationBell";
import AdminCommandPalette from "@/components/admin/ui/AdminCommandPalette";
import { adminCapability, canAdmin, type AdminPrincipal } from '@/lib/admin-permissions';
import './admin.css';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  /** Extra search terms so the sidebar filter finds items by synonyms. */
  keywords?: string;
}

interface NavGroup {
  groupName: string;
  items: NavItem[];
}

// Short labels, grouped by daily task. Keywords keep the old long names searchable.
const navGroups: NavGroup[] = [
  {
    groupName: "",
    items: [
      { name: "Tổng quan", href: "/admin/dashboard", icon: LayoutDashboard, keywords: "bảng tin dashboard" },
    ],
  },
  {
    groupName: "Bán hàng",
    items: [
      { name: "Đơn hàng", href: "/admin/orders", icon: ShoppingCart, keywords: "order" },
      { name: "Khách hàng", href: "/admin/customers", icon: Users, keywords: "customer" },
      { name: "Tư vấn", href: "/admin/contacts", icon: Mail, keywords: "hộp thư liên hệ contact" },
    ],
  },
  {
    groupName: "Sản phẩm",
    items: [
      { name: "Sản phẩm", href: "/admin/products", icon: Package, keywords: "laptop máy tính product" },
      { name: "Danh mục", href: "/admin/categories", icon: FolderTree, keywords: "category" },
      { name: "Thương hiệu", href: "/admin/brands", icon: Tag, keywords: "hãng brand" },
      { name: "Flash Sale", href: "/admin/campaigns", icon: Zap, keywords: "chiến dịch khuyến mãi campaign" },
    ],
  },
  {
    groupName: "Nội dung",
    items: [
      { name: "Bài viết", href: "/admin/posts", icon: Newspaper, keywords: "review tin tức post" },
      { name: "Chuyên mục", href: "/admin/post-categories", icon: Folder, keywords: "chuyên mục bài viết" },
      { name: "Trang", href: "/admin/pages", icon: FileText, keywords: "trang thông tin chính sách page" },
      { name: "Media", href: "/admin/media", icon: Images, keywords: "ảnh hình thư viện" },
    ],
  },
  {
    groupName: "Giao diện",
    items: [
      { name: "Trang chủ", href: "/admin/builder", icon: LayoutTemplate, keywords: "landing builder" },
      { name: "Menu", href: "/admin/navigation", icon: Menu, keywords: "mega menu điều hướng" },
    ],
  },
  {
    groupName: "Hệ thống",
    items: [
      { name: "Thống kê", href: "/admin/analytics", icon: BarChart3, keywords: "hành vi mua hàng analytics" },
      { name: "Cài đặt", href: "/admin/settings", icon: Settings, keywords: "cấu hình setting" },
      { name: "Tài khoản", href: "/admin/users", icon: ShieldCheck, keywords: "quyền user" },
      { name: "Nhật ký", href: "/admin/audit", icon: History, keywords: "audit log" },
      { name: "Chuyển hướng", href: "/admin/redirects", icon: CornerUpRight, keywords: "301 redirect" },
    ],
  },
];

const allNavItems = navGroups.flatMap(group => group.items);

const normalize = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [principal, setPrincipal] = useState<AdminPrincipal | null>(null);
  const [sessionError, setSessionError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/session', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (response.status === 401) { window.location.replace('/login'); return; }
      if (!response.ok) throw new Error();
      setPrincipal((await response.json()).data);
    }).catch(error => { if (error.name !== 'AbortError') setSessionError('Không thể kiểm tra phiên. Vui lòng tải lại.'); });
    return () => controller.abort();
  }, []);
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [navFilter, setNavFilter] = useState("");
  const quickAddRef = useRef<HTMLDivElement | null>(null);
  const openButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!quickAddOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!quickAddRef.current?.contains(event.target as Node)) setQuickAddOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setQuickAddOpen(false);
        quickAddRef.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [quickAddOpen]);

  // Global Ctrl + K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isItemActive = (href: string) => {
    if (pathname === href) return true;
    if (href === "/admin/dashboard" || href === "/admin") return false;
    return pathname.startsWith(`${href}/`) && !allNavItems.some(item => item.href !== href && item.href.length > href.length && pathname.startsWith(item.href));
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
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error('LOGOUT_FAILED');
      for (const key of ['citilap_product_editor_recovery','citilap-product-recovery','citilap-navigation-recovery']) sessionStorage.removeItem(key);
      router.replace("/login");
      router.refresh();
    } catch { setSessionError('Đăng xuất chưa thành công. Thử lại.'); }
  };

  const query = normalize(navFilter.trim());
  const visibleGroups = navGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item =>
        principal && canAdmin(principal, adminCapability(item.href)) &&
        (!query || normalize(`${item.name} ${group.groupName} ${item.keywords ?? ""}`).includes(query))
      ),
    }))
    .filter(group => group.items.length);

  const renderNavLinks = () => (
    <div className="admin-nav">
      <div className="admin-nav-filter">
        <Search className="size-3.5" aria-hidden="true" />
        <input
          type="search"
          value={navFilter}
          onChange={event => setNavFilter(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Enter" && visibleGroups[0]?.items[0]) {
              router.push(visibleGroups[0].items[0].href);
              setNavFilter("");
              setSidebarOpen(false);
            }
            if (event.key === "Escape") setNavFilter("");
          }}
          placeholder="Tìm menu…"
          aria-label="Lọc menu quản trị"
        />
      </div>
      {visibleGroups.length === 0 && <p className="admin-nav-empty">Không thấy mục nào</p>}
      {visibleGroups.map((group) => (
        <div key={group.groupName || "home"} className="admin-nav-group">
          {group.groupName && <div className="admin-nav-title">{group.groupName}</div>}
          <nav aria-label={group.groupName || "Tổng quan"}>
            {group.items.map((item) => {
              const active = isItemActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => { setSidebarOpen(false); setNavFilter(""); }}
                  aria-current={active ? "page" : undefined}
                  className="admin-nav-link"
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </div>
  );

  if (!principal) return <p role="status" className="p-6">{sessionError || 'Đang kiểm tra phiên…'}</p>;
  if (!canAdmin(principal, adminCapability(pathname))) return <p role="alert" className="p-6">Bạn không có quyền mở màn hình này.</p>;

  const displayName = principal.name || principal.email.split("@")[0];
  const roleLabel = principal.role === "OWNER" ? "Chủ shop" : principal.role === "EDITOR" ? "Biên tập" : "Bán hàng";

  const quickAddItems = [
    { href: "/admin/products/new", label: "Sản phẩm", icon: Package, show: true },
    { href: "/admin/posts/new", label: "Bài viết", icon: Newspaper, show: true },
    { href: "/admin/pages/new", label: "Trang", icon: FileText, show: true },
    { href: "/admin/campaigns", label: "Flash Sale", icon: Zap, show: canAdmin(principal, 'commerce') },
  ].filter(item => item.show);

  return (
    <div className="admin-shell relative flex h-dvh pt-11 bg-slate-50 text-slate-900 overflow-hidden font-sans">
      <a href="#admin-content" className="sr-only focus:not-sr-only focus:absolute focus:top-12 focus:left-64 focus:z-50 focus:bg-white focus:p-3">Đến nội dung chính</a>
      {sessionError && <p role="alert" className="fixed top-2 right-2 z-50 bg-red-50 text-red-800 p-3 rounded">{sessionError}</p>}

      {/* Desktop Sidebar */}
      <aside className="admin-sidebar hidden md:flex flex-col select-none" aria-label="Thanh điều hướng quản trị">
        <div className="flex-1 overflow-y-auto">{renderNavLinks()}</div>
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true" aria-label="Thanh điều hướng quản trị">
          <div className="fixed inset-0 bg-slate-950/60 transition-opacity" onClick={handleCloseDrawer} aria-hidden="true" />
          <aside className="admin-sidebar relative w-72 max-w-[80vw] flex flex-col h-full shadow-2xl z-10">
            <div className="h-12 flex items-center justify-between px-4 border-b border-slate-800">
              <span className="text-sm font-bold text-white">CitiLap Admin</span>
              <button ref={closeButtonRef} type="button" onClick={handleCloseDrawer} className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800" aria-label="Đóng (Esc)">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{renderNavLinks()}</div>
            <div className="p-2 border-t border-slate-800">
              <button type="button" onClick={handleLogout} className="admin-nav-link w-full">
                <LogOut className="size-4" aria-hidden="true" /><span>Đăng xuất</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar: logo · search · + Mới | bell · website · user */}
        <header className="admin-topbar absolute top-0 inset-x-0 flex items-center justify-between px-3 z-20 gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button ref={openButtonRef} type="button" onClick={() => setSidebarOpen(true)} className="admin-icon-btn md:hidden" aria-label="Mở menu">
              <Menu className="size-5" aria-hidden="true" />
            </button>

            <Link href="/admin/dashboard" className="admin-brand" title="Về Tổng quan">
              <span className="admin-brand-mark">CL</span>
              <span className="hidden sm:inline">CitiLap</span>
            </Link>

            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="admin-search-trigger"
              title="Tìm kiếm (Ctrl + K)"
            >
              <Search className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">Tìm đơn, sản phẩm, khách…</span>
              <kbd className="hidden sm:inline ml-auto">Ctrl K</kbd>
            </button>

            {canAdmin(principal, 'content') && <div ref={quickAddRef} className="relative">
              <button
                type="button"
                onClick={() => setQuickAddOpen(!quickAddOpen)}
                aria-expanded={quickAddOpen}
                aria-controls="admin-quick-add"
                className="admin-new-btn"
                title="Tạo mới"
              >
                <Plus className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Mới</span>
              </button>
              {quickAddOpen && (
                <div id="admin-quick-add" className="admin-menu" onClick={() => setQuickAddOpen(false)}>
                  {quickAddItems.map(({ href, label, icon: Icon }) => (
                    <Link key={href} href={href}>
                      <Icon className="size-4 text-slate-400" aria-hidden="true" />
                      <span>{label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {canAdmin(principal, 'orders') && <AdminNotificationBell />}
            <Link href="/" target="_blank" rel="noopener noreferrer" className="admin-icon-btn" title="Xem website (tab mới)" aria-label="Xem website">
              <ExternalLink className="size-4" aria-hidden="true" />
            </Link>
            <div className="hidden sm:flex items-center gap-2 pl-2 ml-1 border-l border-slate-700" title={`${displayName} · ${roleLabel}`}>
              <div className="size-7 rounded-full bg-blue-600 text-white font-bold text-[11px] grid place-items-center">
                {(principal.name || principal.email || "AD").slice(0, 2).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-slate-200 truncate max-w-[110px]">{displayName}</span>
            </div>
            <button type="button" onClick={handleLogout} className="admin-icon-btn hover:!text-red-300" title="Đăng xuất" aria-label="Đăng xuất">
              <LogOut className="size-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main id="admin-content" tabIndex={-1} className="admin-content flex-1 min-w-0 overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>

      {/* Global Command Palette Modal */}
      {commandPaletteOpen && <AdminCommandPalette principal={principal} onClose={() => setCommandPaletteOpen(false)} />}
    </div>
  );
}
