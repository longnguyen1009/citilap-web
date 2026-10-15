import { z } from 'zod';
import { getPrismaClient, getD1Database } from '@/lib/prisma';
import { hashIp } from '@/lib/rate-limiter';
import type { D1Database } from '@cloudflare/workers-types';

export const ContactInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Họ và tên phải có tối thiểu 2 ký tự')
    .max(100, 'Họ và tên không vượt quá 100 ký tự'),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s().-]{9,20}$/, 'Số điện thoại không hợp lệ')
    .transform((val) => val.replace(/[\s().-]/g, '')),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Email không hợp lệ')
    .max(254)
    .optional()
    .nullable()
    .or(z.literal('')),
  message: z
    .string()
    .trim()
    .max(1000, 'Nội dung tin nhắn không vượt quá 1000 ký tự')
    .optional()
    .nullable()
    .or(z.literal('')),
  // Honeypot field: real users leave this blank; automated spam bots fill it
  website: z.string().optional().nullable(),
});

export type ContactInput = z.infer<typeof ContactInputSchema>;

export type ContactStatus = 'PENDING' | 'PROCESSING' | 'HANDLED';

export const SHARED_CONTACT_ACTOR = 'Admin vận hành (Phiên dùng chung)';

export const VALID_CONTACT_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PROCESSING', 'HANDLED'],
  PROCESSING: ['HANDLED', 'PENDING'],
  HANDLED: ['PENDING', 'PROCESSING'], // Reopen
};

export class ContactConflictError extends Error {
  currentRevision: number;
  constructor(message: string, currentRevision: number) {
    super(message);
    this.name = 'ContactConflictError';
    this.currentRevision = currentRevision;
  }
}

export interface ContactSubmissionResult {
  success: boolean;
  message?: string;
  error?: string;
  id?: string;
}

/**
 * Strips HTML tags and potential script injection sequences
 */
function stripHtml(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

/**
 * Handles, validates, and persists a customer contact message to D1
 */
export async function submitContactMessage(
  rawInput: unknown,
  clientIp: string,
  d1Database?: D1Database
): Promise<ContactSubmissionResult> {
  const parsed = ContactInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message || 'Dữ liệu liên hệ không hợp lệ';
    return { success: false, error: firstIssue };
  }

  const { name, phone, email, message, website } = parsed.data;

  // 1. Honeypot check: If the hidden honeypot field is filled, silently discard or reject bot
  if (website && website.trim().length > 0) {
    return {
      success: true,
      message: 'Yêu cầu của bạn đã được ghi nhận.',
    };
  }

  // 2. Additional phone length verification after sanitization
  if (phone.length < 9 || phone.length > 15) {
    return { success: false, error: 'Số điện thoại phải từ 9 đến 15 chữ số' };
  }

  // 3. Sanitize text content to prevent script injection
  const safeName = stripHtml(name);
  const safeMessage = message ? stripHtml(message) : null;
  const safeEmail = email ? email.trim() : null;
  const ipHash = hashIp(clientIp);

  // 4. Persist to Cloudflare D1
  const db = d1Database || getD1Database();
  if (!db) {
    throw new Error('D1_BINDING_REQUIRED: Cloudflare D1 database binding is required for atomic contact submission');
  }
  const contactId = 'c' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
  const now = new Date();
  const nowIso = now.toISOString().replace('Z', '+00:00');

  try {
    const contactStmt = db.prepare(`
      INSERT INTO "ContactSubmission" ("id", "name", "phone", "email", "message", "status", "revision", "ipHash", "createdAt", "updatedAt")
      VALUES (?, ?, ?, ?, ?, 'PENDING', 1, ?, ?, ?)
    `).bind(contactId, safeName, phone, safeEmail, safeMessage, ipHash, nowIso, nowIso);

    const notifStmt = db.prepare(`
      INSERT INTO "AdminNotification" ("id", "type", "referenceId", "title", "message", "isRead", "createdAt")
      VALUES (?, 'NEW_CONTACT', ?, ?, ?, 0, ?)
      ON CONFLICT("type", "referenceId") DO NOTHING
    `).bind(
      `notif-${contactId}`,
      contactId,
      `Liên hệ mới từ ${safeName}`,
      `Khách hàng ${safeName} (${phone}) đã gửi yêu cầu tư vấn.`,
      nowIso
    );

    await db.batch([contactStmt, notifStmt]);

    // PII masking for safe server logging
    const maskedPhone = phone.length > 4 ? `${phone.slice(0, 3)}****${phone.slice(-3)}` : '***';
    console.log(`[ContactService] Received submission ${contactId} from phone ${maskedPhone}`);

    return {
      success: true,
      message: 'Cảm ơn quý khách! Yêu cầu tư vấn đã được gửi thành công. Chuyên viên CitiLap sẽ liên hệ hỗ trợ trong thời gian sớm nhất.',
      id: contactId,
    };
  } catch (error) {
    console.error('[ContactService] Error saving contact submission to D1:', error);
    return {
      success: false,
      error: 'Hệ thống đang bận. Quý khách vui lòng thử lại sau hoặc gọi hotline 0899.188.186 để được hỗ trợ ngay.',
    };
  }
}

export interface ListContactsOptions {
  status?: string | null;
  page?: number;
  limit?: number;
  search?: string | null;
}

export async function listContactSubmissions(
  options: ListContactsOptions = {},
  d1Database?: D1Database
) {
  const prisma = getPrismaClient(d1Database);
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (options.status && options.status !== 'ALL') {
    where.status = options.status.toUpperCase();
  }
  if (options.search && options.search.trim()) {
    const s = options.search.trim();
    where.OR = [
      { name: { contains: s } },
      { phone: { contains: s } },
      { email: { contains: s } },
      { message: { contains: s } },
    ];
  }

  const [total, contacts] = await Promise.all([
    prisma.contactSubmission.count({ where }),
    prisma.contactSubmission.findMany({
      where,
      include: { events: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return {
    contacts,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getAllContactsForExport(
  options: { status?: string | null; search?: string | null } = {},
  d1Database?: D1Database
) {
  const prisma = getPrismaClient(d1Database);
  const where: Record<string, unknown> = {};

  const exportSnapshotTime = new Date();
  where.createdAt = { lte: exportSnapshotTime };

  if (options.status && options.status !== 'ALL') {
    where.status = options.status.toUpperCase();
  }
  if (options.search && options.search.trim()) {
    const s = options.search.trim();
    where.OR = [
      { name: { contains: s } },
      { phone: { contains: s } },
      { email: { contains: s } },
      { message: { contains: s } },
    ];
  }

  type ContactExportItem = {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    message: string | null;
    status: string;
    internalNote: string | null;
    handledAt: Date | null;
    handledBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  };

  const allContacts: ContactExportItem[] = [];
  const chunkSize = 500;
  let lastRecord: { id: string; createdAt: Date } | null = null;

  while (true) {
    let currentWhere: Record<string, unknown> = { ...where };
    if (lastRecord) {
      currentWhere = {
        ...where,
        AND: [
          {
            OR: [
              { createdAt: { lt: lastRecord.createdAt } },
              { createdAt: lastRecord.createdAt, id: { lt: lastRecord.id } },
            ],
          },
        ],
      };
    }

    const chunk: ContactExportItem[] = await prisma.contactSubmission.findMany({
      where: currentWhere,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: chunkSize,
    });

    allContacts.push(...chunk);
    if (chunk.length < chunkSize) break;
    const last = chunk[chunk.length - 1];
    if (lastRecord && last.id === lastRecord.id) break;
    lastRecord = { id: last.id, createdAt: last.createdAt };
  }

  return allContacts;
}

export interface UpdateContactInput {
  status?: ContactStatus;
  expectedRevision: number;
  internalNote?: string | null;
  actor?: string | null;
}

export async function updateContactSubmissionStatus(
  id: string,
  inputOrStatus: UpdateContactInput | ContactStatus,
  d1Database?: D1Database
) {
  const db = d1Database || getD1Database();
  if (!db) {
    throw new Error('D1_BINDING_REQUIRED: Cloudflare D1 database binding is required for atomic contact status update');
  }
  const prisma = getPrismaClient(db);

  let input: UpdateContactInput;
  if (typeof inputOrStatus === 'string') {
    const existing = await prisma.contactSubmission.findUnique({ where: { id } });
    if (!existing) throw new Error('CONTACT_NOT_FOUND');
    input = {
      expectedRevision: existing.revision,
      status: inputOrStatus,
      actor: SHARED_CONTACT_ACTOR,
    };
  } else {
    input = inputOrStatus;
  }

  // 1. Validate required expectedRevision
  if (typeof input.expectedRevision !== 'number' || !Number.isInteger(input.expectedRevision) || input.expectedRevision < 1) {
    const err = new Error('INVALID_REVISION: expectedRevision là bắt buộc và phải là số nguyên dương hợp lệ');
    (err as unknown as { code: string }).code = 'INVALID_REVISION';
    throw err;
  }

  const existing = await prisma.contactSubmission.findUnique({
    where: { id },
    include: { events: { orderBy: { createdAt: 'desc' } } },
  });

  if (!existing) {
    throw new Error('CONTACT_NOT_FOUND');
  }

  // 2. Stale revision check FIRST before transition or no-op checks
  if (existing.revision !== input.expectedRevision) {
    throw new ContactConflictError(
      `Yêu cầu liên hệ đã được chỉnh sửa bởi phiên khác (phiên bản hiện tại: ${existing.revision}, gửi lên: ${input.expectedRevision})`,
      existing.revision
    );
  }

  const currentStatus = existing.status;
  const targetStatus = input.status || (currentStatus as ContactStatus);
  const statusChanged = targetStatus !== currentStatus;

  // 3. Transition rules
  if (statusChanged) {
    const allowed = VALID_CONTACT_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      const err = new Error(`INVALID_TRANSITION: Cannot transition contact from ${currentStatus} to ${targetStatus}`);
      (err as unknown as { code: string }).code = 'INVALID_TRANSITION';
      throw err;
    }
  }

  // 4. Note handling
  let cleanNote: string | null = null;
  if (input.internalNote !== undefined) {
    const raw = input.internalNote ? stripHtml(input.internalNote).trim() : null;
    cleanNote = raw && raw.length > 0 ? raw : null;
  } else {
    cleanNote = existing.internalNote;
  }

  // If same status and no new note: NOOP
  if (!statusChanged && input.internalNote !== undefined && cleanNote === existing.internalNote) {
    const err = new Error('SAME_STATUS_NOOP: Không có thay đổi trạng thái hoặc ghi chú');
    (err as unknown as { code: string }).code = 'SAME_STATUS_NOOP';
    throw err;
  }

  // 5. Timestamps
  const now = new Date();
  const nowIso = now.toISOString();
  let startedProcessingAt = existing.startedProcessingAt;
  let handledAt = existing.handledAt;
  let handledBy = existing.handledBy;

  if (targetStatus === 'PROCESSING') {
    if (!startedProcessingAt) startedProcessingAt = now;
    handledBy = SHARED_CONTACT_ACTOR;
  } else if (targetStatus === 'HANDLED') {
    handledAt = now;
    handledBy = SHARED_CONTACT_ACTOR;
    if (!startedProcessingAt) startedProcessingAt = now;
  } else if (targetStatus === 'PENDING') {
    handledAt = null;
    handledBy = null;
    startedProcessingAt = null;
  }

  const nextRevision = input.expectedRevision + 1;
  const startedProcessingAtIso = startedProcessingAt ? startedProcessingAt.toISOString() : null;
  const handledAtIso = handledAt ? handledAt.toISOString() : null;

  // 6. Execute atomic CAS UPDATE and append ContactEvent in the same single transaction
  const action = statusChanged ? 'STATUS_CHANGE' : 'NOTE_ADDED';
  const eventId = 'ce' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);

  const updateStmt = db.prepare(
    `UPDATE "ContactSubmission"
     SET "status" = ?,
         "revision" = ?,
         "internalNote" = ?,
         "handledAt" = ?,
         "handledBy" = ?,
         "startedProcessingAt" = ?,
         "updatedAt" = ?
     WHERE "id" = ? AND "revision" = ?`
  ).bind(
    targetStatus,
    nextRevision,
    cleanNote,
    handledAtIso,
    handledBy,
    startedProcessingAtIso,
    nowIso,
    id,
    input.expectedRevision
  );

  // Event append strictly depends on CAS update succeeding (changes() = 1) in the exact same transaction!
  const eventStmt = db.prepare(
    `INSERT INTO "ContactEvent" (
      "id", "contactId", "action", "fromStatus", "toStatus", "note", "actor", "createdAt"
    )
    SELECT ?, "id", ?, ?, ?, ?, ?, ?
    FROM "ContactSubmission"
    WHERE "id" = ? AND changes() = 1`
  ).bind(
    eventId,
    action,
    currentStatus,
    targetStatus,
    cleanNote,
    SHARED_CONTACT_ACTOR,
    nowIso,
    id
  );

  const [updateRes] = await db.batch([updateStmt, eventStmt]);
  if ((updateRes.meta?.changes ?? 0) === 0) {
    const fresh = await prisma.contactSubmission.findUnique({ where: { id } });
    if (!fresh) {
      throw new Error('CONTACT_NOT_FOUND');
    }
    throw new ContactConflictError(
      `Yêu cầu liên hệ đã được chỉnh sửa bởi phiên khác (phiên bản hiện tại: ${fresh.revision}, gửi lên: ${input.expectedRevision})`,
      fresh.revision
    );
  }

  const res = await prisma.contactSubmission.findUnique({
    where: { id },
    include: { events: { orderBy: { createdAt: 'desc' } } },
  });
  if (!res) {
    throw new Error('CONTACT_NOT_FOUND');
  }
  return res;
}

export async function getContactSubmissionById(id: string, d1Database?: D1Database) {
  const prisma = getPrismaClient(d1Database);
  return prisma.contactSubmission.findUnique({
    where: { id },
    include: { events: { orderBy: { createdAt: 'desc' } } },
  });
}

