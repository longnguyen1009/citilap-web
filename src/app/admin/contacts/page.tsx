"use client";

import { useEffect, useState, useCallback } from "react";
import { Mail, Phone, Clock, CheckCircle2, AlertCircle, RefreshCw, Search, Check, RotateCcw } from "lucide-react";

interface ContactSubmission {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  status: "PENDING" | "HANDLED";
  createdAt: string;
  updatedAt: string;
}

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "HANDLED">("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchContacts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (statusFilter !== "ALL") params.set("status", statusFilter);

    fetch(`/api/admin/contacts?${params.toString()}`, {
      credentials: "same-origin",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setContacts(data.data);
        }
      })
      .catch((err) => console.error("Failed to load contact submissions:", err))
      .finally(() => setLoading(false));
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchContacts]);

  const handleToggleStatus = async (contact: ContactSubmission) => {
    const newStatus = contact.status === "PENDING" ? "HANDLED" : "PENDING";
    setUpdatingId(contact.id);

    try {
      const res = await fetch(`/api/admin/contacts/${contact.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await res.json();
      if (result.success) {
        setContacts((prev) =>
          prev.map((c) => (c.id === contact.id ? { ...c, status: newStatus } : c))
        );
      } else {
        alert(result.error || "Không thể cập nhật trạng thái");
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Đã xảy ra lỗi khi cập nhật");
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = contacts.filter((c) => c.status === "PENDING").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">Hộp thư liên hệ & Tư vấn</h1>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {pendingCount} chưa xử lý
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Tiếp nhận và phản hồi yêu cầu tư vấn, báo giá, hỗ trợ kỹ thuật từ khách hàng
          </p>
        </div>
        <button
          onClick={fetchContacts}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === "ALL"
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setStatusFilter("PENDING")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === "PENDING"
                ? "bg-amber-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Chờ xử lý (PENDING)
          </button>
          <button
            onClick={() => setStatusFilter("HANDLED")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === "HANDLED"
                ? "bg-emerald-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Đã xử lý (HANDLED)
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên, SĐT, nội dung..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Contact Items List */}
      {loading ? (
        <div className="flex justify-center items-center py-20 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span>Đang tải danh sách liên hệ...</span>
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-xl border border-slate-800/80 p-8">
          <Mail className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-slate-300">Không tìm thấy yêu cầu nào</h3>
          <p className="text-sm text-slate-500 mt-1">
            Chưa có tin nhắn liên hệ nào phù hợp với bộ lọc hiện tại.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className={`p-5 rounded-xl border transition-all ${
                contact.status === "PENDING"
                  ? "bg-slate-900/90 border-amber-500/30 hover:border-amber-500/50"
                  : "bg-slate-900/40 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                {/* Customer Details */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-base font-bold text-white">{contact.name}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        contact.status === "PENDING"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      {contact.status === "PENDING" ? (
                        <>
                          <AlertCircle className="w-3 h-3" /> Chờ xử lý
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> Đã liên hệ
                        </>
                      )}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(contact.createdAt).toLocaleString("vi-VN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                    <a
                      href={`tel:${contact.phone}`}
                      className="inline-flex items-center gap-1.5 text-blue-400 hover:underline font-mono"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {contact.phone}
                    </a>
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="inline-flex items-center gap-1.5 text-slate-300 hover:underline"
                      >
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {contact.email}
                      </a>
                    )}
                  </div>

                  {contact.message ? (
                    <div className="mt-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {contact.message}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic">Không để lại lời nhắn (cần tư vấn trực tiếp qua điện thoại).</div>
                  )}
                </div>

                {/* Status Action */}
                <div className="flex items-center gap-2 self-start md:self-center">
                  <button
                    onClick={() => handleToggleStatus(contact)}
                    disabled={updatingId === contact.id}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors border ${
                      contact.status === "PENDING"
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                    } disabled:opacity-50`}
                  >
                    {updatingId === contact.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : contact.status === "PENDING" ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Đánh dấu đã xử lý
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        Đánh dấu chưa xử lý
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
