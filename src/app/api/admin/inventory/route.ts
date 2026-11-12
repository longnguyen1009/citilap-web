import { NextResponse } from 'next/server';
import { withAdminContext } from '@/server/admin-request-context';
import { requireAdmin, requireAdminMutation } from '@/lib/auth';
import { mediaEnvironment } from '@/server/media-http';
import { MediaError } from '@/server/services/media-library.service';
import { validateSerialStateTransition, type SerialUnitStatus } from '@/server/services/inventory.service';
import { adminAuditStatements } from '@/server/admin-context';
import { z } from 'zod';

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
         LIMIT 200`
      )
      .all();

    const variantsRes = await db
      .prepare(
        `SELECT id, productId, sku, name, price
         FROM ProductVariant
         WHERE status = 'ACTIVE'
         ORDER BY createdAt ASC`
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
          variants: variantsRes.results || [],
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
      const input = z.object({
        productId: z.string().trim().min(1).max(200), warehouseId: z.string().trim().min(1).max(200),
        serialNumber: z.string().trim().min(1).max(200).transform(value => value.toUpperCase()),
        condition: z.enum(['NEW', 'LIKE_NEW', 'USED', 'OPEN_BOX', 'REFURBISHED']).default('LIKE_NEW'),
        status: z.enum(['AVAILABLE', 'QC_HOLD']).default('AVAILABLE'), warrantyMonths: z.number().int().min(0).max(120).default(12),
        batteryHealth: z.number().int().min(0).max(100).nullable().default(null),
        publicCode: z.string().trim().max(100).transform(value => value.toUpperCase()).default(''),
        appearance: z.string().trim().max(2000).default(''), checks: z.string().trim().max(5000).default(''),
        notes: z.string().trim().max(5000).nullable().default(null), variantId: z.string().trim().max(200).nullish(),
      }).safeParse(body);
      if (!input.success) throw new MediaError(input.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; '), 400);
      const { productId, warehouseId, serialNumber, condition, status, warrantyMonths, batteryHealth, publicCode, appearance, checks, notes } = input.data;
      if (!await db.prepare("SELECT id FROM Product WHERE id=? AND deletedAt IS NULL AND status IN ('ACTIVE','DRAFT')").bind(productId).first()) throw new MediaError('Sản phẩm không còn khả dụng.', 400);
      if (!await db.prepare("SELECT id FROM Warehouse WHERE id=? AND status='ACTIVE'").bind(warehouseId).first()) throw new MediaError('Kho không còn hoạt động.', 400);

      const requestedVariantId = input.data.variantId || '';
      const variantRow = requestedVariantId
        ? await db
            .prepare(`SELECT id FROM ProductVariant WHERE id = ? AND productId = ? AND status='ACTIVE' LIMIT 1`)
            .bind(requestedVariantId, productId)
            .first<{ id: string }>()
        : await db
            .prepare(`SELECT id FROM ProductVariant WHERE productId = ? AND status='ACTIVE' ORDER BY createdAt ASC LIMIT 1`)
            .bind(productId)
            .first<{ id: string }>();
      if (requestedVariantId && !variantRow) throw new MediaError('Biến thể không thuộc sản phẩm hoặc đã ngừng bán.', 400);

      const serialId = 'su-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
      const createGuard = crypto.randomUUID();
      const stmts = [
        db.prepare(`INSERT INTO AdminMutationGuard(id,allowed) SELECT ?,CASE WHEN
          EXISTS(SELECT 1 FROM Product WHERE id=? AND deletedAt IS NULL AND status IN ('ACTIVE','DRAFT')) AND
          EXISTS(SELECT 1 FROM Warehouse WHERE id=? AND status='ACTIVE') AND
          (? IS NULL OR EXISTS(SELECT 1 FROM ProductVariant WHERE id=? AND productId=? AND status='ACTIVE'))
          THEN 1 ELSE 0 END`).bind(createGuard, productId, warehouseId, variantRow?.id || null, variantRow?.id || null, productId),
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
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`
            )
            .bind(
              serialId,
              publicCode,
              nowIso,
              batteryHealth,
              appearance,
              checks,
              '',
              `Bảo hành ${warrantyMonths} tháng tại CitiLap, lỗi 1 đổi 1 trong 7 ngày đầu tiên`,
              nowIso
            )
        );
      }

      await db.batch([...stmts, ...adminAuditStatements(db, 'inventory.create', serialId, 'Nhập serial vào kho'), db.prepare('DELETE FROM AdminMutationGuard WHERE id=?').bind(createGuard)]);
      return NextResponse.json({ success: true, id: serialId });
    }

    if (action === 'UPDATE_SERIAL_STATUS') {
      const serialId = String(body.id || '').trim();
      const status = String(body.status || '').trim();
      if (!serialId || !['AVAILABLE', 'QC_HOLD', 'REPAIR', 'DAMAGED'].includes(status)) {
        return NextResponse.json({ success: false, error: 'Trạng thái Serial không hợp lệ.' }, { status: 400 });
      }
      const current = await db.prepare('SELECT status,updatedAt FROM SerialUnit WHERE id=?').bind(serialId).first<{ status: SerialUnitStatus; updatedAt: string }>();
      if (!current) throw new MediaError('Không tìm thấy serial.', 404);
      if (typeof body.expectedUpdatedAt !== 'string' || body.expectedUpdatedAt !== current.updatedAt) throw new MediaError('Serial đã thay đổi. Tải lại dữ liệu kho.', 409);
      if (!['AVAILABLE', 'QC_HOLD', 'REPAIR', 'DAMAGED', 'RETURNED'].includes(current.status) || current.status === status || !validateSerialStateTransition(current.status, status as SerialUnitStatus)) throw new MediaError('Chuyển trạng thái này phải qua quy trình đơn hàng hoặc đổi trả.', 409);
      const guard = crypto.randomUUID();
      try {
        await db.batch([
          db.prepare(`INSERT INTO AdminMutationGuard(id,allowed) SELECT ?,CASE WHEN EXISTS(
            SELECT 1 FROM SerialUnit su WHERE su.id=? AND su.status=? AND su.updatedAt=? AND su.allocatedReference IS NULL
            AND NOT EXISTS(SELECT 1 FROM OrderItem oi JOIN [Order] o ON o.id=oi.orderId WHERE oi.serialUnitId=su.id AND o.status!='CANCELLED')
            AND NOT EXISTS(SELECT 1 FROM InventoryReservation ir WHERE ir.serialUnitId=su.id AND ir.status='ACTIVE' AND ir.expiresAt>?)
          ) THEN 1 ELSE 0 END`).bind(guard, serialId, current.status, body.expectedUpdatedAt, nowIso),
          db.prepare('UPDATE SerialUnit SET status=?,updatedAt=? WHERE id=?').bind(status, nowIso, serialId),
          ...adminAuditStatements(db, 'inventory.status', serialId, `${current.status} → ${status}`),
          db.prepare('DELETE FROM AdminMutationGuard WHERE id=?').bind(guard),
        ]);
      } catch (error) {
        if (error instanceof Error && /CHECK constraint failed/.test(error.message)) throw new MediaError('Serial đang được giữ hoặc đã thay đổi. Tải lại dữ liệu kho.', 409);
        throw error;
      }
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
    if (error instanceof MediaError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ success: false, error: 'JSON không hợp lệ.' }, { status: 400 });
    if (error instanceof Error && /UNIQUE constraint|CHECK constraint/.test(error.message)) return NextResponse.json({ success: false, error: 'Dữ liệu vừa thay đổi hoặc mã Serial/Public Code đã tồn tại. Tải lại và kiểm tra.' }, { status: 409 });
    console.error('[POST /api/admin/inventory] Failed:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi cập nhật dữ liệu kho & serial (kiểm tra trùng mã Serial hoặc Public Code).' },
      { status: 500 }
    );
  }
}

export const GET = withAdminContext(GETHandler);
export const POST = withAdminContext(POSTHandler);
