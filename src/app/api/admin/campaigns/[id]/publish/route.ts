import { withAdminContext } from '@/server/admin-request-context';
import { NextResponse } from 'next/server';
import { requireAdminMutation } from '@/lib/auth';
import { mediaEnvironment } from '@/server/media-http';
import {
  publishCampaign,
  CampaignConflictError,
  CampaignRevisionConflictError,
  CampaignValidationError,
} from '@/server/services/campaign.service';

export const runtime = 'edge';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function POSTHandler(request: Request, context: RouteContext) {
  const mutationDenied = await requireAdminMutation(request);
  if (mutationDenied) return mutationDenied;

  const { id } = await context.params;

  try {
    const body = (await request.json().catch(() => null)) as { expectedRevision?: number } | null;
    const expectedRevision = body?.expectedRevision;
    if (expectedRevision === undefined || expectedRevision === null) {
      return NextResponse.json(
        { success: false, code: 'MISSING_EXPECTED_REVISION', error: 'expectedRevision là bắt buộc khi xuất bản chiến dịch.' },
        { status: 400 }
      );
    }
    if (typeof expectedRevision !== 'number' || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
      return NextResponse.json(
        { success: false, code: 'INVALID_EXPECTED_REVISION', error: 'expectedRevision phải là số nguyên không âm.' },
        { status: 400 }
      );
    }

    const env = await mediaEnvironment();
    const published = await publishCampaign(id, expectedRevision, env.DB);

    return NextResponse.json({
      success: true,
      data: published,
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

    if (error instanceof CampaignConflictError) {
      return NextResponse.json(
        {
          success: false,
          code: error.code,
          error: error.message,
          conflictingCampaignId: error.conflictingCampaignId,
          conflictingCampaignName: error.conflictingCampaignName,
          productId: error.productId,
          variantId: error.variantId,
        },
        { status: 409 }
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

    console.error('[AdminCampaignPublishAPI] POST error:', error);
    const message = error instanceof Error ? error.message : 'Lỗi máy chủ';
    return NextResponse.json(
      { success: false, error: `Không thể xuất bản chiến dịch: ${message}` },
      { status: 500 }
    );
  }
}

export const POST = withAdminContext(POSTHandler);
