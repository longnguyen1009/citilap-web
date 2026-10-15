"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import {
  Mail,
  Phone,
  Clock,
  RefreshCw,
  Search,
  Download,
  FileText,
  UserCheck,
  CheckCircle2,
  History,
} from "lucide-react";
import {
  PageHeader,
  AdminCard,
  AdminButton,
  StatusBadge,
  InlineAlert,
} from "@/components/admin/ui";

interface ContactEvent {
  id: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  actor: string;
  createdAt: string;
}

interface ContactSubmission {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  status: "PENDING" | "PROCESSING" | "HANDLED";
  revision: number;
  internalNote: string | null;
  handledAt: string | null;
  handledBy: string | null;
  startedProcessingAt: string | null;
  events?: ContactEvent[];
  createdAt: string;
  updatedAt: string;
}

function ContactsContent() {
  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "PROCESSING" | "HANDLED">("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchContacts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (statusFilter !== "ALL") params.set("status", statusFilter);

    fetch(`/api/admin/contacts?${params.toString()}`, {
      credentials: "same-origin",
      headers: { "Cache-Control": "no-cache" },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setContacts(data.data);
          if (data.pagination) setTotal(data.pagination.total);
        } else {
          setFeedback({
            type: "error",
            message: data?.error || "Không thể tải danh sách liên hệ.",
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load contact submissions:", err);
        setFeedback({
          type: "error",
          message: "Lỗi kết nối đến máy chủ khi tải liên hệ.",
        });
      })
      .finally(() => setLoading(false));
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchContacts]);

  const handleUpdateStatus = async (
    contact: ContactSubmission,
    newStatus: "PENDING" | "PROCESSING" | "HANDLED",
    noteContent?: string
  ) => {
    setUpdatingId(contact.id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/contacts/${contact.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedRevision: contact.revision,
          status: newStatus,
          internalNote: noteContent,
        }),
      });

      const result = await res.json();

      if (res.status === 409) {
        // CAS conflict: preserve draft in state, do not overwrite user input
        setFeedback({
          type: "error",
          message:
            result?.error ||
            "Xung đột phiên làm việc: Yêu cầu liên hệ đã được cập nhật bởi phiên khác. Bản nháp ghi chú của bạn đã được giữ nguyên. Vui lòng bấm Tải lại để xem dữ liệu mới.",
        });
        return;
      }

      if (res.ok && result.success && result.data) {
        setContacts((prev) =>
          prev.map((c) => (c.id === contact.id ? { ...result.data } : c))
        );
        setEditingNoteId(null);
        setNoteDraft("");
        setFeedback({
          type: "success",
          message: `Đã cập nhật trạng thái liên hệ sang "${newStatus}".`,
        });
      } else {
        setFeedback({
          type: "error",
          message: result?.error || "Không thể cập nhật liên hệ.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Đã xảy ra lỗi khi cập nhật liên hệ." });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (statusFilter !== "ALL") params.set("status", statusFilter);

    window.open(`/api/admin/contacts/export?${params.toString()}`, "_blank");
  };

  const pendingCount = contacts.filter((c) => c.status === "PENDING").length;

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Hộp thư Liên hệ & Tư vấn"
        description="Tiếp nhận và phản hồi yêu cầu tư vấn, báo giá, hỗ trợ kỹ thuật từ khách hàng với ghi chú nội bộ, CAS chống ghi đè và truy vết dòng thời gian."
        breadcrumbs={[{ label: "Bán hàng" }, { label: "Hộp thư liên hệ" }]}
        actions={
          <div className="flex items-center gap-2">
            <AdminButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleExport}
              disabled={loading || contacts.length === 0}
              icon={<Download className="w-4 h-4" aria-hidden="true" />}
            >
              Xuất CSV ({total || contacts.length} liên hệ)
            </AdminButton>
          </div>
        }
      />

      {feedback && (
        <InlineAlert variant={feedback.type} onClose={() => setFeedback(null)}>
          {feedback.message}
        </InlineAlert>
      )}

      {/* 2. Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
          <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            Tổng tin nhắn liên hệ
          </div>
          <div className="text-2xl font-black text-slate-900">{total || contacts.length}</div>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
          <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            Chưa liên hệ lại
          </div>
          <div className="text-2xl font-black text-amber-600">{pendingCount}</div>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
          <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            Đã xử lý xong
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {contacts.filter((c) => c.status === "HANDLED").length}
          </div>
        </div>
      </div>

      {/* 3. Main List Card */}
      <AdminCard bodyClassName="p-0">
        {/* Filters */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 justify-between bg-slate-50/60">
          <div className="relative max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Tìm theo tên, điện thoại, email, nội dung..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "ALL" | "PENDING" | "PROCESSING" | "HANDLED")}
              aria-label="Lọc theo trạng thái"
              className="border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm bg-white font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-hidden"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Mới (Chưa xử lý)</option>
              <option value="PROCESSING">Đang xử lý</option>
              <option value="HANDLED">Đã xử lý xong</option>
            </select>

            <button
              type="button"
              onClick={fetchContacts}
              disabled={loading}
              aria-label="Tải lại danh sách"
              className="p-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* List Content */}
        <div className="divide-y divide-slate-100 p-4 space-y-3">
          {loading ? (
            <div className="py-16 text-center text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              <span>Đang tải danh sách liên hệ...</span>
            </div>
          ) : contacts.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              Không có yêu cầu liên hệ nào phù hợp với bộ lọc.
            </div>
          ) : (
            contacts.map((contact) => (
              <div
                key={contact.id}
                className={`p-5 rounded-xl border transition-all ${
                  contact.status === "PENDING"
                    ? "bg-amber-50/30 border-amber-200"
                    : contact.status === "PROCESSING"
                    ? "bg-indigo-50/20 border-indigo-200"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left: Contact content */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-base font-bold text-slate-900">{contact.name}</span>
                      <StatusBadge status={contact.status} />
                      <span className="text-xs text-slate-400 font-mono">v{contact.revision}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(contact.createdAt).toLocaleString("vi-VN", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                      <a
                        href={`tel:${contact.phone}`}
                        className="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-mono font-bold"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {contact.phone}
                      </a>
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="inline-flex items-center gap-1.5 text-slate-600 hover:text-blue-600 hover:underline"
                        >
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {contact.email}
                        </a>
                      )}
                    </div>

                    {contact.message ? (
                      <div className="mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {contact.message}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">
                        Không để lại lời nhắn (cần tư vấn trực tiếp qua điện thoại).
                      </div>
                    )}

                    {/* Internal Note Display */}
                    {contact.internalNote && editingNoteId !== contact.id && (
                      <div className="mt-2 p-2.5 bg-blue-50/50 border border-blue-200/60 rounded-lg text-xs flex items-start gap-2 text-blue-900">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span className="font-bold">Ghi chú gần nhất: </span>
                          <span>{contact.internalNote}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoteId(contact.id);
                            setNoteDraft(contact.internalNote || "");
                          }}
                          className="text-[11px] text-blue-600 hover:underline font-medium cursor-pointer"
                        >
                          Sửa
                        </button>
                      </div>
                    )}

                    {/* Internal Note Editing Form */}
                    {editingNoteId === contact.id && (
                      <div className="mt-2 p-3 bg-white border border-blue-300 rounded-lg shadow-xs space-y-2">
                        <textarea
                          rows={2}
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          placeholder="Nhập ghi chú xử lý nội bộ..."
                          className="w-full text-xs p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-hidden"
                        />
                        <div className="flex justify-end gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setEditingNoteId(null)}
                            className="px-2.5 py-1 border border-slate-300 rounded hover:bg-slate-50 text-slate-600 cursor-pointer"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(contact, contact.status, noteDraft)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded cursor-pointer"
                          >
                            Lưu ghi chú
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Distinct Processing vs Handled Timestamps */}
                    <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                      {contact.startedProcessingAt && (
                        <div className="flex items-center gap-1.5 text-indigo-700">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            Bắt đầu xử lý: {new Date(contact.startedProcessingAt).toLocaleString("vi-VN")}
                          </span>
                        </div>
                      )}
                      {contact.handledAt && (
                        <div className="flex items-center gap-1.5 text-emerald-700">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>
                            Đã xử lý xong bởi <strong>{contact.handledBy || "Admin vận hành"}</strong> lúc{" "}
                            {new Date(contact.handledAt).toLocaleString("vi-VN")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Timeline History toggle */}
                    {contact.events && contact.events.length > 0 && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedHistoryId(expandedHistoryId === contact.id ? null : contact.id)
                          }
                          className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer font-medium"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>
                            {expandedHistoryId === contact.id
                              ? "Thu gọn lịch sử xử lý"
                              : `Xem lịch sử xử lý (${contact.events.length} lần thao tác)`}
                          </span>
                        </button>

                        {expandedHistoryId === contact.id && (
                          <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                            <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                              Dòng thời gian xử lý:
                            </div>
                            <div className="space-y-1.5">
                              {contact.events.map((evt) => (
                                <div
                                  key={evt.id}
                                  className="text-[11px] text-slate-600 border-l-2 border-blue-400 pl-2.5 py-0.5"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-slate-800">
                                      {evt.action === "STATUS_CHANGE"
                                        ? `Đổi trạng thái: ${evt.fromStatus || "—"} ➔ ${evt.toStatus}`
                                        : "Ghi chú nội bộ"}
                                    </span>
                                    <span className="text-slate-400 font-mono text-[10px]">
                                      {new Date(evt.createdAt).toLocaleString("vi-VN")}
                                    </span>
                                  </div>
                                  <div className="text-slate-500 mt-0.5">
                                    Thực hiện: <strong>{evt.actor}</strong>
                                    {evt.note && <span className="ml-1 text-slate-700 italic">“{evt.note}”</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap md:flex-col items-end gap-2 shrink-0">
                    {contact.status === "PENDING" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(contact, "PROCESSING")}
                        disabled={updatingId === contact.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-300 transition cursor-pointer"
                      >
                        Đang liên hệ
                      </button>
                    )}

                    {contact.status !== "HANDLED" ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(contact, "HANDLED")}
                        disabled={updatingId === contact.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Đã xử lý xong</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(contact, "PENDING")}
                        disabled={updatingId === contact.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition cursor-pointer"
                      >
                        Mở lại (Chưa xử lý)
                      </button>
                    )}

                    {!contact.internalNote && editingNoteId !== contact.id && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteId(contact.id);
                          setNoteDraft("");
                        }}
                        className="text-xs text-slate-500 hover:text-blue-600 underline font-medium cursor-pointer"
                      >
                        + Thêm ghi chú
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </AdminCard>
    </div>
  );
}

export default function AdminContactsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Đang tải hộp thư liên hệ...</div>}>
      <ContactsContent />
    </Suspense>
  );
}
