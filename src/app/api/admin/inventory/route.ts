import { NextResponse } from 'next/server';
import { withAdminContext } from '@/server/admin-request-context';
import { requireAdmin, requireAdminMutation } from '@/lib/auth';
import { mediaEnvironment } from '@/server/media-http';

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
};

async function GETHandler(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const { DB: db } = await mediaEnvironment();
    const { searchParams } = new URL(request.url);
    const warehouseFilter = searchParams.get('warehouseId') || '';
    const statusFilter = searchParams.get('status') || '';
    const search = (searchParams.get('q') || '').trim();

    const warehousesRes = await db
      .prepare(
        `SELECT w.id, w.code, w.name, w.status, w.address, w.sortOrder,
                (SELECT COUNT(*) FROM SerialUnit su WHERE su.warehouseId = w.id AND su.status = 'AVAILABLE') as availableSerials,
                (SELECT COUNT(*) FROM SerialUnit su WHERE su.warehouseId = w.id) as totalSerials,
                (SELECT COALESCE(SUM(ib.onHand), 0) FROM InventoryBalance ib WHERE ib.warehouseId = w.id) as totalOnHand
         FROM Warehouse w
         ORDER BY w.sortOrder ASC, w.name ASC`
      )
      .all();

    let serialSql = `
      SELECT u.id, u.productId, u.variantId, u.warehouseId, u.serialNumber, u.condition, u.status,
             u.costPrice, u.warrantyMonths, u.notes, u.receivedAt, u.updatedAt,
             p.name as productName, p.slug as productSlug, p.brand as productBrand,
             w.name as warehouseName, w.code as warehouseCode,
             i.publicCode, i.batteryHealth, i.appearance, i.checks, i.limitations, i.warranty as inspectionWarranty, i.published as inspectionPublished
      FROM SerialUnit u
      JOIN Product p ON p.id = u.productId
      JOIN Warehouse w ON w.id = u.warehouseId
      LEFT JOIN ProductInspection i ON i.serialUnitId = u.id
      WHERE 1=1
    `;
    const binds: unknown[] = [];

    if (warehouseFilter && warehouseFilter !== 'ALL') {
      serialSql += ` AND u.warehouseId = ?`;
      binds.push(warehouseFilter);
    }
    if (statusFilter && statusFilter !== 'ALL') {
      serialSql += ` AND u.status = ?`;
      binds.push(statusFilter);
    }
    if (search) {
      serialSql += ` AND (u.serialNumber LIKE ? OR p.name LIKE ? OR i.publicCode LIKE ?)`;
      const like = `%${search}%`;
      binds.push(like, like, like);
    }
    serialSql += ` ORDER BY u.updatedAt DESC LIMIT 100`;

    const serialsRes = await db
      .prepare(serialSql)
      .bind(...binds)
      .all();

    const balancesRes = await db
      .prepare(
        `SELECT ib.id, ib.warehouseId, ib.productId, ib.variantId, ib.onHand, ib.reserved, ib.updatedAt,
                p.name as productName, p.slug as productSlug, p.stock as productStock,
                v.sku as variantSku, v.name as variantName,
                w.name as warehouseName, w.code as warehouseCode
         FROM InventoryBalance ib
         JOIN Product p ON p.id = ib.productId
         LEFT JOIN ProductVariant v ON v.id = ib.variantId
         JOIN Warehouse w ON w.id = ib.warehouseId
         ORDER BY ib.onHand ASC, p.name ASC
         LIMIT 100`
      )
      .all();

    const productsRes = await db
      .prepare(
        `SELECT id, name, slug, condition, warranty
         FROM Product
         WHERE deletedAt IS NULL AND status IN ('ACTIVE', 'DRAFT')
         ORDER BY name ASC
         LIMIT 100`
      )
      .all();

    return NextResponse.json(
      {
        success: true,
        data: {
          warehouses: warehousesRes.results || [],
          serialUnits: serialsRes.results || [],
          balances: balancesRes.results || [],
          products: productsRes.results || [],
        },
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error('[GET /api/admin/inventory] Failed:', error);
    return NextResponse.json(
      { success: false, error: 'Không thể tải dữ liệu kho & serial.' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

async function POSTHandler(request: Request) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;

  try {
    const { DB: db } = await mediaEnvironment();
    const body = await request.json();
    const action = body?.action;
    const nowIso = new Date().toISOString();

    if (action === 'CREATE_SERIAL') {
      const productId = String(body.productId || '').trim();
      const warehouseId = String(body.warehouseId || '').trim();
      const serialNumber = String(body.serialNumber || '').trim().toUpperCase();
      const condition = String(body.condition || 'LIKE_NEW').trim();
      const status = String(body.status || 'AVAILABLE').trim();
      const warrantyMonths = Number(body.warrantyMonths || 12);
      const notes = String(body.notes || '').trim() || null;
      const publicCode = String(body.publicCode || '').trim().toUpperCase();
      const rawBattery = Number(body.batteryHealth);
      const batteryHealth = Number.isFinite(rawBattery) ? Math.min(100, Math.max(0, Math.round(rawBattery))) : 97;
      const appearance = String(body.appearance || 'Đẹp 99% Like New, vỏ nguyên bản, không cấn móp').trim();
      const checks = String(
        body.checks ||
          'Đã vượt qua 12 bước kiểm định phần cứng CitiLap: Màn hình, Bàn phím, Cổng kết nối, Tản nhiệt, SSD, RAM, Wifi/Bluetooth, Loa, Webcam, Touchpad, Pin, Sạc zin.'
      ).trim();

      if (!productId || !warehouseId || !serialNumber) {
        return NextResponse.json(
          { success: false, error: 'Vui lòng chọn sản phẩm, kho hàng và nhập mã Serial/Service Tag.' },
          { status: 400 }
        );
      }

      const variantRow = await db
        .prepare(`SELECT id FROM ProductVariant WHERE productId = ? ORDER BY createdAt ASC LIMIT 1`)
        .bind(productId)
        .first<{ id: string }>();

      const serialId = 'su-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
      const stmts = [
        db
          .prepare(
            `INSERT INTO SerialUnit (id, productId, variantId, warehouseId, serialNumber, condition, status, warrantyMonths, notes, receivedAt, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            serialId,
            productId,
            variantRow?.id || null,
            warehouseId,
            serialNumber,
            condition,
            status,
            warrantyMonths,
            notes,
            nowIso,
            nowIso,
            nowIso
          ),
      ];

      if (publicCode) {
        stmts.push(
          db
            .prepare(
              `INSERT INTO ProductInspection (serialUnitId, publicCode, checkedAt, batteryHealth, appearance, checks, limitations, warranty, published, isDemo, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)`
            )
            .bind(
              serialId,
              publicCode,
              nowIso,
              batteryHealth,
              appearance,
              checks,
              'Không có lỗi phần cứng; ngoại hình đạt chuẩn CitiLap tuyển chọn.',
              `Bảo hành ${warrantyMonths} tháng tại CitiLap, lỗi 1 đổi 1 trong 7 ngày đầu tiên`,
              nowIso
            )
        );
      }

      await db.batch(stmts);
      return NextResponse.json({ success: true, id: serialId });
    }

    if (action === 'UPDATE_SERIAL_STATUS') {
      const serialId = String(body.id || '').trim();
      const status = String(body.status || '').trim();
      if (!serialId || !['AVAILABLE', 'RESERVED', 'SOLD', 'QC_HOLD', 'REPAIR'].includes(status)) {
        return NextResponse.json({ success: false, error: 'Trạng thái Serial không hợp lệ.' }, { status: 400 });
      }
      await db
        .prepare(`UPDATE SerialUnit SET status = ?, updatedAt = ? WHERE id = ?`)
        .bind(status, nowIso, serialId)
        .run();
      return NextResponse.json({ success: true });
    }

    if (action === 'UPDATE_WAREHOUSE') {
      const warehouseId = String(body.id || '').trim();
      const name = String(body.name || '').trim();
      const address = String(body.address || '').trim();
      const status = String(body.status || 'ACTIVE').trim();
      if (!warehouseId || !name) {
        return NextResponse.json({ success: false, error: 'Thông tin kho không hợp lệ.' }, { status: 400 });
      }
      await db
        .prepare(`UPDATE Warehouse SET name = ?, address = ?, status = ?, updatedAt = ? WHERE id = ?`)
        .bind(name, address || null, status, nowIso, warehouseId)
        .run();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Hành động không được hỗ trợ.' }, { status: 400 });
  } catch (error) {
    console.error('[POST /api/admin/inventory] Failed:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi cập nhật dữ liệu kho & serial (kiểm tra trùng mã Serial hoặc Public Code).' },
      { status: 500 }
    );
  }
}

export const GET = withAdminContext(GETHandler);
export const POST = withAdminContext(POSTHandler);
