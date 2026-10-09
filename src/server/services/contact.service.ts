import { z } from 'zod';
import { getPrismaClient } from '@/lib/prisma';
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
  const prisma = getPrismaClient(d1Database);
  try {
    const submission = await prisma.contactSubmission.create({
      data: {
        name: safeName,
        phone,
        email: safeEmail,
        message: safeMessage,
        status: 'PENDING',
        ipHash,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    // PII masking for safe server logging
    const maskedPhone = phone.length > 4 ? `${phone.slice(0, 3)}****${phone.slice(-3)}` : '***';
    console.log(`[ContactService] Received submission ${submission.id} from phone ${maskedPhone}`);

    return {
      success: true,
      message: 'Cảm ơn quý khách! Yêu cầu tư vấn đã được gửi thành công. Chuyên viên CitiLap sẽ liên hệ hỗ trợ trong thời gian sớm nhất.',
      id: submission.id,
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

export async function updateContactSubmissionStatus(
  id: string,
  status: 'PENDING' | 'HANDLED',
  d1Database?: D1Database
) {
  const prisma = getPrismaClient(d1Database);
  const existing = await prisma.contactSubmission.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('CONTACT_NOT_FOUND');
  }

  return prisma.contactSubmission.update({
    where: { id },
    data: {
      status,
      updatedAt: new Date(),
    },
  });
}
