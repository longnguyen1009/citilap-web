import { NextResponse } from 'next/server';
import { requireAdminMutation } from '@/lib/auth';
import { mediaEnvironment } from '@/server/media-http';
import {
  archiveCampaign,
  CampaignRevisionConflictError,
} from '@/server/services/campaign.service';

export const runtime = 'edge';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const mutationDenied = requireAdminMutation(request);
  if (mutationDenied) return mutationDenied;

  const { id } = await context.params;

  try {
    const body = (await request.json().catch(() => null)) as { expectedRevision?: number } | null;
    const expectedRevision = body?.expectedRevision;
    if (expectedRevision === undefined || expectedRevision === null) {
      return NextResponse.json(
        { success: false, code: 'MISSING_EXPECTED_REVISION', error: 'expectedRevision là bắt buộc khi lưu trữ chiến dịch.' },
        { status: 400 }
      );
    }
    if (typeof expectedRevision !== 'number' || !Number.isInteger(expectedRevision) || expectedRevision < 0) {
      return NextResponse.json(
        { success: false, code: 'INVALID_EXPECTED_REVISION', error: 'expectedRevision phải là số nguyên không âm.' },
        { status: 400 }
      );
    }

    const env = await mediaEnvironment();
    const archived = await archiveCampaign(id, expectedRevision, env.DB);

    return NextResponse.json({
      success: true,
      data: archived,
    });
  } catch (error) {
    if (error instanceof CampaignValidationError) {
      return NextResponse.json(
        {
          success: false,
          code: error.code,
          field: error.field,
          error: error.message,
        },
        { status: 400 }
      );
    }
    if (error instanceof CampaignRevisionConflictError) {
      return NextResponse.json(
        {
          success: false,
          code: error.code,
          error: error.message,
          currentRevision: error.currentRevision,
          expectedRevision: error.expectedRevision,
        },
        { status: 409 }
      );
    }

    console.error('[AdminCampaignArchiveAPI] POST error:', error);
    const message = error instanceof Error ? error.message : 'Lỗi máy chủ';
    return NextResponse.json(
      { success: false, error: `Không thể lưu trữ chiến dịch: ${message}` },
      { status: 500 }
    );
  }
}
