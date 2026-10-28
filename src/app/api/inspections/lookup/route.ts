import { NextResponse } from 'next/server';
import { mediaEnvironment } from '@/server/media-http';
import { lookupPublicInspectionByCode } from '@/server/services/inspection.service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = (searchParams.get('code') || '').trim();

    if (!/^[a-zA-Z0-9_-]{2,64}$/.test(code)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Mã kiểm định công khai không hợp lệ (2–64 ký tự chữ, số, gạch ngang).',
        },
        {
          status: 400,
          headers: { 'Cache-Control': 'private, no-store, no-cache, must-revalidate' },
        }
      );
    }

    const { DB } = await mediaEnvironment();
    const report = await lookupPublicInspectionByCode(DB, code);

    if (!report) {
      return NextResponse.json(
        {
          success: false,
          error: 'Không tìm thấy hồ sơ kiểm định công khai khớp với mã này.',
        },
        {
          status: 404,
          headers: { 'Cache-Control': 'private, no-store, no-cache, must-revalidate' },
        }
      );
    }

    return NextResponse.json(
      { success: true, data: report },
      {
        headers: { 'Cache-Control': 'private, no-store, no-cache, must-revalidate' },
      }
    );
  } catch (error) {
    console.error('[GET /api/inspections/lookup] Failed:', error);
    return NextResponse.json(
      { success: false, error: 'Không thể truy vấn dữ liệu kiểm định lúc này.' },
      { status: 500 }
    );
  }
}

