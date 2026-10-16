"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ShoppingCart, Mail, CheckCheck, Loader2 } from "lucide-react";

interface AdminNotificationItem {
  id: string;
  type: string;
  referenceId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function AdminNotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [markingAll, setMarkingAll] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications?limit=15", {
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setNotifications(json.data || []);
          setUnreadCount(json.unreadCount || 0);
        }
      }
    } catch (e) {
      console.error("[NotificationBell] Poll error:", e);
    }
  }, []);

  // Initial fetch and visibility-aware polling
  useEffect(() => {
    let canceled = false;
    const load = () => {
      fetch("/api/admin/notifications?limit=15", {
        headers: { "Cache-Control": "no-cache" },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (!canceled && json?.success) {
            setNotifications(json.data || []);
            setUnreadCount(json.unreadCount || 0);
          }
        })
        .catch(() => {});
    };

    load();

    const intervalId = setInterval(() => {
      if (!document.hidden) {
        load();
      }
    }, 30000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        load();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      canceled = true;
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Click outside & Escape key listeners
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleMarkAsRead = async (notif: AdminNotificationItem) => {
    if (!notif.isRead) {
      try {
        await fetch(`/api/admin/notifications/${notif.id}/read`, {
          method: "PATCH",
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (e) {
        console.error("Mark read error:", e);
      }
    }

    setOpen(false);
    if (notif.type === "NEW_ORDER" || notif.type === "ORDER_STATUS_CHANGED") {
      router.push(`/admin/orders/${notif.referenceId}`);
    } else if (notif.type === "NEW_CONTACT") {
      router.push("/admin/contacts");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      const res = await fetch("/api/admin/notifications/read-all", { method: "POST" });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (e) {
      console.error("Mark all read error:", e);
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        id="admin-notification-bell-btn"
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) fetchNotifications();
        }}
        className="relative p-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        aria-label={`Thông báo (${unreadCount} chưa đọc)`}
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            id="admin-notification-unread-badge"
            className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id="admin-notification-dropdown"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
          role="region"
          aria-label="Hộp thư thông báo"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span>Thông báo hệ thống</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-red-500/80 text-white px-1.5 py-0.2 rounded-full font-bold">
                    {unreadCount} mới
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Thông báo · Đã đọc theo tài khoản
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                id="admin-notification-mark-all-btn"
                disabled={markingAll}
                onClick={handleMarkAllRead}
                className="text-xs text-blue-300 hover:text-white flex items-center gap-1 font-medium transition disabled:opacity-50"
                title="Đánh dấu tất cả thông báo là đã đọc"
              >
                {markingAll ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5" />
                )}
                <span>Đã đọc hết</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Chưa có thông báo nào
              </div>
            ) : (
              notifications.map((n) => {
                const isOrder = n.type === "NEW_ORDER" || n.type === "ORDER_STATUS_CHANGED";
                const isContact = n.type === "NEW_CONTACT";

                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleMarkAsRead(n)}
                    className={`w-full text-left p-3.5 flex gap-3 transition hover:bg-slate-50 cursor-pointer ${
                      n.isRead ? "opacity-75 bg-white" : "bg-blue-50/40"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isOrder
                          ? "bg-blue-100 text-blue-600"
                          : isContact
                          ? "bg-amber-100 text-amber-600"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isOrder ? (
                        <ShoppingCart className="w-4 h-4" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-xs font-semibold ${n.isRead ? "text-slate-700" : "text-blue-950 font-bold"}`}>
                          {n.title}
                        </span>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {n.message}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1.5 block">
                        {new Date(n.createdAt).toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <Link
              href="/admin/orders"
              onClick={() => setOpen(false)}
              className="text-blue-600 hover:underline font-semibold"
            >
              Xem đơn hàng →
            </Link>
            <Link
              href="/admin/contacts"
              onClick={() => setOpen(false)}
              className="text-slate-600 hover:text-slate-900 font-medium"
            >
              Hộp thư liên hệ →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
