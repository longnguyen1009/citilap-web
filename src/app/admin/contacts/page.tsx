"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";
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
  X,
  ChevronLeft,
  ChevronRight,
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

const STATUS_TABS = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING", label: "Chưa xử lý" },
  { key: "PROCESSING", label: "Đang xử lý" },
  { key: "HANDLED", label: "Đã xong" },
] as const;

type ContactFilterStatus = "ALL" | "PENDING" | "PROCESSING" | "HANDLED";

const PAGE_LIMIT = 20;

function ContactsContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialSearch = searchParams.get("search") || "";
  const rawStatus = (searchParams.get("status") || "ALL").toUpperCase();
  const initialStatus: ContactFilterStatus = ["ALL", "PENDING", "PROCESSING", "HANDLED"].includes(rawStatus)
    ? (rawStatus as ContactFilterStatus)
    : "ALL";
  const initialPage = Math.max(1, Number(searchParams.get("page")) || 1);

  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingCount, setPendingCount] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<ContactFilterStatus>(initialStatus);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  // Anti-stale request guards
  const requestSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const updateUrlParams = useCallback(
    (nextSearch: string, nextStatus: ContactFilterStatus, nextPage: number) => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams();
      if (nextSearch.trim()) params.set("search", nextSearch.trim());
      if (nextStatus && nextStatus !== "ALL") params.set("status", nextStatus);
      if (nextPage > 1) params.set("page", String(nextPage));

      const queryStr = params.toString();
      const targetUrl = queryStr ? `${pathname}?${queryStr}` : pathname;
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (targetUrl !== currentUrl) {
        window.history.replaceState(null, "", targetUrl);
      }
    },
    [pathname]
  );

  const fetchContacts = useCallback(async () => {
    const reqId = ++requestSeqRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setLoadError(null);

    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    params.set("page", String(page));
    params.set("limit", String(PAGE_LIMIT));

    updateUrlParams(searchTerm, statusFilter, page);

    try {
      const res = await fetch(`/api/admin/contacts?${params.toString()}`, {
        credentials: "same-origin",
        headers: { "Cache-Control": "no-cache" },
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      if (reqId !== requestSeqRef.current || controller.signal.aborted) return;

      if (res.ok && data?.success && Array.isArray(data.data)) {
        const rows: ContactSubmission[] = data.data;
        setContacts(rows);
        const pag = data.pagination;
        const resolvedTotal = Number(pag?.total ?? rows.length);
        const resolvedTotalPages = Math.max(1, Number(pag?.totalPages ?? 1));
        const resolvedPage = Math.max(1, Math.min(resolvedTotalPages, Number(pag?.page ?? page)));
        const resolvedPending =
          pag?.pendingCount !== undefined
            ? Number(pag.pendingCount)
            : rows.filter((c) => c.status === "PENDING").length;

        setTotal(resolvedTotal);
        setTotalPages(resolvedTotalPages);
        setPendingCount(resolvedPending);
        if (resolvedPage !== page) {
          setPage(resolvedPage);
        }
      } else {
        const msg = data?.error || "Không thể tải danh sách liên hệ.";
        setLoadError(msg);
        setFeedback({ type: "error", message: msg });
      }
    } catch (err) {
      if (controller.signal.aborted || reqId !== requestSeqRef.current) return;
      console.error("Failed to load contact submissions:", err);
      const msg = "Lỗi kết nối đến máy chủ khi tải liên hệ.";
      setLoadError(msg);
      setFeedback({ type: "error", message: msg });
    } finally {
      if (reqId === requestSeqRef.current && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [searchTerm, statusFilter, page, updateUrlParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchContacts();
    }, 150);
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [fetchContacts, refreshVersion]);

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

      const result = await res.json().catch(() => null);

      if (res.status === 409) {
        setFeedback({
          type: "error",
          message:
            result?.error ||
            "Xung đột phiên làm việc: Yêu cầu đã được cập nhật bởi phiên khác. Bản nháp ghi chú vẫn được giữ. Hãy bấm Tải lại.",
        });
        return;
      }

      if (res.ok && result?.success && result.data) {
        setEditingNoteId(null);
        setNoteDraft("");
        setFeedback({
          type: "success",
          message: `Đã cập nhật sang "${result.data.status || newStatus}".`,
        });
        setRefreshVersion((v) => v + 1);
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

  const rangeStart = total === 0 || contacts.length === 0 ? 0 : (page - 1) * PAGE_LIMIT + 1;
  const rangeEnd =
    total === 0 || contacts.length === 0
      ? 0
      : Math.min(total, (page - 1) * PAGE_LIMIT + contacts.length);

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-3">
      {/* 1. Page Header */}
      <PageHeader
        title="Tư vấn & Liên hệ"
        badge={
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 tabular-nums">
              {total}
            </span>
            {pendingCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 tabular-nums">
                {pendingCount} mới
              </span>
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <AdminButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void fetchContacts()}
              disabled={loading}
              aria-label="Tải lại danh sách"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />}
            />
            <AdminButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleExport}
              disabled={loading || total === 0}
              title="Xuất toàn bộ liên hệ khớp bộ lọc hiện tại ra CSV"
              icon={<Download className="w-3.5 h-3.5" aria-hidden="true" />}
            >
              Xuất CSV (toàn bộ lọc)
            </AdminButton>
          </div>
        }
      />

      {feedback && (
        <InlineAlert variant={feedback.type} onClose={() => setFeedback(null)}>
          {feedback.message}
        </InlineAlert>
      )}

      {/* 2. Single-Card Workspace */}
      <AdminCard bodyClassName="p-0 overflow-hidden">
        {/* Top Bar: Status Tabs + Inline Search */}
        <div className="px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-1" role="tablist" aria-label="Lọc theo trạng thái">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setStatusFilter(tab.key);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.key === "PENDING" && pendingCount > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] tabular-nums ${
                        active ? "bg-amber-400 text-slate-950 font-bold" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                aria-label="Tìm kiếm liên hệ"
                placeholder="Tìm tên, SĐT, email, lời nhắn…"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-8 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg bg-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setPage(1);
                  }}
                  aria-label="Xóa tìm kiếm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {(searchTerm || statusFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("ALL");
                  setPage(1);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-200/60 transition cursor-pointer whitespace-nowrap"
              >
                ✕ Xóa lọc
              </button>
            )}
          </div>
        </div>

        {/* List Content */}
        <div className="admin-contact-list divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1.5 text-blue-600" />
              <span>Đang tải yêu cầu tư vấn...</span>
            </div>
          ) : loadError ? (
            <div className="py-10 text-center px-4">
              <div className="max-w-md mx-auto space-y-2.5">
                <p className="text-xs font-semibold text-red-700">{loadError}</p>
                <button
                  type="button"
                  onClick={() => void fetchContacts()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Thử lại</span>
                </button>
              </div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Không có yêu cầu liên hệ nào phù hợp.
            </div>
          ) : (
            contacts.map((contact) => (
              <div
                key={contact.id}
                className={`p-3.5 transition-colors ${
                  contact.status === "PENDING"
                    ? "bg-amber-50/25"
                    : contact.status === "PROCESSING"
                    ? "bg-indigo-50/15"
                    : "bg-white hover:bg-slate-50/50"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  {/* Left: Contact content */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                      <span className="admin-contact-name font-bold text-slate-900">{contact.name}</span>
                      <a
                        href={`tel:${contact.phone}`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline font-mono font-bold"
                      >
                        <Phone className="w-3 h-3" />
                        {contact.phone}
                      </a>
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600 hover:underline"
                        >
                          <Mail className="w-3 h-3 text-slate-400" />
                          {contact.email}
                        </a>
                      )}
                      <StatusBadge status={contact.status} />
                      <span className="text-[11px] text-slate-400 font-mono">v{contact.revision}</span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 tabular-nums">
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

                    {contact.message ? (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {contact.message}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic">
                        Cần gọi tư vấn trực tiếp (không kèm lời nhắn).
                      </div>
                    )}

                    {/* Internal Note Display */}
                    {contact.internalNote && editingNoteId !== contact.id && (
                      <div className="p-2 bg-blue-50/50 border border-blue-200/60 rounded-lg text-xs flex items-start gap-2 text-blue-900">
                        <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span className="font-semibold">Ghi chú: </span>
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
                      <div className="p-2.5 bg-white border border-blue-300 rounded-lg shadow-xs space-y-2">
                        <textarea
                          rows={2}
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          placeholder="Ghi chú nội bộ..."
                          className="w-full text-xs p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-hidden"
                        />
                        <div className="flex justify-end gap-1.5 text-xs">
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

                    {/* Meta row: timestamps + history toggle */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                      {contact.startedProcessingAt && (
                        <span className="inline-flex items-center gap-1 text-indigo-700">
                          <Clock className="w-3 h-3" />
                          Nhận xử lý: {new Date(contact.startedProcessingAt).toLocaleString("vi-VN")}
                        </span>
                      )}
                      {contact.handledAt && (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <UserCheck className="w-3 h-3" />
                          Xong bởi <strong>{contact.handledBy || "Admin"}</strong> ({new Date(contact.handledAt).toLocaleString("vi-VN")})
                        </span>
                      )}
                      {contact.events && contact.events.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedHistoryId(expandedHistoryId === contact.id ? null : contact.id)
                          }
                          className="text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer font-medium"
                        >
                          <History className="w-3 h-3" />
                          <span>
                            {expandedHistoryId === contact.id
                              ? "Ẩn lịch sử"
                              : `Lịch sử (${contact.events.length})`}
                          </span>
                        </button>
                      )}
                    </div>

                    {expandedHistoryId === contact.id && contact.events && (
                      <div className="mt-1.5 p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                        {contact.events.map((evt) => (
                          <div
                            key={evt.id}
                            className="text-[11px] text-slate-600 border-l-2 border-blue-400 pl-2 py-0.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-800">
                                {evt.action === "STATUS_CHANGE"
                                  ? `${evt.fromStatus || "—"} → ${evt.toStatus}`
                                  : "Ghi chú"}
                              </span>
                              <span className="text-slate-400 font-mono text-[10px]">
                                {new Date(evt.createdAt).toLocaleString("vi-VN")}
                              </span>
                            </div>
                            <div className="text-slate-500">
                              <strong>{evt.actor}</strong>
                              {evt.note && <span className="ml-1 text-slate-700 italic">“{evt.note}”</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {!contact.internalNote && editingNoteId !== contact.id && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteId(contact.id);
                          setNoteDraft("");
                        }}
                        className="px-2.5 py-1 text-xs text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer transition"
                      >
                        + Ghi chú
                      </button>
                    )}

                    {contact.status === "PENDING" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(contact, "PROCESSING")}
                        disabled={updatingId === contact.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer"
                      >
                        Đang xử lý
                      </button>
                    )}

                    {contact.status !== "HANDLED" ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(contact, "HANDLED")}
                        disabled={updatingId === contact.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Hoàn tất</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(contact, "PENDING")}
                        disabled={updatingId === contact.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition cursor-pointer"
                      >
                        Mở lại
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with Server Pagination */}
        <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50/60 text-xs text-slate-600 flex flex-wrap justify-between items-center gap-3">
          <div className="tabular-nums">
            Hiển thị{" "}
            <span className="font-bold text-slate-900">
              {rangeStart === 0 ? 0 : `${rangeStart}–${rangeEnd}`}
            </span>{" "}
            / <span className="font-bold text-slate-900">{total}</span> liên hệ
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium tabular-nums">
              Trang {page} / {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Trang trước"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-slate-700 font-semibold cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Trước</span>
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Trang sau"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-slate-700 font-semibold cursor-pointer"
              >
                <span>Sau</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
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
