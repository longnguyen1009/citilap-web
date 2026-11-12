'use client';
import { useEffect, useState } from 'react';
import { RotateCcw, Download, Server, Trash2, AlertTriangle } from 'lucide-react';
import { mediaRequest } from './media/MediaBrowser';
import { confirmAdminAction } from './ui/ConfirmDialog';
import {
  discardObservedLocalDraft,
  inspectLocalDraftBackup,
  markLocalDraftResolved,
  resolveEntityKey,
  subscribeDraftBackupChanges,
  useAdminActorId,
  type DraftBackupInspection,
  type LocalDraftBackup,
} from './useDraftAutosave';

export interface DraftRestoreMeta<T = unknown> {
  baseRevision: number;
  savedAt: string;
  isStale: boolean;
  backup: LocalDraftBackup<T>;
}

export type DraftValidator = (
  candidate: unknown
) => { ok: true; data: unknown } | { ok: false; error: string };

function downloadRawText(raw: string, filename: string) {
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function DraftRecovery({
  draft,
  endpoint,
  storageKey,
  currentRevision,
  serverRevision,
  dirty = false,
  validateDraft,
  onRestoreLocal,
}: {
  draft: unknown;
  endpoint?: string;
  storageKey?: string;
  currentRevision?: number;
  serverRevision?: number;
  dirty?: boolean;
  validateDraft?: DraftValidator;
  onRestoreLocal?: (restoredDraft: unknown, meta: DraftRestoreMeta) => void;
}) {
  const actorId = useAdminActorId();
  const [server, setServer] = useState('');
  const [inspection, setInspection] = useState<DraftBackupInspection>(() =>
    inspectLocalDraftBackup(storageKey, actorId)
  );
  const [externalNewerInspection, setExternalNewerInspection] =
    useState<DraftBackupInspection | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [schemaInvalidRaw, setSchemaInvalidRaw] = useState<string | null>(null);
  const [crossTabNotice, setCrossTabNotice] = useState<string | null>(null);
  const [storageWriteError, setStorageWriteError] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const next = inspectLocalDraftBackup(storageKey, actorId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync external localStorage draft state on key/actor change
    setInspection(next);
    setExternalNewerInspection(null);
    setRestoreError(null);
    setSchemaInvalidRaw(null);
    setCrossTabNotice(null);
  }, [storageKey, actorId]);

  useEffect(() => {
    return subscribeDraftBackupChanges(({ storageWriteError: writeErr, isCrossTab }) => {
      if (writeErr) {
        setStorageWriteError(
          'Không thể ghi bản sao lưu tạm vào bộ nhớ trình duyệt (localStorage bị đầy hoặc bị chặn). Bạn vẫn có thể bấm Lưu nháp lên máy chủ.'
        );
        return;
      }
      const latest = inspectLocalDraftBackup(storageKey, actorId);
      setInspection((prev) => {
        if (
          isCrossTab &&
          prev.status === 'ok' &&
          prev.raw !== null &&
          latest.status === 'ok' &&
          latest.raw !== null &&
          latest.raw !== prev.raw
        ) {
          // Keep the previously observed backup reference so a pending discard on this tab
          // compares against what this tab originally observed instead of blindly deleting the other tab's write.
          setExternalNewerInspection(latest);
          setCrossTabNotice(
            `Tab khác vừa cập nhật bản sao lưu mới hơn lúc ${latest.backup?.savedAt ?? ''} (r${latest.backup?.baseRevision ?? 0}).`
          );
          return prev;
        }
        setExternalNewerInspection(null);
        return latest;
      });
    });
  }, [storageKey, actorId]);

  const effectiveServerRevision = serverRevision ?? currentRevision;
  const localBackup = inspection.status === 'ok' ? inspection.backup : null;
  const isBackupStale =
    Boolean(localBackup) &&
    typeof effectiveServerRevision === 'number' &&
    localBackup!.baseRevision !== effectiveServerRevision;
  const isCurrentSessionStale =
    typeof serverRevision === 'number' &&
    typeof currentRevision === 'number' &&
    currentRevision !== serverRevision;

  const hasAttentionItem =
    inspection.status !== 'none' ||
    Boolean(restoreError) ||
    Boolean(crossTabNotice) ||
    Boolean(storageWriteError) ||
    isCurrentSessionStale;

  const isOpen = manualOpen !== null ? manualOpen : hasAttentionItem;

  const handleRestore = async () => {
    if (!onRestoreLocal) return;
    setRestoreError(null);

    const targetInspection = externalNewerInspection ?? inspectLocalDraftBackup(storageKey, actorId);
    const expectedEntityKey = resolveEntityKey(storageKey);

    if (targetInspection.status !== 'ok' || !targetInspection.backup) {
      setInspection(targetInspection);
      setRestoreError(
        targetInspection.error ||
          'Không thể khôi phục bản sao lưu này do dữ liệu không hợp lệ hoặc không thuộc phiên hiện tại.'
      );
      return;
    }

    const candidateBackup = targetInspection.backup;
    if (!actorId || candidateBackup.actorId !== actorId) {
      setRestoreError('Bản sao lưu thuộc về tài khoản khác, từ chối khôi phục.');
      return;
    }
    if (candidateBackup.entityKey !== expectedEntityKey) {
      setRestoreError(
        `Bản sao lưu thuộc mục khác (${candidateBackup.entityKey}), không khớp với mục hiện tại (${expectedEntityKey}).`
      );
      return;
    }

    let validatedDraft: unknown = candidateBackup.draft;
    if (validateDraft) {
      const validation = validateDraft(candidateBackup.draft);
      if (!validation.ok) {
        setSchemaInvalidRaw(targetInspection.raw);
        setRestoreError(
          `Bản sao lưu không khớp cấu trúc dữ liệu (${validation.error}). Đã chặn khôi phục để tránh lỗi; bạn có thể tải JSON thô.`
        );
        return;
      }
      validatedDraft = validation.data;
    } else if (!validatedDraft || typeof validatedDraft !== 'object') {
      setSchemaInvalidRaw(targetInspection.raw);
      setRestoreError('Dữ liệu bản sao lưu không đúng định dạng đối tượng. Bạn có thể tải JSON thô.');
      return;
    }

    const staleAgainstServer =
      typeof effectiveServerRevision === 'number' &&
      candidateBackup.baseRevision !== effectiveServerRevision;

    if (dirty) {
      const confirmed = await confirmAdminAction({
        title: 'Ghi đè thay đổi đang sửa bằng bản sao lưu tạm?',
        message: staleAgainstServer
          ? `Bạn đang có thay đổi chưa lưu. Bản tạm này dựa trên phiên bản cũ (r${candidateBackup.baseRevision}) so với máy chủ (r${effectiveServerRevision}). Khôi phục sẽ thay thế nội dung đang sửa và giữ phiên bản gốc r${candidateBackup.baseRevision}. Tiếp tục?`
          : `Bạn đang có thay đổi chưa lưu trên màn hình. Khôi phục bản sao lưu lúc ${candidateBackup.savedAt} (r${candidateBackup.baseRevision}) và bỏ các thay đổi vừa gõ?`,
        confirmLabel: 'Khôi phục bản tạm',
        cancelLabel: 'Giữ nội dung đang sửa',
        variant: 'warning',
      });
      if (!confirmed) {
        return;
      }
    }

    markLocalDraftResolved(storageKey, targetInspection.raw, actorId);
    setInspection(targetInspection);
    setExternalNewerInspection(null);
    setSchemaInvalidRaw(null);
    setCrossTabNotice(null);

    onRestoreLocal(validatedDraft, {
      baseRevision: candidateBackup.baseRevision,
      savedAt: candidateBackup.savedAt,
      isStale: staleAgainstServer,
      backup: candidateBackup,
    });
  };

  const handleDiscard = () => {
    const res = discardObservedLocalDraft(storageKey, inspection.raw, actorId);
    if (res.replacedByNewer) {
      setCrossTabNotice(
        'Tab khác vừa ghi bản sao lưu mới hơn; hệ thống giữ lại bản mới hơn từ tab đó thay vì xóa.'
      );
      setInspection(res.currentInspection);
      setExternalNewerInspection(null);
      return;
    }
    setInspection(res.currentInspection);
    setExternalNewerInspection(null);
    setRestoreError(null);
    setSchemaInvalidRaw(null);
    setCrossTabNotice(null);
  };

  const rawForExport =
    schemaInvalidRaw ??
    (inspection.status === 'corrupt' ||
    inspection.status === 'incompatible' ||
    inspection.status === 'legacy_unscoped' ||
    inspection.status === 'wrong_entity'
      ? inspection.raw
      : null);

  return (
    <details
      open={isOpen}
      onToggle={(e) => setManualOpen((e.currentTarget as HTMLDetailsElement).open)}
      className="border border-slate-200 bg-white rounded-lg p-3 text-xs text-slate-700 shadow-2xs my-2"
    >
      <summary className="font-semibold text-slate-800 cursor-pointer select-none">
        Khôi phục bản nháp tạm & đối chiếu máy chủ
      </summary>
      <p className="mt-1.5 text-slate-500 leading-relaxed">
        Bản sửa hiện tại được tự động sao lưu tạm trên trình duyệt và giữ nguyên khi đối chiếu dữ liệu máy chủ. Nếu phiên hết hạn, hãy đăng nhập lại ở tab mới rồi bấm Lưu nháp (Ctrl+S).
      </p>

      {(inspection.status === 'storage_error' || storageWriteError) && (
        <div
          role="alert"
          className="mt-2.5 p-2.5 rounded-md bg-red-50 border border-red-200 text-red-900 flex items-start gap-2"
        >
          <AlertTriangle className="size-4 shrink-0 text-red-600 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-semibold">Lỗi bộ nhớ trình duyệt (localStorage)</p>
            <p className="mt-0.5">
              {storageWriteError ||
                inspection.error ||
                'Không thể đọc/ghi bản sao lưu tạm trên trình duyệt. Bạn vẫn có thể bấm Lưu nháp lên máy chủ bình thường.'}
            </p>
          </div>
        </div>
      )}

      {inspection.status !== 'none' &&
        inspection.status !== 'ok' &&
        inspection.status !== 'storage_error' && (
          <div
            role="alert"
            className="mt-2.5 p-2.5 rounded-md bg-red-50 border border-red-200 text-red-900 flex flex-wrap items-center justify-between gap-2"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-4 shrink-0 text-red-600 mt-0.5" aria-hidden="true" />
              <span>{inspection.error}</span>
            </div>
            <div className="flex items-center gap-2">
              {rawForExport && (
                <button
                  type="button"
                  onClick={() =>
                    downloadRawText(
                      rawForExport,
                      `cms-raw-backup-${resolveEntityKey(storageKey).replace(/[^a-zA-Z0-9_-]/g, '_')}.json`
                    )
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-red-300 bg-white text-red-800 font-semibold hover:bg-red-100"
                >
                  <Download className="size-3" aria-hidden="true" />
                  <span>Tải JSON thô</span>
                </button>
              )}
              {inspection.status !== 'wrong_actor' && inspection.status !== 'legacy_unscoped' && (
                <button
                  type="button"
                  onClick={handleDiscard}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded border border-red-300 bg-white text-red-800 hover:bg-red-100"
                >
                  <Trash2 className="size-3" aria-hidden="true" />
                  <span>Xóa bản tạm lỗi</span>
                </button>
              )}
            </div>
          </div>
        )}

      {restoreError && (
        <div
          role="alert"
          className="mt-2.5 p-2.5 rounded-md bg-red-50 border border-red-200 text-red-900 flex flex-wrap items-center justify-between gap-2"
        >
          <span>{restoreError}</span>
          {rawForExport && (
            <button
              type="button"
              onClick={() =>
                downloadRawText(
                  rawForExport,
                  `cms-invalid-backup-${resolveEntityKey(storageKey).replace(/[^a-zA-Z0-9_-]/g, '_')}.json`
                )
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-red-300 bg-white text-red-800 font-semibold hover:bg-red-100"
            >
              <Download className="size-3" aria-hidden="true" />
              <span>Tải JSON thô</span>
            </button>
          )}
        </div>
      )}

      {crossTabNotice && (
        <div
          role="status"
          className="mt-2.5 p-2.5 rounded-md bg-blue-50 border border-blue-200 text-blue-900 flex flex-wrap items-center justify-between gap-2"
        >
          <span>{crossTabNotice}</span>
          {externalNewerInspection?.status === 'ok' && (
            <button
              type="button"
              onClick={() => {
                setInspection(externalNewerInspection);
                setExternalNewerInspection(null);
                setCrossTabNotice(null);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-blue-300 bg-white text-blue-800 font-semibold hover:bg-blue-100"
            >
              <span>Xem bản mới từ tab khác</span>
            </button>
          )}
        </div>
      )}

      {isCurrentSessionStale && (
        <div
          role="alert"
          className="mt-2.5 p-2.5 rounded-md bg-amber-50 border border-amber-300 text-amber-950"
        >
          <strong>Cảnh báo xung đột phiên bản (Stale Base Revision):</strong> Bản nháp đang mở dựa trên phiên bản cũ{' '}
          <strong>r{currentRevision}</strong> trong khi máy chủ đang ở <strong>r{serverRevision}</strong>. Hệ thống giữ nguyên{' '}
          <code>expectedRevision = r{currentRevision}</code> và không tự động ghi đè máy chủ. Hãy tải JSON hoặc đối chiếu bản máy chủ trước khi lưu.
        </div>
      )}

      {localBackup && (
        <div className="mt-2.5 p-2.5 rounded-md bg-amber-50 border border-amber-200 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-amber-900 font-medium">
              Có bản sao lưu trên trình duyệt lúc <strong>{localBackup.savedAt}</strong> (r
              {localBackup.baseRevision})
            </span>
            <div className="flex items-center gap-2">
              {onRestoreLocal && (
                <button
                  type="button"
                  onClick={() => {
                    void handleRestore();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-600 text-white font-semibold hover:bg-amber-700"
                >
                  <RotateCcw className="size-3" aria-hidden="true" />
                  <span>Khôi phục bản tạm này</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleDiscard}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
              >
                <Trash2 className="size-3" aria-hidden="true" />
                <span>Xóa bản tạm</span>
              </button>
            </div>
          </div>

          {isBackupStale && (
            <p role="alert" className="text-amber-950 bg-amber-100/80 border border-amber-300 rounded p-2">
              <strong>Cảnh báo phiên bản cũ:</strong> Bản sao lưu tạm này được tạo trên nền phiên bản{' '}
              <strong>r{localBackup.baseRevision}</strong>, nhưng dữ liệu máy chủ hiện tại đã ở{' '}
              <strong>r{effectiveServerRevision}</strong>. Nếu khôi phục, hệ thống sẽ giữ nguyên{' '}
              <code>expectedRevision = r{localBackup.baseRevision}</code> để bảo vệ tính toàn vẹn (không tự động ghi đè bản mới trên máy chủ).
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2.5 my-2.5">
        <button
          type="button"
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' })
            );
            const a = document.createElement('a');
            a.href = url;
            a.download = 'cms-draft.json';
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 font-medium"
        >
          <Download className="size-3.5" aria-hidden="true" />
          <span>Tải bản sửa JSON</span>
        </button>

        {endpoint && (
          <button
            type="button"
            onClick={async () => {
              try {
                setServer(JSON.stringify(await mediaRequest(endpoint), null, 2));
              } catch (e) {
                setServer((e as Error).message);
              }
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 font-medium"
          >
            <Server className="size-3.5" aria-hidden="true" />
            <span>Xem bản máy chủ</span>
          </button>
        )}

        <a
          href="/login"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline font-medium px-2 py-1"
        >
          Đăng nhập lại (tab mới)
        </a>
      </div>

      {server && (
        <pre className="mt-2 p-2.5 rounded bg-slate-900 text-slate-100 max-h-64 overflow-auto whitespace-pre-wrap break-all text-[11px]">
          {server}
        </pre>
      )}
    </details>
  );
}
