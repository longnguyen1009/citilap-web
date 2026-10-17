import { withAdminContext } from '@/server/admin-request-context';
import { NextResponse } from 'next/server';
import { requireAdmin, requireAdminMutation } from '@/lib/auth';
import { mediaEnvironment } from '@/server/media-http';
import {
  getCampaignById,
  saveCampaign,
  archiveCampaign,
  CampaignConflictError,
  CampaignRevisionConflictError,
  CampaignValidationError,
} from '@/server/services/campaign.service';
import { ZodError } from 'zod';

export const runtime = 'edge';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function GETHandler(request: Request, context: RouteContext) {
  const authDenied = await requireAdmin(request);
  if (authDenied) return authDenied;

  const { id } = await context.params;

  try {
    const env = await mediaEnvironment();
    const campaign = await getCampaignById(id, env.DB);

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy chiến dịch.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    console.error('[AdminCampaignDetailAPI] GET error:', error);
    const message = error instanceof Error ? error.message : 'Lỗi máy chủ';
    return NextResponse.json(
      { success: false, error: `Không thể đọc chiến dịch: ${message}` },
      { status: 500 }
    );
  }
}

async function PUTHandler(request: Request, context: RouteContext) {
  const mutationDenied = await requireAdminMutation(request);
  if (mutationDenied) return mutationDenied;

  const { id } = await context.params;

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu yêu cầu không hợp lệ (cần JSON object).' },
        { status: 400 }
      );
    }

    const env = await mediaEnvironment();
    const expectedRevision = body.expectedRevision;
    if (expectedRevision === undefined || expectedRevision === null) {
      return NextResponse.json(
        { success: false, code: 'MISSING_EXPECTED_REVISION', error: 'expectedRevision là bắt buộc khi cập nhật chiến dịch.' },
        { status: 400 }
      );
    }
    if (typeof expectedRevision !== 'number' || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
      return NextResponse.json(
        { success: false, code: 'INVALID_EXPECTED_REVISION', error: 'expectedRevision phải là số nguyên không âm.' },
        { status: 400 }
      );
    }

    const updated = await saveCampaign(
      {
        ...body,
        id,
        expectedRevision,
      } as any,
      env.DB
    );

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dữ liệu chiến dịch không hợp lệ.',
          details: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        },
        { status: 400 }
      );
    }

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

    console.error('[AdminCampaignDetailAPI] PUT error:', error);
    const message = error instanceof Error ? error.message : 'Lỗi máy chủ';
    return NextResponse.json(
      { success: false, error: `Không thể cập nhật chiến dịch: ${message}` },
      { status: 500 }
    );
  }
}

async function DELETEHandler(request: Request, context: RouteContext) {
  const mutationDenied = await requireAdminMutation(request);
  if (mutationDenied) return mutationDenied;

  const { id } = await context.params;

  try {
    const url = new URL(request.url);
    const qRev = url.searchParams.get('expectedRevision');
    const ifMatch = request.headers.get('if-match');
    let expectedRevision: number | undefined;

    if (qRev !== null) {
      const parsed = Number(qRev);
      if (/^(0|[1-9]\d*)$/.test(qRev) && Number.isSafeInteger(parsed)) expectedRevision = parsed;
      else {
        return NextResponse.json(
          { success: false, code: 'INVALID_EXPECTED_REVISION', error: 'expectedRevision phải là số nguyên không âm.' },
          { status: 400 }
        );
      }
    } else if (ifMatch) {
      const revisionText = /^(?:"(0|[1-9]\d*)"|(0|[1-9]\d*))$/.exec(ifMatch);
      const parsed = Number(revisionText?.[1] ?? revisionText?.[2]);
      if (revisionText && Number.isSafeInteger(parsed)) expectedRevision = parsed;
      else {
        return NextResponse.json(
          { success: false, code: 'INVALID_EXPECTED_REVISION', error: 'If-Match revision phải là số nguyên không âm.' },
          { status: 400 }
        );
      }
    } else {
      const body = (await request.json().catch(() => null)) as { expectedRevision?: number } | null;
      if (typeof body?.expectedRevision === 'number' && Number.isSafeInteger(body.expectedRevision) && body.expectedRevision >= 0) {
        expectedRevision = body.expectedRevision;
      }
    }

    if (expectedRevision === undefined) {
      return NextResponse.json(
        { success: false, code: 'MISSING_EXPECTED_REVISION', error: 'expectedRevision là bắt buộc khi lưu trữ chiến dịch (qua query param, header If-Match, hoặc JSON body).' },
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

    console.error('[AdminCampaignDetailAPI] DELETE error:', error);
    const message = error instanceof Error ? error.message : 'Lỗi máy chủ';
    return NextResponse.json(
      { success: false, error: `Không thể lưu trữ chiến dịch: ${message}` },
      { status: 500 }
    );
  }
}

export const GET = withAdminContext(GETHandler);
export const PUT = withAdminContext(PUTHandler);
export const DELETE = withAdminContext(DELETEHandler);
