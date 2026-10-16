import { NextResponse } from 'next/server';
import { requireAdmin, requireAdminMutation } from '@/lib/auth';
import { mediaEnvironment } from '@/server/media-http';
import {
  listCampaigns,
  saveCampaign,
  CampaignConflictError,
  CampaignRevisionConflictError,
  CampaignValidationError,
} from '@/server/services/campaign.service';
import { campaignDocumentSchema } from '@/contracts/cms/campaign';
import { ZodError } from 'zod';

export const runtime = 'edge';

export async function GET(request: Request) {
  const authDenied = requireAdmin(request);
  if (authDenied) return authDenied;

  try {
    const env = await mediaEnvironment();
    const campaigns = await listCampaigns(env.DB);
    return NextResponse.json({
      success: true,
      data: campaigns,
    });
  } catch (error) {
    console.error('[AdminCampaignsAPI] GET error:', error);
    const message = error instanceof Error ? error.message : 'Lỗi máy chủ';
    return NextResponse.json(
      { success: false, error: `Không thể đọc danh sách chiến dịch: ${message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const mutationDenied = requireAdminMutation(request);
  if (mutationDenied) return mutationDenied;

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu yêu cầu không hợp lệ (cần JSON object).' },
        { status: 400 }
      );
    }

    const env = await mediaEnvironment();
    const created = await saveCampaign(body as any, env.DB);

    return NextResponse.json(
      {
        success: true,
        data: created,
      },
      { status: 201 }
    );
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

    console.error('[AdminCampaignsAPI] POST error:', error);
    const message = error instanceof Error ? error.message : 'Lỗi máy chủ';
    return NextResponse.json(
      { success: false, error: `Không thể tạo chiến dịch: ${message}` },
      { status: 500 }
    );
  }
}
