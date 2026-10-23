import { adminActor, adminAuditStatements } from '../admin-context';
import type { D1Database } from "@cloudflare/workers-types";
import {
  adminSettingsDocumentSchema,
  settingsMutationSchema,
  DEFAULT_ADMIN_SETTINGS,
  publicStorefrontSettingsSchema,
  type AdminSettingsDocument,
  type PublicStorefrontSettings,
} from "../../contracts/cms/settings";

export class SettingsError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "SettingsError";
  }
}

interface SiteSettingsRow {
  id: string;
  revision: number;
  document: string;
  updatedAt: string;
}

export async function getAdminSettings(
  db: D1Database
): Promise<{ revision: number; document: AdminSettingsDocument }> {
  try {
    const row = await db
      .prepare("SELECT id, revision, document, updatedAt FROM SiteSettings WHERE id = 'site'")
      .first<SiteSettingsRow>();

    if (!row) {
      return {
        revision: 0,
        document: DEFAULT_ADMIN_SETTINGS,
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(row.document);
    } catch {
      throw new SettingsError("Dữ liệu cấu hình trong cơ sở dữ liệu bị lỗi cú pháp JSON.", 500);
    }

    // Merge with defaults in case new fields were added
    const merged = { ...DEFAULT_ADMIN_SETTINGS, ...(parsed as Record<string, unknown>) };
    const validated = adminSettingsDocumentSchema.parse(merged);

    return {
      revision: row.revision,
      document: validated,
    };
  } catch (err) {
    if (err instanceof SettingsError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("no such table")) {
      throw new SettingsError("Bảng SiteSettings chưa được khởi tạo (thiếu migration 0012).", 503);
    }
    throw new SettingsError(`Lỗi truy vấn cài đặt từ cơ sở dữ liệu: ${msg}`, 500);
  }
}

export async function saveAdminSettings(
  db: D1Database,
  input: unknown,
  actor = "admin"
): Promise<{ revision: number; document: AdminSettingsDocument }> {
  const { expectedRevision, document } = settingsMutationSchema.parse(input);

  // Check current revision in DB
  const current = await getAdminSettings(db);
  if (current.revision !== expectedRevision) {
    throw new SettingsError(
      `Xung đột phiên bản: Cài đặt đã được cập nhật ở nơi khác (phiên bản hiện tại: ${current.revision}, bạn gửi: ${expectedRevision}). Vui lòng tải lại trang.`,
      409
    );
  }

  const nextRevision = expectedRevision + 1;
  const snapshot = JSON.stringify(document);

  const statements = [
    db
      .prepare("INSERT OR IGNORE INTO SiteSettings(id, revision, document) VALUES('site', 0, ?)")
      .bind(snapshot),
    db
      .prepare("INSERT INTO SiteSettingsRevision(revision, document, action, actor) VALUES(?, ?, 'save', ?)")
      .bind(nextRevision, snapshot, adminActor()),
    db
      .prepare("UPDATE SiteSettings SET revision = ?, document = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = 'site'")
      .bind(nextRevision, snapshot),
  ];

  try {
    await db.batch([...statements, ...adminAuditStatements(db, 'settings.save', 'site', 'CMS mutation',null,'order',{before:expectedRevision,after:nextRevision})]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/SETTINGS_CONFLICT|UNIQUE constraint failed/.test(msg)) {
      throw new SettingsError(
        "Xung đột ghi đè đồng thời (SETTINGS_CONFLICT). Một thay đổi khác vừa được lưu.",
        409
      );
    }
    throw new SettingsError(`Không thể lưu cài đặt vào cơ sở dữ liệu D1: ${msg}`, 500);
  }

  return {
    revision: nextRevision,
    document,
  };
}

const publicSettingsCache = new WeakMap<D1Database, { revision: number; document: PublicStorefrontSettings }>();

export async function getPublicStorefrontSettings(
  db: D1Database
): Promise<PublicStorefrontSettings> {
  const cached = publicSettingsCache.get(db);
  // Read revision and snapshot atomically; never serve cached data on a DB error.
  const row = await db.prepare("SELECT revision, CASE WHEN revision = ? THEN NULL ELSE document END AS document FROM SiteSettings WHERE id = 'site'")
    .bind(cached?.revision ?? -1).first<{ revision: number; document: string | null }>();
  if (!row) {
    publicSettingsCache.delete(db);
    return publicStorefrontSettingsSchema.parse(DEFAULT_ADMIN_SETTINGS);
  }
  if (cached && row.revision === cached.revision) return structuredClone(cached.document);
  const document = publicStorefrontSettingsSchema.parse(adminSettingsDocumentSchema.parse({
    ...DEFAULT_ADMIN_SETTINGS, ...JSON.parse(row.document!),
  }));
  publicSettingsCache.set(db, { revision: row.revision, document });
  return structuredClone(document);
}
