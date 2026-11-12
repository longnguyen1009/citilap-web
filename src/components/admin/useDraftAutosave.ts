'use client';
import React, { createContext, createElement, useContext, useEffect, useRef, useState } from 'react';
import { confirmAdminAction } from './ui/ConfirmDialog';

const STORAGE_PREFIX = 'citilap_draft_backup:';
export const DRAFT_BACKUP_VERSION = 2;
const DRAFT_CHANGE_EVENT = 'citilap-draft-backup-change';

const AdminActorContext = createContext<string | null>(null);

export function AdminActorProvider({
  actorId,
  children,
}: {
  actorId: string | null;
  children: React.ReactNode;
}) {
  return createElement(AdminActorContext.Provider, { value: actorId }, children);
}

export function useAdminActorId(): string | null {
  return useContext(AdminActorContext);
}

export interface LocalDraftBackup<T = unknown> {
  version: number;
  actorId: string;
  entityKey: string;
  baseRevision: number;
  revision: number;
  savedAt: string;
  timestamp: number;
  draft: T;
}

export type DraftBackupInspectionStatus =
  | 'none'
  | 'ok'
  | 'corrupt'
  | 'incompatible'
  | 'wrong_actor'
  | 'wrong_entity'
  | 'legacy_unscoped'
  | 'storage_error';

export interface DraftBackupInspection<T = unknown> {
  status: DraftBackupInspectionStatus;
  storageKey: string;
  entityKey: string;
  raw: string | null;
  legacyRaw: string | null;
  backup: LocalDraftBackup<T> | null;
  error: string | null;
  isTabOwned: boolean;
}

export interface FirstSaveHandoff<TDoc = unknown> {
  actorId: string | null;
  entityKey: string;
  revision: number;
  published: boolean;
  publishedSummary?: unknown;
  hasUnpublishedDraft?: boolean;
  committedDoc: TDoc;
  latestDoc: TDoc;
  isDirty: boolean;
  categories?: unknown[];
  brands?: unknown[];
  createdAt: number;
}

// Per-tab registry of exact raw backup strings written or explicitly adopted by this tab instance.
const tabOwnedRawByKey = new Map<string, string>();
const firstSaveHandoffMap = new Map<string, FirstSaveHandoff>();

export function setFirstSaveHandoff<TDoc = unknown>(
  entityKey: string,
  handoff: Omit<FirstSaveHandoff<TDoc>, 'entityKey' | 'createdAt'>
): void {
  firstSaveHandoffMap.set(entityKey, {
    ...handoff,
    entityKey,
    createdAt: Date.now(),
  });
}

export function consumeFirstSaveHandoff<TDoc = unknown>(
  entityKey: string,
  actorId?: string | null
): FirstSaveHandoff<TDoc> | null {
  const entry = firstSaveHandoffMap.get(entityKey);
  if (!entry) return null;
  firstSaveHandoffMap.delete(entityKey);
  if (Date.now() - entry.createdAt > 30_000) return null;
  if (actorId && entry.actorId && entry.actorId !== actorId) return null;
  return entry as FirstSaveHandoff<TDoc>;
}

export function resolveEntityKey(customKey?: string): string {
  if (customKey && customKey.trim()) return customKey.trim();
  if (typeof window !== 'undefined' && window.location?.pathname) {
    return window.location.pathname;
  }
  return 'default';
}

export function getScopedStorageKey(customKey?: string, actorId?: string | null): string {
  const entityKey = resolveEntityKey(customKey);
  if (actorId && actorId.trim()) {
    return `${STORAGE_PREFIX}${actorId.trim()}:${entityKey}`;
  }
  return `${STORAGE_PREFIX}${entityKey}`;
}

function getLegacyStorageKeys(entityKey: string): string[] {
  const keys = [`${STORAGE_PREFIX}${entityKey}`];
  if (entityKey === 'settings') {
    keys.push('citilap_admin_settings_v2_draft');
  } else if (entityKey === 'navigation') {
    keys.push(`${STORAGE_PREFIX}/admin/navigation`);
  } else if (entityKey === 'categories') {
    keys.push(`${STORAGE_PREFIX}/admin/categories`);
  }
  return keys;
}

function notifyDraftBackupChange(storageKey: string, entityKey: string, storageWriteError = false): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent(DRAFT_CHANGE_EVENT, {
        detail: { storageKey, entityKey, storageWriteError },
      })
    );
  } catch {
    // Ignore custom event dispatch errors
  }
}

export function subscribeDraftBackupChanges(
  callback: (detail: { storageKey?: string; entityKey?: string; storageWriteError?: boolean; isCrossTab: boolean }) => void
): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key.startsWith(STORAGE_PREFIX) || e.key === 'citilap_admin_settings_v2_draft') {
      callback({ storageKey: e.key ?? undefined, isCrossTab: true });
    }
  };
  const onLocal = (e: Event) => {
    const ce = e as CustomEvent<{ storageKey?: string; entityKey?: string; storageWriteError?: boolean }>;
    callback({
      storageKey: ce.detail?.storageKey,
      entityKey: ce.detail?.entityKey,
      storageWriteError: ce.detail?.storageWriteError,
      isCrossTab: false,
    });
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(DRAFT_CHANGE_EVENT, onLocal);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(DRAFT_CHANGE_EVENT, onLocal);
  };
}

function normalizeDraftValue(draft: unknown): unknown {
  if (typeof draft === 'string') {
    try {
      return JSON.parse(draft);
    } catch {
      return draft;
    }
  }
  return draft;
}

function findLegacyUnscopedRaw(entityKey: string, scopedKey: string): { key: string; raw: string } | null {
  if (typeof window === 'undefined') return null;
  for (const k of getLegacyStorageKeys(entityKey)) {
    if (k === scopedKey) continue;
    try {
      const val = window.localStorage.getItem(k);
      if (val !== null) return { key: k, raw: val };
    } catch {
      // Ignore storage access errors here
    }
  }
  return null;
}

function findForeignActorKey(entityKey: string, currentActorId?: string | null): string | null {
  if (typeof window === 'undefined' || !currentActorId) return null;
  try {
    const suffix = `:${entityKey}`;
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (!k || !k.startsWith(STORAGE_PREFIX) || !k.endsWith(suffix)) continue;
      const middle = k.slice(STORAGE_PREFIX.length, k.length - suffix.length);
      if (middle && middle !== currentActorId) {
        return k;
      }
    }
  } catch {
    // Ignore storage enumeration errors
  }
  return null;
}

export function inspectLocalDraftBackup<T = unknown>(
  customKey?: string,
  actorId?: string | null
): DraftBackupInspection<T> {
  const entityKey = resolveEntityKey(customKey);
  const scopedKey = getScopedStorageKey(entityKey, actorId);
  if (typeof window === 'undefined') {
    return {
      status: 'none',
      storageKey: scopedKey,
      entityKey,
      raw: null,
      legacyRaw: null,
      backup: null,
      error: null,
      isTabOwned: false,
    };
  }

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(scopedKey);
  } catch {
    return {
      status: 'storage_error',
      storageKey: scopedKey,
      entityKey,
      raw: null,
      legacyRaw: null,
      backup: null,
      error: 'Không thể truy cập bộ nhớ trình duyệt (localStorage bị chặn). Bạn vẫn có thể bấm Lưu nháp lên máy chủ.',
      isTabOwned: false,
    };
  }

  const legacyEntry = findLegacyUnscopedRaw(entityKey, scopedKey);
  const legacyRaw = legacyEntry?.raw ?? null;

  if (raw !== null) {
    const isTabOwned = tabOwnedRawByKey.get(scopedKey) === raw;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        status: 'corrupt',
        storageKey: scopedKey,
        entityKey,
        raw,
        legacyRaw,
        backup: null,
        error: 'Bản sao lưu tạm trên trình duyệt bị hỏng (JSON không hợp lệ). Bạn có thể tải bản thô hoặc xóa bản tạm này.',
        isTabOwned: false,
      };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        status: 'corrupt',
        storageKey: scopedKey,
        entityKey,
        raw,
        legacyRaw,
        backup: null,
        error: 'Bản sao lưu tạm không đúng cấu trúc đối tượng. Bạn có thể tải bản thô hoặc xóa bản tạm này.',
        isTabOwned: false,
      };
    }

    const rec = parsed as Record<string, unknown>;
    if (typeof rec.actorId === 'string' && actorId && rec.actorId !== actorId) {
      return {
        status: 'wrong_actor',
        storageKey: scopedKey,
        entityKey,
        raw: null,
        legacyRaw: null,
        backup: null,
        error: 'Bản sao lưu thuộc về tài khoản quản trị khác, không thể khôi phục vào phiên hiện tại.',
        isTabOwned: false,
      };
    }

    if (typeof rec.entityKey === 'string' && rec.entityKey !== entityKey) {
      return {
        status: 'wrong_entity',
        storageKey: scopedKey,
        entityKey,
        raw,
        legacyRaw,
        backup: null,
        error: `Bản sao lưu thuộc mục khác (${rec.entityKey}), không khớp với mục đang mở (${entityKey}).`,
        isTabOwned: false,
      };
    }

    const baseRev =
      typeof rec.baseRevision === 'number' && Number.isFinite(rec.baseRevision)
        ? rec.baseRevision
        : null;

    if (
      rec.version !== DRAFT_BACKUP_VERSION ||
      typeof rec.actorId !== 'string' ||
      !rec.actorId.trim() ||
      typeof rec.entityKey !== 'string' ||
      !rec.entityKey.trim() ||
      baseRev === null ||
      typeof rec.savedAt !== 'string' ||
      rec.draft === undefined
    ) {
      return {
        status: 'incompatible',
        storageKey: scopedKey,
        entityKey,
        raw,
        legacyRaw,
        backup: null,
        error: 'Bản sao lưu thế hệ cũ hoặc thiếu thông tin phiên bản/tài khoản. Không tự động khôi phục; bạn có thể tải JSON thô.',
        isTabOwned: false,
      };
    }

    const backup: LocalDraftBackup<T> = {
      version: DRAFT_BACKUP_VERSION,
      actorId: rec.actorId,
      entityKey: rec.entityKey,
      baseRevision: baseRev,
      revision: baseRev,
      savedAt: rec.savedAt,
      timestamp: typeof rec.timestamp === 'number' ? rec.timestamp : 0,
      draft: rec.draft as T,
    };

    return {
      status: 'ok',
      storageKey: scopedKey,
      entityKey,
      raw,
      legacyRaw,
      backup,
      error: null,
      isTabOwned,
    };
  }

  if (legacyEntry) {
    try {
      const parsedLegacy = JSON.parse(legacyEntry.raw) as Record<string, unknown>;
      if (
        parsedLegacy &&
        typeof parsedLegacy === 'object' &&
        typeof parsedLegacy.actorId === 'string' &&
        actorId &&
        parsedLegacy.actorId !== actorId
      ) {
        return {
          status: 'wrong_actor',
          storageKey: legacyEntry.key,
          entityKey,
          raw: null,
          legacyRaw: null,
          backup: null,
          error: 'Bản sao lưu thuộc về tài khoản quản trị khác, không thể khôi phục vào phiên hiện tại.',
          isTabOwned: false,
        };
      }
    } catch {
      // Legacy entry is raw/corrupt; still allow exporting raw without auto-restoring
    }
    return {
      status: 'legacy_unscoped',
      storageKey: legacyEntry.key,
      entityKey,
      raw: legacyEntry.raw,
      legacyRaw: legacyEntry.raw,
      backup: null,
      error: 'Phát hiện bản sao lưu cũ chưa gắn định danh tài khoản. Hệ thống không tự động khôi phục sang tài khoản hiện tại; bạn có thể tải JSON thô.',
      isTabOwned: false,
    };
  }

  const foreignKey = findForeignActorKey(entityKey, actorId);
  if (foreignKey) {
    return {
      status: 'wrong_actor',
      storageKey: foreignKey,
      entityKey,
      raw: null,
      legacyRaw: null,
      backup: null,
      error: 'Phát hiện bản sao lưu nháp của tài khoản khác trên trình duyệt này. Không thể khôi phục vào tài khoản hiện tại.',
      isTabOwned: false,
    };
  }

  return {
    status: 'none',
    storageKey: scopedKey,
    entityKey,
    raw: null,
    legacyRaw: null,
    backup: null,
    error: null,
    isTabOwned: false,
  };
}

export function getSavedLocalDraft<T = unknown>(
  customKey?: string,
  actorId?: string | null
): LocalDraftBackup<T> | null {
  const inspection = inspectLocalDraftBackup<T>(customKey, actorId);
  return inspection.status === 'ok' ? inspection.backup : null;
}

export function writeLocalDraftBackup<T = unknown>(
  customKey: string | undefined,
  draft: T,
  baseRevision: number,
  actorId?: string | null
): { ok: boolean; savedAt: string; raw?: string } {
  const nowStr = new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  if (typeof window === 'undefined' || !actorId) {
    return { ok: false, savedAt: nowStr };
  }
  const entityKey = resolveEntityKey(customKey);
  const scopedKey = getScopedStorageKey(entityKey, actorId);
  try {
    const existingRaw = window.localStorage.getItem(scopedKey);
    if (existingRaw !== null && existingRaw !== tabOwnedRawByKey.get(scopedKey)) {
      notifyDraftBackupChange(scopedKey, entityKey);
      return { ok: false, savedAt: nowStr };
    }
    const payload: LocalDraftBackup<unknown> = {
      version: DRAFT_BACKUP_VERSION,
      actorId,
      entityKey,
      baseRevision,
      revision: baseRevision,
      savedAt: nowStr,
      timestamp: Date.now(),
      draft: normalizeDraftValue(draft),
    };
    const raw = JSON.stringify(payload);
    window.localStorage.setItem(scopedKey, raw);
    tabOwnedRawByKey.set(scopedKey, raw);
    notifyDraftBackupChange(scopedKey, entityKey, false);
    return { ok: true, savedAt: nowStr, raw };
  } catch {
    notifyDraftBackupChange(scopedKey, entityKey, true);
    return { ok: false, savedAt: nowStr };
  }
}

export function markLocalDraftResolved(
  customKey: string | undefined,
  resolvedRaw: string | null,
  actorId?: string | null
): void {
  if (!resolvedRaw) return;
  const entityKey = resolveEntityKey(customKey);
  const scopedKey = getScopedStorageKey(entityKey, actorId);
  tabOwnedRawByKey.set(scopedKey, resolvedRaw);
  notifyDraftBackupChange(scopedKey, entityKey, false);
}

export function discardObservedLocalDraft(
  customKey: string | undefined,
  observedRaw: string | null,
  actorId?: string | null
): {
  discarded: boolean;
  replacedByNewer: boolean;
  currentInspection: DraftBackupInspection;
} {
  const entityKey = resolveEntityKey(customKey);
  const scopedKey = getScopedStorageKey(entityKey, actorId);
  if (typeof window === 'undefined') {
    return {
      discarded: false,
      replacedByNewer: false,
      currentInspection: inspectLocalDraftBackup(customKey, actorId),
    };
  }
  try {
    const currentRaw = window.localStorage.getItem(scopedKey);
    if (currentRaw === null) {
      tabOwnedRawByKey.delete(scopedKey);
      notifyDraftBackupChange(scopedKey, entityKey, false);
      return {
        discarded: true,
        replacedByNewer: false,
        currentInspection: inspectLocalDraftBackup(customKey, actorId),
      };
    }
    if (observedRaw === null || currentRaw !== observedRaw) {
      // Another tab wrote a different/newer backup since this tab observed observedRaw.
      return {
        discarded: false,
        replacedByNewer: true,
        currentInspection: inspectLocalDraftBackup(customKey, actorId),
      };
    }
    window.localStorage.removeItem(scopedKey);
    tabOwnedRawByKey.delete(scopedKey);
    notifyDraftBackupChange(scopedKey, entityKey, false);
    return {
      discarded: true,
      replacedByNewer: false,
      currentInspection: inspectLocalDraftBackup(customKey, actorId),
    };
  } catch {
    return {
      discarded: false,
      replacedByNewer: false,
      currentInspection: inspectLocalDraftBackup(customKey, actorId),
    };
  }
}

export function clearCommittedLocalDraft(
  customKey: string | undefined,
  committedDraft: unknown,
  actorId?: string | null
): { cleared: boolean; preservedNewer: boolean } {
  if (typeof window === 'undefined') return { cleared: false, preservedNewer: false };
  const entityKey = resolveEntityKey(customKey);
  const scopedKey = getScopedStorageKey(entityKey, actorId);
  try {
    const currentRaw = window.localStorage.getItem(scopedKey);
    if (currentRaw === null) {
      tabOwnedRawByKey.delete(scopedKey);
      return { cleared: true, preservedNewer: false };
    }
    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(currentRaw) as Record<string, unknown>;
    } catch {
      // Corrupt backup must not be silently removed by save
      return { cleared: false, preservedNewer: true };
    }
    if (!parsed || typeof parsed !== 'object') {
      return { cleared: false, preservedNewer: true };
    }
    if (actorId && typeof parsed.actorId === 'string' && parsed.actorId !== actorId) {
      return { cleared: false, preservedNewer: true };
    }
    if (typeof parsed.entityKey === 'string' && parsed.entityKey !== entityKey) {
      return { cleared: false, preservedNewer: true };
    }
    const ownedRaw = tabOwnedRawByKey.get(scopedKey);
    if (ownedRaw === undefined || currentRaw !== ownedRaw) {
      // Another tab wrote to this key after this tab's last write
      return { cleared: false, preservedNewer: true };
    }
    const normalizedCommitted = JSON.stringify(normalizeDraftValue(committedDraft));
    const storedDraftSerialized = JSON.stringify(parsed.draft);
    if (storedDraftSerialized !== normalizedCommitted) {
      // Newer edit in this tab or another tab differs from the committed snapshot
      return { cleared: false, preservedNewer: true };
    }
    window.localStorage.removeItem(scopedKey);
    tabOwnedRawByKey.delete(scopedKey);
    notifyDraftBackupChange(scopedKey, entityKey, false);
    return { cleared: true, preservedNewer: false };
  } catch {
    return { cleared: false, preservedNewer: false };
  }
}

export function transferNewEntityDraftBackup(params: {
  actorId?: string | null;
  fromEntityKey: string;
  toEntityKey: string;
  submittedDraft: unknown;
  latestDraft: unknown;
  newBaseRevision: number;
}): void {
  const { actorId, fromEntityKey, toEntityKey, submittedDraft, latestDraft, newBaseRevision } = params;
  if (typeof window === 'undefined' || !actorId) return;
  const fromScopedKey = getScopedStorageKey(fromEntityKey, actorId);
  const normalizedSubmitted = JSON.stringify(normalizeDraftValue(submittedDraft));
  const normalizedLatest = JSON.stringify(normalizeDraftValue(latestDraft));
  const hasDescendedNewerEdit = normalizedLatest !== normalizedSubmitted;

  // Keep the source until its newer edits have a safe destination.
  if (hasDescendedNewerEdit && !writeLocalDraftBackup(toEntityKey, latestDraft, newBaseRevision, actorId).ok) {
    return;
  }
  try {
    const existingFromRaw = window.localStorage.getItem(fromScopedKey);
    const ownedFromRaw = tabOwnedRawByKey.get(fromScopedKey);
    if (existingFromRaw !== null && existingFromRaw === ownedFromRaw) {
      window.localStorage.removeItem(fromScopedKey);
      tabOwnedRawByKey.delete(fromScopedKey);
      notifyDraftBackupChange(fromScopedKey, fromEntityKey, false);
    }
  } catch {
    // Ignore storage errors when cleaning old new-entity key
  }

}

export function clearSavedLocalDraft(
  customKey?: string,
  expectedRaw?: string | null,
  actorId?: string | null
): void {
  if (expectedRaw !== undefined) {
    discardObservedLocalDraft(customKey, expectedRaw, actorId);
    return;
  }
  const entityKey = resolveEntityKey(customKey);
  const scopedKey = getScopedStorageKey(entityKey, actorId);
  const ownedRaw = tabOwnedRawByKey.get(scopedKey) ?? null;
  if (ownedRaw !== null) {
    discardObservedLocalDraft(customKey, ownedRaw, actorId);
  }
}

/**
 * Draft status, debounced localStorage backup, Ctrl+S shortcut & unsaved-changes guard across Admin Studios.
 */
export function useDraftAutosave(
  draft: unknown,
  revision: number,
  enabled: boolean,
  dirty: boolean,
  saving: boolean,
  save?: () => Promise<boolean> | unknown,
  storageKey?: string
) {
  const actorId = useAdminActorId();
  const [savedAt, setSavedAt] = useState('');
  const [localBackedUpAt, setLocalBackedUpAt] = useState('');
  const [backupError, setBackupError] = useState(false);
  const [hasUnresolvedBackup, setHasUnresolvedBackup] = useState(false);

  const prevRevision = useRef<number>(revision);
  const prevStorageKey = useRef<string | undefined>(storageKey);
  const saveRef = useRef(save);
  const stateRef = useRef({ enabled, dirty, saving });
  const draftRef = useRef(draft);
  const revisionRef = useRef(revision);
  const actorIdRef = useRef(actorId);
  const inFlightCtrlSRef = useRef(false);
  const submittedWhenSavingRef = useRef<unknown>(undefined);

  useEffect(() => {
    saveRef.current = save;
    stateRef.current = { enabled, dirty, saving };
    draftRef.current = draft;
    revisionRef.current = revision;
    actorIdRef.current = actorId;
  }, [save, enabled, dirty, saving, draft, revision, actorId]);

  useEffect(() => {
    if (saving) {
      submittedWhenSavingRef.current = draftRef.current;
    }
  }, [saving]);

  // Discover any existing backup before first debounce
  useEffect(() => {
    if (typeof window === 'undefined' || !actorId) return;
    const entityKey = resolveEntityKey(storageKey);
    const scopedKey = getScopedStorageKey(entityKey, actorId);
    try {
      const raw = window.localStorage.getItem(scopedKey);
      const owned = tabOwnedRawByKey.get(scopedKey) ?? null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync external localStorage discovery state
      setHasUnresolvedBackup(raw !== null && raw !== owned);
      setBackupError(false);
    } catch {
      setBackupError(true);
    }
  }, [storageKey, actorId]);

  useEffect(() => {
    return subscribeDraftBackupChanges(({ storageWriteError }) => {
      if (storageWriteError) {
        setBackupError(true);
        return;
      }
      if (typeof window === 'undefined' || !actorIdRef.current) return;
      const entityKey = resolveEntityKey(storageKey);
      const scopedKey = getScopedStorageKey(entityKey, actorIdRef.current);
      try {
        const raw = window.localStorage.getItem(scopedKey);
        const owned = tabOwnedRawByKey.get(scopedKey) ?? null;
        const unresolved = raw !== null && raw !== owned;
        setHasUnresolvedBackup(unresolved);
      } catch {
        setBackupError(true);
      }
    });
  }, [storageKey]);

  useEffect(() => {
    const keyChanged = prevStorageKey.current !== storageKey;
    prevStorageKey.current = storageKey;
    if (!keyChanged && revision > prevRevision.current && prevRevision.current > 0) {
      const nowStr = new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      setSavedAt(nowStr);
      if (submittedWhenSavingRef.current !== undefined && actorIdRef.current) {
        const res = clearCommittedLocalDraft(
          storageKey,
          submittedWhenSavingRef.current,
          actorIdRef.current
        );
        if (res.cleared) {
          setLocalBackedUpAt('');
        }
        submittedWhenSavingRef.current = undefined;
      }
      setBackupError(false);
    }
    prevRevision.current = revision;
  }, [revision, storageKey]);

  // Debounced localStorage backup when dirty (never overwrites an unresolved recovery backup)
  useEffect(() => {
    if (typeof window === 'undefined' || !enabled || !actorId || !dirty) return;

    const entityKey = resolveEntityKey(storageKey);
    const scopedKey = getScopedStorageKey(entityKey, actorId);

    const timer = window.setTimeout(() => {
      try {
        const existingRaw = window.localStorage.getItem(scopedKey);
        const ownedRaw = tabOwnedRawByKey.get(scopedKey) ?? null;
        if (existingRaw !== null && existingRaw !== ownedRaw) {
          setHasUnresolvedBackup(true);
          return;
        }
      } catch {
        setBackupError(true);
        notifyDraftBackupChange(scopedKey, entityKey, true);
        return;
      }

      const res = writeLocalDraftBackup(storageKey, draft, revision, actorId);
      if (res.ok) {
        setLocalBackedUpAt(res.savedAt);
        setBackupError(false);
        setHasUnresolvedBackup(false);
      } else {
        setBackupError(true);
      }
    }, 900);

    return () => window.clearTimeout(timer);
  }, [draft, revision, dirty, savedAt, storageKey, enabled, actorId, hasUnresolvedBackup]);

  // Ctrl+S / Cmd+S keyboard shortcut (exactly one manual request, gated on enabled/dirty/saving & composition)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 's') {
        if (e.isComposing || (e as KeyboardEvent & { keyCode?: number }).keyCode === 229) return;
        if (!saveRef.current) return;
        e.preventDefault();
        if (e.repeat) return;
        if (
          stateRef.current.enabled &&
          stateRef.current.dirty &&
          !stateRef.current.saving &&
          !inFlightCtrlSRef.current
        ) {
          inFlightCtrlSRef.current = true;
          Promise.resolve(saveRef.current()).finally(() => {
            inFlightCtrlSRef.current = false;
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Unsaved-changes guard on tab close and internal link navigation
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (dirty || saving) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const link = (e: MouseEvent) => {
      const target = e.target instanceof Element ? e.target.closest('a') : null;
      if (
        (dirty || saving) &&
        target?.href &&
        target.target !== '_blank' &&
        !target.hasAttribute('download') &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey
      ) {
        e.preventDefault();
        e.stopPropagation();
        const destHref = target.href;
        void confirmAdminAction({
          title: 'Nội dung chưa lưu',
          message: 'Bạn có thay đổi chưa được lưu lên máy chủ. Rời trang và bỏ các thay đổi chưa lưu?',
          confirmLabel: 'Rời trang',
          cancelLabel: 'Ở lại tiếp tục sửa',
          variant: 'warning',
        }).then((ok) => {
          if (ok) {
            window.location.href = destHref;
          }
        });
      }
    };
    window.addEventListener('beforeunload', leave);
    document.addEventListener('click', link, true);
    return () => {
      window.removeEventListener('beforeunload', leave);
      document.removeEventListener('click', link, true);
    };
  }, [dirty, saving]);

  return saving
    ? 'Đang lưu…'
    : backupError
    ? 'Không thể sao lưu tạm trên trình duyệt. Hãy bấm Lưu nháp.'
    : dirty
    ? hasUnresolvedBackup
      ? 'Chưa lưu máy chủ · Có bản sao lưu tạm chưa xử lý (Khôi phục hoặc Xóa bản tạm)'
      : localBackedUpAt
      ? `Chưa lưu máy chủ · Đã sao lưu tạm ${localBackedUpAt} (Ctrl+S để lưu)`
      : 'Chưa lưu (bấm Lưu nháp hoặc Ctrl+S)'
    : savedAt
    ? `Đã lưu lúc ${savedAt} (GMT+7)`
    : 'Đã đồng bộ';
}
