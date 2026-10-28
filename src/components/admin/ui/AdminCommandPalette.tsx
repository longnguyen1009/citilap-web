"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Package,
  ShoppingCart,
  ArrowRight,
  X,
} from "lucide-react";
import { adminCapability, canAdmin, type AdminPrincipal } from "@/lib/admin-permissions";

interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "navigation" | "products" | "orders" | "customers" | "posts";
  href: string;
  badge?: string;
  badgeColor?: string;
}

const STATIC_NAV_COMMANDS: SearchResultItem[] = [
  { id: "nav-dash", title: "Bảng tin Tổng quan", subtitle: "Thống kê vận hành thời gian thực", category: "navigation", href: "/admin/dashboard" },
  { id: "nav-prods", title: "Tất cả sản phẩm", subtitle: "Quản lý danh sách laptop và phụ kiện", category: "navigation", href: "/admin/products" },
  { id: "nav-new-prod", title: "Thêm sản phẩm mới", subtitle: "Biên tập sản phẩm máy tính mới", category: "navigation", href: "/admin/products/new", badge: "Tạo mới" },
  { id: "nav-orders", title: "Quản lý đơn hàng", subtitle: "Danh sách đơn hàng từ Storefront", category: "navigation", href: "/admin/orders" },
  { id: "nav-customers", title: "Hồ sơ khách hàng", subtitle: "Danh sách khách hàng và lịch sử mua", category: "navigation", href: "/admin/customers" },
  { id: "nav-contacts", title: "Hộp thư tư vấn & Khách hẹn", subtitle: "Tin nhắn và lịch hẹn từ Storefront", category: "navigation", href: "/admin/contacts" },
  { id: "nav-campaigns", title: "Chiến dịch Flash Sale", subtitle: "Cài đặt giá khuyến mãi và đếm ngược", category: "navigation", href: "/admin/campaigns" },
  { id: "nav-cats", title: "Danh mục sản phẩm", subtitle: "Cây phân cấp danh mục máy tính", category: "navigation", href: "/admin/categories" },
  { id: "nav-brands", title: "Thương hiệu & Hãng", subtitle: "Quản lý Asus, Dell, Lenovo, Apple...", category: "navigation", href: "/admin/brands" },
  { id: "nav-media", title: "Thư viện Media", subtitle: "Kho ảnh và video tập trung", category: "navigation", href: "/admin/media" },
  { id: "nav-posts", title: "Bài viết & Tin tức Review", subtitle: "Đánh giá laptop và mẹo công nghệ", category: "navigation", href: "/admin/posts" },
  { id: "nav-pages", title: "Trang chính sách tĩnh", subtitle: "Bảo hành, đổi trả, showroom", category: "navigation", href: "/admin/pages" },
  { id: "nav-builder", title: "Builder Trang chủ & Landing", subtitle: "Bố cục các khối ngoài Storefront", category: "navigation", href: "/admin/builder" },
  { id: "nav-settings", title: "Cài đặt hệ thống", subtitle: "Logo, hotline, VietQR, phí ship", category: "navigation", href: "/admin/settings" },
  { id: "nav-users", title: "Tài khoản & Phân quyền", subtitle: "Quản lý nhân viên Owner, Editor, Sales", category: "navigation", href: "/admin/users" },
];

export default function AdminCommandPalette({
  principal,
  onClose,
}: {
  principal: AdminPrincipal;
  onClose: () => void;
}) {
  const router = useRouter();
  const commands = useMemo(() => STATIC_NAV_COMMANDS.filter(command => canAdmin(principal, adminCapability(command.href))), [principal]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>(commands);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Focus input when opened
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.showModal();
    inputRef.current?.focus();
    return () => { dialog?.close(); opener?.focus(); };
  }, []);

  // Handle Escape key & Arrow navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown" && results.length) {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
      } else if (e.key === "ArrowUp" && results.length) {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
      } else if (e.key === "Enter" && e.target === inputRef.current) {
        e.preventDefault();
        if (results[selectedIndex]) {
          const target = results[selectedIndex].href;
          onClose();
          router.push(target);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [results, selectedIndex, onClose, router]);

  useEffect(() => {
    document.getElementById(`admin-command-${selectedIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Live search products & orders when query changes
  useEffect(() => {
    if (!query.trim()) {
      return;
    }

    const q = query.toLowerCase().trim();
    // Filter static commands first
    const matchedCommands = commands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(q) ||
        (cmd.subtitle && cmd.subtitle.toLowerCase().includes(q))
    );

    let active = true;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      const dynamicResults: SearchResultItem[] = [];
      let failed = false;

      try {
        // Query products API
        const prodRes = canAdmin(principal, 'content') ? await fetch(`/api/admin/products?q=${encodeURIComponent(q)}&limit=5`, { cache: 'no-store', signal: controller.signal }) : null;
        if (prodRes?.ok) {
          const prodData = await prodRes.json();
          const items = prodData?.items || prodData?.data?.items || [];
          for (const item of items) {
            dynamicResults.push({
              id: `prod-${item.id}`,
              title: item.name || item.publicName,
              subtitle: `${item.brand || "Sản phẩm"} · ${new Intl.NumberFormat("vi-VN").format(item.price ?? item.publicPrice ?? 0)}đ`,
              category: "products",
              href: `/admin/products/${item.id}`,
              badge: item.kind === "ACCESSORY" ? "Phụ kiện" : "Laptop",
              badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
            });
          }
        }
        if (prodRes && !prodRes.ok) failed = true;

        // Query orders API
        const orderRes = canAdmin(principal, 'orders') ? await fetch(`/api/orders?search=${encodeURIComponent(q)}&limit=3`, { cache: 'no-store', signal: controller.signal }) : null;
        if (orderRes?.ok) {
          const orderData = await orderRes.json();
          const orders = Array.isArray(orderData?.data) ? orderData.data : [];
          for (const ord of orders) {
            dynamicResults.push({
              id: `order-${ord.id}`,
              title: `Đơn #${ord.orderNumber || ord.id.slice(-6)} — ${ord.customerName}`,
              subtitle: `SĐT: ${ord.customerPhone} · ${new Intl.NumberFormat("vi-VN").format(ord.totalAmount || 0)}đ`,
              category: "orders",
              href: `/admin/orders/${ord.id}`,
              badge: ord.status,
              badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
            });
          }
        }
        if (orderRes && !orderRes.ok) failed = true;
      } catch {
        failed = true;
      }

      if (active) {
        setResults([...matchedCommands, ...dynamicResults]);
        setSelectedIndex(0);
        setLoading(false);
        setSearchError(failed);
      }
    }, 250);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, commands, principal]);

  return (
    <dialog
      ref={dialogRef}
      className="admin-command-dialog"
      aria-label="Tìm kiếm toàn hệ thống"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        if (e.target === e.currentTarget && (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[75vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            role="combobox"
            aria-label="Tìm sản phẩm, mã đơn hoặc trang quản trị"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls="admin-command-results"
            aria-activedescendant={results.length ? `admin-command-${selectedIndex}` : undefined}
            type="text"
            className="flex-1 bg-transparent border-none outline-hidden text-sm sm:text-base text-slate-900 placeholder:text-slate-400 font-medium"
            placeholder="Tìm sản phẩm, mã đơn hoặc trang quản trị…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); setSearchError(false); setLoading(Boolean(e.target.value.trim())); setResults(commands.filter(command => `${command.title} ${command.subtitle}`.toLowerCase().includes(e.target.value.trim().toLowerCase()))); }}
          />
          {loading && (
            <span className="text-xs text-slate-400 animate-pulse">Đang tìm…</span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
            title="Đóng (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Results List */}
        {searchError && <p role="status" className="px-4 py-2 text-xs text-amber-800">Một số dữ liệu chưa tải được. Thử tìm lại.</p>}
        <div id="admin-command-results" role="listbox" aria-label="Kết quả tìm kiếm" className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100">
          {results.length === 0 && !loading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Không tìm thấy nội dung phù hợp với &ldquo;<strong>{query}</strong>&rdquo;
            </div>
          ) : (
            results.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  id={`admin-command-${index}`}
                  key={item.id}
                  onClick={() => {
                    onClose();
                    router.push(item.href);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex w-full text-left items-center justify-between p-3 rounded-lg cursor-pointer transition ${
                    isSelected ? "bg-blue-50/80 text-blue-900" : "hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.category === "products" ? (
                        <Package className="w-4 h-4" />
                      ) : item.category === "orders" ? (
                        <ShoppingCart className="w-4 h-4" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{item.title}</div>
                      {item.subtitle && (
                        <div className="text-xs text-slate-500 truncate">{item.subtitle}</div>
                      )}
                    </div>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded border shrink-0 ${
                        item.badgeColor || "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] shadow-2xs font-mono">
                ↑
              </kbd>{" "}
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] shadow-2xs font-mono">
                ↓
              </kbd>{" "}
              để chuyển
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] shadow-2xs font-mono">
                Enter
              </kbd>{" "}
              để mở
            </span>
          </div>
          <span>
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] shadow-2xs font-mono">
              Esc
            </kbd>{" "}
            để đóng
          </span>
        </div>
      </div>
    </dialog>
  );
}
