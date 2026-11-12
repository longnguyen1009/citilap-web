'use client';

import { AlertTriangle } from 'lucide-react';
import { AdminButton, AdminCard, AdminLoadingState, useToast } from '@/components/admin/ui';
import type { ProductDocument } from '@/contracts/cms/product-studio';
import { mediaRequest } from '../media/MediaBrowser';
import MediaDialog from '../media/MediaDialog';

export interface RevisionItem {
  revision: number;
  action: string;
  actor?: string;
  createdAt: string;
  actorName: string;
  summary: string;
  isCurrent: boolean;
  isPublished: boolean;
  isLegacy: boolean;
}

export interface SnapshotDetail {
  productId: string;
  revision: number;
  action: string;
  actor?: string;
  createdAt: string;
  document: ProductDocument;
}

const money = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

function RevisionsTable({
  id,
  revisions,
  saving,
  restoring,
  onSelectSnapshot,
  onConfirmRestore,
}: {
  id: string;
  revisions: RevisionItem[];
  saving: boolean;
  restoring: boolean;
  onSelectSnapshot: (snap: SnapshotDetail) => void;
  onConfirmRestore: (rev: RevisionItem) => void;
}) {
  const toast = useToast();

  return (
    <table className="w-full text-left text-xs border-collapse">
      <thead>
        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
          <th className="py-2.5 px-3">Bản</th>
          <th className="py-2.5 px-3">Hành động</th>
          <th className="py-2.5 px-3">Thời gian</th>
          <th className="py-2.5 px-3">Người thực hiện</th>
          <th className="py-2.5 px-3">Ghi chú</th>
          <th className="py-2.5 px-3 text-right">Thao tác</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {revisions.map(r => (
          <tr
            key={r.revision}
            className={`hover:bg-slate-50 transition ${
              r.isCurrent ? 'bg-blue-50/30 font-medium' : ''
            }`}
          >
            <td className="py-2.5 px-3 font-mono font-bold">
              <span className="inline-flex items-center gap-1.5">
                <span>#{r.revision}</span>
                {r.isCurrent && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-600 text-white rounded font-normal">
                    Hiện tại
                  </span>
                )}
                {r.isPublished && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-emerald-600 text-white rounded font-normal">
                    Web
                  </span>
                )}
              </span>
            </td>
            <td className="py-2.5 px-3">
              <span
                className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                  r.action === 'publish'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : r.action === 'unpublish'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {r.action === 'publish'
                  ? 'Xuất bản'
                  : r.action === 'unpublish'
                  ? 'Ẩn khỏi web'
                  : r.action === 'restore'
                  ? 'Khôi phục'
                  : 'Lưu nháp'}
              </span>
            </td>
            <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
              {new Date(r.createdAt).toLocaleString('vi-VN')}
            </td>
            <td className="py-2.5 px-3 text-slate-700">
              <span className="font-medium text-slate-700">{r.actorName || r.actor || 'Quản trị viên'}</span>
            </td>
            <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
              {r.summary}
            </td>
            <td className="py-2.5 px-3 text-right whitespace-nowrap">
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const snap = await mediaRequest<SnapshotDetail>(
                        `/api/admin/products/${id}/revisions/${r.revision}`
                      );
                      onSelectSnapshot(snap);
                    } catch (e) {
                      toast.error((e as Error).message || 'Không thể tải chi tiết phiên bản.');
                    }
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                >
                  Chi tiết
                </button>
                <button
                  type="button"
                  onClick={() => onConfirmRestore(r)}
                  disabled={saving || restoring}
                  className="text-xs text-amber-700 hover:text-amber-900 font-medium px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 cursor-pointer disabled:opacity-50"
                >
                  Khôi phục
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ProductRevisionHistoryTab({
  id,
  loadingRevisions,
  revisions,
  saving,
  restoring,
  onSelectSnapshot,
  onConfirmRestore,
}: {
  id: string;
  loadingRevisions: boolean;
  revisions: RevisionItem[];
  saving: boolean;
  restoring: boolean;
  onSelectSnapshot: (snap: SnapshotDetail) => void;
  onConfirmRestore: (rev: RevisionItem) => void;
}) {
  return (
    <AdminCard title="Lịch sử phiên bản">
      {loadingRevisions ? (
        <div className="py-12">
          <AdminLoadingState message="Đang tải..." />
        </div>
      ) : revisions.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-xs">
          Chưa có lịch sử.
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:-mx-5">
          <RevisionsTable
            id={id}
            revisions={revisions}
            saving={saving}
            restoring={restoring}
            onSelectSnapshot={onSelectSnapshot}
            onConfirmRestore={onConfirmRestore}
          />
        </div>
      )}
    </AdminCard>
  );
}

export function ProductRevisionModals({
  id,
  revision,
  historyOpen,
  setHistoryOpen,
  loadingRevisions,
  revisions,
  selectedRevisionSnapshot,
  setSelectedRevisionSnapshot,
  restoreConfirmRev,
  setRestoreConfirmRev,
  saving,
  restoring,
  onRestore,
}: {
  id?: string | null;
  revision: number;
  historyOpen: boolean;
  setHistoryOpen: (open: boolean) => void;
  loadingRevisions: boolean;
  revisions: RevisionItem[];
  selectedRevisionSnapshot: SnapshotDetail | null;
  setSelectedRevisionSnapshot: (snap: SnapshotDetail | null) => void;
  restoreConfirmRev: RevisionItem | null;
  setRestoreConfirmRev: (rev: RevisionItem | null) => void;
  saving: boolean;
  restoring: boolean;
  onRestore: (targetRev: number) => Promise<void>;
}) {
  return (
    <>
      {/* INSPECT REVISION MODAL */}
      {selectedRevisionSnapshot && (
        <MediaDialog
          title={`Chi tiết phiên bản #${selectedRevisionSnapshot.revision}`}
          onClose={() => setSelectedRevisionSnapshot(null)}
        >
          <div className="p-4 space-y-4 max-w-2xl mx-auto">
            <div className="grid grid-cols-2 gap-3 text-xs p-3 bg-slate-50 rounded-lg">
              <div>
                <span className="text-slate-500 block">Tên sản phẩm:</span>
                <span className="font-bold text-slate-800">{selectedRevisionSnapshot.document?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Giá niêm yết:</span>
                <span className="font-bold text-blue-600">
                  {money(selectedRevisionSnapshot.document?.price || 0)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Tình trạng máy:</span>
                <span className="text-slate-800">{selectedRevisionSnapshot.document?.condition || 'NEW'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Số biến thể cấu hình:</span>
                <span className="text-slate-800">
                  {selectedRevisionSnapshot.document?.variants?.length || 0} biến thể
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-700 block mb-1">Mô tả ngắn:</span>
              <p className="text-xs text-slate-600 p-2 bg-white border rounded">
                {selectedRevisionSnapshot.document?.description || '(Trống)'}
              </p>
            </div>

            <div className="flex justify-between items-center pt-3 border-t">
              <AdminButton variant="secondary" onClick={() => setSelectedRevisionSnapshot(null)}>
                Đóng
              </AdminButton>
              <AdminButton
                variant="primary"
                onClick={() => {
                  setRestoreConfirmRev({
                    revision: selectedRevisionSnapshot.revision,
                    action: selectedRevisionSnapshot.action,
                    createdAt: selectedRevisionSnapshot.createdAt,
                    actorName: selectedRevisionSnapshot.actor || 'admin',
                    summary: '',
                    isCurrent: false,
                    isPublished: false,
                    isLegacy: false,
                  });
                  setSelectedRevisionSnapshot(null);
                }}
              >
                Khôi phục bản này
              </AdminButton>
            </div>
          </div>
        </MediaDialog>
      )}

      {/* RESTORE CONFIRMATION MODAL */}
      {restoreConfirmRev && (
        <MediaDialog
          title={`Xác nhận khôi phục phiên bản #${restoreConfirmRev.revision}`}
          onClose={() => setRestoreConfirmRev(null)}
        >
          <div className="p-4 space-y-4 max-w-md mx-auto">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Lưu ý quan trọng</span>
              </div>
              <p>
                Khôi phục sẽ lấy toàn bộ dữ liệu của phiên bản <strong>#{restoreConfirmRev.revision}</strong> và tạo một <strong>bản nháp mới</strong> trong Product Studio.
              </p>
              <p className="font-semibold text-slate-800">
                Website công khai sẽ KHÔNG thay đổi cho đến khi bạn chủ động bấm nút &quot;Xuất bản website&quot;.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <AdminButton
                variant="secondary"
                onClick={() => setRestoreConfirmRev(null)}
                disabled={restoring}
              >
                Hủy bỏ
              </AdminButton>
              <AdminButton
                variant="primary"
                onClick={() => void onRestore(restoreConfirmRev.revision)}
                loading={restoring}
              >
                Đồng ý khôi phục thành nháp
              </AdminButton>
            </div>
          </div>
        </MediaDialog>
      )}

      {/* REVISION HISTORY MODAL */}
      {historyOpen && id && (
        <MediaDialog
          title={`Lịch sử phiên bản sản phẩm (#${revision})`}
          onClose={() => setHistoryOpen(false)}
        >
          <div className="p-2 space-y-3">
            {loadingRevisions ? (
              <div className="py-12">
                <AdminLoadingState message="Đang tải lịch sử phiên bản..." />
              </div>
            ) : revisions.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                Chưa có lịch sử phiên bản cho sản phẩm này.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <RevisionsTable
                  id={id}
                  revisions={revisions}
                  saving={saving}
                  restoring={restoring}
                  onSelectSnapshot={snap => {
                    setHistoryOpen(false);
                    setSelectedRevisionSnapshot(snap);
                  }}
                  onConfirmRestore={r => {
                    setHistoryOpen(false);
                    setRestoreConfirmRev(r);
                  }}
                />
              </div>
            )}
          </div>
        </MediaDialog>
      )}
    </>
  );
}
