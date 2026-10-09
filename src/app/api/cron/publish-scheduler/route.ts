import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/auth";

const hasDatabase = !!process.env.DATABASE_URL;

export async function POST(request: Request) {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  if (!hasDatabase) return NextResponse.json({ success: true, message: "No database configured" });

  try {
    const { prisma } = await import("@/lib/prisma");
    const now = new Date();
    let published = 0;
    let unpublished = 0;

    // Publish products whose publishAt has passed and status is not already active
    const toPublish = await prisma.product.findMany({
      where: {
        publishAt: { not: null, lte: now },
        status: "draft",
      },
      select: { id: true },
      take: 100,
    });

    if (toPublish.length > 0) {
      const ids = toPublish.map((p) => p.id);
      await prisma.product.updateMany({ where: { id: { in: ids } }, data: { status: "active" } });
      published = ids.length;
      console.log(`[Scheduler] Published ${published} products`);
    }

    // Unpublish products whose unpublishAt has passed and status is still active
    const toUnpublish = await prisma.product.findMany({
      where: {
        unpublishAt: { not: null, lte: now },
        status: "active",
      },
      select: { id: true },
      take: 100,
    });

    if (toUnpublish.length > 0) {
      const ids = toUnpublish.map((p) => p.id);
      await prisma.product.updateMany({ where: { id: { in: ids } }, data: { status: "archived" } });
      unpublished = ids.length;
      console.log(`[Scheduler] Unpublished ${unpublished} products`);
    }

    // Clean up old versions (keep last 10 per product)
    const productIds = await prisma.productVersion.findMany({ select: { productId: true }, distinct: ["productId"] });
    let cleanedVersions = 0;
    for (const { productId } of productIds) {
      const count = await prisma.productVersion.count({ where: { productId } });
      if (count > 10) {
        const oldVersions = await prisma.productVersion.findMany({
          where: { productId },
          orderBy: { version: "desc" },
          skip: 10,
          select: { id: true },
        });
        if (oldVersions.length > 0) {
          await prisma.productVersion.deleteMany({ where: { id: { in: oldVersions.map((v) => v.id) } } });
          cleanedVersions += oldVersions.length;
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      published,
      unpublished,
      cleanedVersions,
    });
  } catch (error) {
    console.error("[Scheduler] Error:", error);
    return NextResponse.json({ success: false, error: "Scheduler failed" }, { status: 500 });
  }
}
