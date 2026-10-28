"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import type { ProductDocument } from "@/contracts/cms/product-studio";
import { AdminButton, InlineAlert } from "@/components/admin/ui";

export interface QuickEditItem {
  id: string;
  name: string;
  hasUnpublishedDraft: boolean;
}

type Detail = { revision: number; document: ProductDocument; published: boolean };

export default function ProductQuickEditDrawer({
  item,
  onClose,
  onSaved,
}: {
  item: QuickEditItem;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const saveLock = useRef(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      opener?.focus();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/products/${item.id}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok || !json.success || !json.data?.document || !Number.isSafeInteger(json.data.revision)) {
          throw new Error(json.error || "Không thể đọc bản nháp sản phẩm.");
        }
        setDetail(json.data);
        setError("");
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      });
    return () => controller.abort();
  }, [item.id, retry]);

  const patch = <K extends keyof ProductDocument>(key: K, value: ProductDocument[K]) => {
    setDetail((current) => current && { ...current, document: { ...current.document, [key]: value } });
  };

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || saveLock.current) return;
    const action = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "publish" ? "publish" : "save";
    if (
      action === "publish" &&
      item.hasUnpublishedDraft &&
      !window.confirm("Sản phẩm có bản nháp chưa xuất bản. Xuất bản sẽ áp dụng toàn bộ bản nháp lên website. Tiếp tục?")
    )
      return;
    saveLock.current = true;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/products/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: detail.revision, action, document: detail.document }),
      });
      const json = await response.json();
      if (!response.ok || json.success !== true) throw new Error(json.error || "Không thể lưu. Thử lại.");
      onSaved(action === "publish" ? "Đã cập nhật lên website." : "Đã lưu nháp.");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu. Thử lại.");
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="admin-drawer"
      aria-labelledby="quick-edit-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!saveLock.current) onClose();
      }}
      onClick={(event) => {
        if (
          event.target === event.currentTarget &&
          event.clientX < event.currentTarget.getBoundingClientRect().left &&
          !saveLock.current
        )
          onClose();
      }}
    >
      <form className="flex h-full flex-col" onSubmit={save}>
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
          <div className="min-w-0">
            <h2 id="quick-edit-title" className="text-sm font-bold text-slate-900">
              Sửa nhanh
            </h2>
            <p className="mt-0.5 truncate text-xs text-slate-500">{item.name}</p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {error && <InlineAlert variant="error">{error}</InlineAlert>}
          {!detail ? (
            <div role="status" className="space-y-3 text-xs text-slate-500">
              {error ? (
                <AdminButton type="button" variant="secondary" size="sm" onClick={() => setRetry((value) => value + 1)}>
                  Thử lại
                </AdminButton>
              ) : (
                "Đang tải…"
              )}
            </div>
          ) : (
            <fieldset disabled={saving} className="space-y-4">
              <label className="admin-field">
                Tên sản phẩm
                <input
                  autoComplete="off"
                  required
                  maxLength={200}
                  value={detail.document.name}
                  onChange={(event) => patch("name", event.target.value)}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="admin-field">
                  Giá bán (đ)
                  <input
                    type="number"
                    required
                    min={0}
                    max={2000000000}
                    step={1}
                    value={detail.document.price}
                    onChange={(event) => patch("price", Number(event.target.value))}
                  />
                </label>
                <label className="admin-field">
                  Giá gốc (đ)
                  <input
                    type="number"
                    min={0}
                    max={2000000000}
                    step={1}
                    value={detail.document.originalPrice ?? ""}
                    onChange={(event) =>
                      patch("originalPrice", event.target.value === "" ? null : Number(event.target.value))
                    }
                  />
                </label>
              </div>
              <label className="admin-field">
                Nhận đơn
                <select
                  value={detail.document.availability}
                  onChange={(event) => patch("availability", event.target.value as ProductDocument["availability"])}
                >
                  <option value="AVAILABLE">Sẵn hàng</option>
                  <option value="PREORDER">Đặt trước</option>
                  <option value="CONTACT">Liên hệ</option>
                  <option value="UNAVAILABLE">Ngừng đơn</option>
                </select>
              </label>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                <span>
                  {detail.document.variants.length > 0
                    ? `${detail.document.variants.length} cấu hình riêng`
                    : "Không có biến thể"}
                </span>
                <Link
                  href={`/admin/products/${item.id}`}
                  onClick={(event) => {
                    if (saveLock.current) event.preventDefault();
                  }}
                  aria-disabled={saving}
                  className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                >
                  <span>Mở chi tiết</span>
                  <ExternalLink className="size-3.5" />
                </Link>
              </div>
            </fieldset>
          )}
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <AdminButton type="button" size="sm" variant="ghost" disabled={saving} onClick={onClose}>
            Hủy
          </AdminButton>
          <AdminButton type="submit" value="save" size="sm" variant="secondary" disabled={!detail || saving}>
            Lưu nháp
          </AdminButton>
          <AdminButton type="submit" value="publish" size="sm" disabled={!detail} loading={saving} loadingText="Đang lưu…">
            Xuất bản
          </AdminButton>
        </footer>
      </form>
    </dialog>
  );
}
