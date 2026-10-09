import { NextResponse } from 'next/server';
import { requireAdminMutation } from '@/lib/auth';
import {
  detectImageSignature,
  extractImageDimensions,
  generateProductMediaKey,
  generateTempMediaKey,
  getPublicMediaUrl,
  putMediaObject,
  deleteMediaObject,
} from '@/infra/cloudflare/r2/storage';
import { randomBytes } from 'node:crypto';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB per image
const MAX_FILES_PER_REQUEST = 10;
const MAX_TOTAL_SIZE = 25 * 1024 * 1024; // 25MB total
const MAX_PIXELS = 40_000_000;

export interface UploadedImageResult {
  id?: string;
  r2Key: string;
  url: string;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  isPrimary?: boolean;
}

export async function POST(request: Request) {
  const denied = requireAdminMutation(request);
  if (denied) return denied;

  try {
    const formData = await request.formData();
    const entries = formData.getAll('file');
    const files = entries.filter((e): e is File => e instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: 'Không có file', code: 'NO_FILE' }, { status: 400 });
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        {
          success: false,
          error: `Tối đa ${MAX_FILES_PER_REQUEST} file mỗi lần tải lên`,
          code: 'TOO_MANY_FILES',
        },
        { status: 400 }
      );
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tổng dung lượng vượt quá 25MB',
          code: 'TOTAL_SIZE_EXCEEDED',
        },
        { status: 400 }
      );
    }

    // Optional context from client
    const productId = formData.get('productId') ? String(formData.get('productId')).trim() : null;
    const variantId = formData.get('variantId') ? String(formData.get('variantId')).trim() : null;
    const altText = formData.get('alt') ? String(formData.get('alt')).trim() : null;
    const requestedPrimary = formData.get('isPrimary') === 'true';

    const uploaded: UploadedImageResult[] = [];
    const failed: Array<{ name: string; reason: string; code: string }> = [];
    const uploadBatchId = randomBytes(8).toString('hex');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // 1. File size check
      if (file.size === 0 || file.size > MAX_SIZE) {
        failed.push({
          name: file.name,
          reason: 'File vượt quá dung lượng tối đa 5MB hoặc rỗng',
          code: 'FILE_TOO_LARGE',
        });
        continue;
      }

      // 2. Read array buffer
      const buffer = Buffer.from(await file.arrayBuffer());

      // 3. Magic bytes / Content signature validation
      const detected = detectImageSignature(buffer);
      if (!detected) {
        failed.push({
          name: file.name,
          reason: 'Chỉ chấp nhận ảnh JPEG, PNG, WebP hợp lệ',
          code: 'INVALID_FILE_SIGNATURE',
        });
        continue;
      }

      // 4. Dimension checks
      const dimensions = extractImageDimensions(buffer, detected.ext);
      if (
        dimensions &&
        (dimensions.width < 1 || dimensions.height < 1 || dimensions.width * dimensions.height > MAX_PIXELS)
      ) {
        failed.push({
          name: file.name,
          reason: 'Kích thước điểm ảnh quá lớn (vượt quá 40MP)',
          code: 'DIMENSIONS_TOO_LARGE',
        });
        continue;
      }

      // 5. Generate secure R2 object key
      const r2Key = productId
        ? generateProductMediaKey(productId, detected.ext, variantId || undefined)
        : generateTempMediaKey(uploadBatchId, detected.ext);

      // 6. Upload directly to Cloudflare R2 bucket via Workers binding
      try {
        await putMediaObject(r2Key, buffer, {
          httpMetadata: {
            contentType: detected.mime,
            cacheControl: 'public, max-age=31536000, immutable',
          },
          customMetadata: {
            originalName: file.name.slice(0, 100),
            uploadedAt: new Date().toISOString(),
            size: String(file.size),
            width: dimensions ? String(dimensions.width) : '',
            height: dimensions ? String(dimensions.height) : '',
          },
        });
      } catch (r2Error) {
        console.error('R2 PUT failed for key:', r2Key, r2Error);
        failed.push({
          name: file.name,
          reason: 'Lỗi tải lên Cloudflare R2',
          code: 'R2_PUT_FAILED',
        });
        continue;
      }

      const publicUrl = getPublicMediaUrl(r2Key);
      let d1Id: string | undefined;
      let isPrimaryImage = false;

      // 7. Persist D1 metadata if productId exists
      if (productId) {
        try {
          const { prisma } = await import('@/lib/prisma');

          // Check if product already has primary image
          const existingPrimary = await prisma.productImage.findFirst({
            where: { productId, isPrimary: true },
          });

          isPrimaryImage = requestedPrimary ? true : !existingPrimary && i === 0;

          // If this image is designated as primary and there is an existing primary, unmark previous
          if (isPrimaryImage && existingPrimary) {
            await prisma.productImage.update({
              where: { id: existingPrimary.id },
              data: { isPrimary: false },
            });
          }

          const imageRecord = await prisma.productImage.create({
            data: {
              productId,
              variantId: variantId || null,
              r2Key,
              url: publicUrl,
              mimeType: detected.mime,
              size: file.size,
              width: dimensions?.width || null,
              height: dimensions?.height || null,
              alt: altText || null,
              sortOrder: i,
              isPrimary: isPrimaryImage,
            },
          });

          d1Id = imageRecord.id;
        } catch (d1Error) {
          console.error('D1 metadata insert failed. Performing compensating R2 delete:', r2Key, d1Error);
          // Compensating action: Clean up uploaded R2 object to avoid orphan
          await deleteMediaObject(r2Key).catch((cleanupErr) => {
            console.error('Compensating R2 delete failed:', cleanupErr);
          });

          failed.push({
            name: file.name,
            reason: 'Lỗi ghi nhận metadata vào cơ sở dữ liệu',
            code: 'D1_INSERT_FAILED',
          });
          continue;
        }
      }

      uploaded.push({
        id: d1Id,
        r2Key,
        url: publicUrl,
        mimeType: detected.mime,
        size: file.size,
        width: dimensions?.width || null,
        height: dimensions?.height || null,
        isPrimary: isPrimaryImage,
      });
    }

    if (uploaded.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tất cả file tải lên thất bại',
          failed,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        urls: uploaded.map((u) => u.url),
        url: uploaded[0].url,
        images: uploaded,
        failed,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Upload handler exception:', error);
    return NextResponse.json({ success: false, error: 'Upload thất bại', code: 'UPLOAD_FAILED' }, { status: 500 });
  }
}

/**
 * DELETE /api/upload
 * Safely deletes a media object from R2 and removes/archives its D1 metadata.
 * Requires admin authorization.
 */
export async function DELETE(request: Request) {
  const denied = requireAdminMutation(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    let imageId = searchParams.get('id');
    let tempKey = searchParams.get('key');

    // Also support JSON body
    if (!imageId && !tempKey) {
      try {
        const body = await request.json();
        if (body && typeof body === 'object') {
          imageId = body.id || null;
          tempKey = body.key || null;
        }
      } catch {
        // Body was empty or not JSON
      }
    }

    // 1. Delete by ProductImage ID (canonical flow)
    if (imageId) {
      const { prisma } = await import('@/lib/prisma');
      const img = await prisma.productImage.findUnique({
        where: { id: imageId },
      });

      if (!img) {
        return NextResponse.json({ success: false, error: 'Không tìm thấy ảnh', code: 'IMAGE_NOT_FOUND' }, { status: 404 });
      }

      // Delete from Cloudflare R2
      await deleteMediaObject(img.r2Key);

      // Delete from D1
      await prisma.productImage.delete({
        where: { id: imageId },
      });

      // If the deleted image was primary, promote the next image of the product to primary
      if (img.isPrimary) {
        const nextImg = await prisma.productImage.findFirst({
          where: { productId: img.productId },
          orderBy: { sortOrder: 'asc' },
        });
        if (nextImg) {
          await prisma.productImage.update({
            where: { id: nextImg.id },
            data: { isPrimary: true },
          });
        }
      }

      return NextResponse.json({ success: true, message: 'Đã xóa ảnh thành công' });
    }

    // 2. Delete temporary uncommitted upload (strictly restricted to tmp/products/ namespace)
    if (tempKey) {
      if (!tempKey.startsWith('tmp/products/')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Không được phép xóa khóa ngoài phạm vi tạm thời',
            code: 'FORBIDDEN_KEY',
          },
          { status: 403 }
        );
      }

      await deleteMediaObject(tempKey);
      return NextResponse.json({ success: true, message: 'Đã xóa file tạm thành công' });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Cần cung cấp id ảnh hoặc key tạm thời',
        code: 'MISSING_PARAM',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Delete media failed:', error);
    return NextResponse.json({ success: false, error: 'Xóa ảnh thất bại', code: 'DELETE_FAILED' }, { status: 500 });
  }
}

/**
 * PATCH /api/upload
 * Sets a specific image as the primary image of its product.
 * Requires admin authorization.
 */
export async function PATCH(request: Request) {
  const denied = requireAdminMutation(request);
  if (denied) return denied;

  try {
    const data = await request.json();
    const { imageId, productId } = data || {};

    if (!imageId || !productId) {
      return NextResponse.json({ success: false, error: 'Thiếu imageId hoặc productId' }, { status: 400 });
    }

    const { prisma } = await import('@/lib/prisma');

    // Unmark existing primaries for this product
    await prisma.productImage.updateMany({
      where: { productId, isPrimary: true },
      data: { isPrimary: false },
    });

    // Mark target image as primary
    await prisma.productImage.update({
      where: { id: imageId },
      data: { isPrimary: true },
    });

    return NextResponse.json({ success: true, message: 'Đã đặt làm ảnh chính' });
  } catch (error) {
    console.error('Set primary image failed:', error);
    return NextResponse.json({ success: false, error: 'Cập nhật thất bại' }, { status: 500 });
  }
}
