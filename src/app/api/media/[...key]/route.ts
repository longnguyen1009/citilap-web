import { NextResponse } from 'next/server';
import { getMediaObject, headMediaObject } from '@/infra/cloudflare/r2/storage';
import { isAdminRequest } from '@/lib/auth';

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg']);
const ALLOWED_PUBLIC_PREFIXES = ['products/', 'brand/', 'categories/'];
const ALLOWED_TEMP_PREFIXES = ['tmp/products/'];

async function validateMediaKey(keySegments: string[], request: Request): Promise<{ valid: boolean; r2Key?: string; error?: string; status?: number }> {
  if (!keySegments || keySegments.length === 0) {
    return { valid: false, error: 'Key not provided', status: 400 };
  }

  // Check for path traversal or invalid characters in any segment
  for (const segment of keySegments) {
    if (
      segment === '..' ||
      segment.includes('..') ||
      segment.includes('\\') ||
      segment.startsWith('.') ||
      segment.toLowerCase().includes('%2e')
    ) {
      return { valid: false, error: 'Path traversal or invalid characters detected', status: 400 };
    }
  }

  const r2Key = keySegments.join('/');

  // Prefix check: only public media prefixes are exposed without authentication
  const hasPublicPrefix = ALLOWED_PUBLIC_PREFIXES.some((prefix) => r2Key.startsWith(prefix));
  if (!hasPublicPrefix) {
    const hasTempPrefix = ALLOWED_TEMP_PREFIXES.some((prefix) => r2Key.startsWith(prefix));
    if (hasTempPrefix) {
      // Temporary/unapproved media requires authenticated admin session
      if (!(await isAdminRequest(request))) {
        return { valid: false, error: 'Temporary media preview requires admin authentication', status: 403 };
      }
    } else {
      return { valid: false, error: 'Access to requested media namespace is forbidden', status: 403 };
    }
  }

  // Extension check
  const lastSegment = keySegments[keySegments.length - 1].toLowerCase();
  const hasValidExt = Array.from(ALLOWED_EXTENSIONS).some((ext) => lastSegment.endsWith(ext));
  if (!hasValidExt) {
    return { valid: false, error: 'Unsupported media file type', status: 415 };
  }

  return { valid: true, r2Key };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await params;
    const validation = await validateMediaKey(key, request);
    if (!validation.valid || !validation.r2Key) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: validation.status || 400 }
      );
    }

    const r2Key = validation.r2Key;
    let object = null;
    try {
      object = await getMediaObject(r2Key);
    } catch {
      // Fallback in Node.js development server where Cloudflare R2 binding is not injected
      try {
        const { prisma } = await import('@/lib/prisma');
        const imgMeta = await prisma.productImage.findFirst({
          where: { r2Key },
          select: { url: true },
        });
        if (imgMeta?.url && (imgMeta.url.startsWith('http://') || imgMeta.url.startsWith('https://'))) {
          return NextResponse.redirect(imgMeta.url, 307);
        }
      } catch {}
      return NextResponse.json({ success: false, error: 'Media not found' }, { status: 404 });
    }

    if (!object) {
      return NextResponse.json({ success: false, error: 'Media not found' }, { status: 404 });
    }

    const headers = new Headers();
    if (object.httpMetadata?.contentType) {
      headers.set('Content-Type', object.httpMetadata.contentType);
    } else {
      headers.set('Content-Type', 'image/webp');
    }

    headers.set('Content-Length', String(object.size));
    if (object.httpEtag) {
      headers.set('ETag', object.httpEtag);
    }
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('X-Content-Type-Options', 'nosniff');

    // Conditional request: If-None-Match check
    const clientEtag = request.headers.get('if-none-match');
    if (clientEtag && object.httpEtag && clientEtag === object.httpEtag) {
      return new Response(null, { status: 304, headers });
    }

    // Cast object.body stream to BodyInit
    return new Response(object.body as unknown as ReadableStream, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error serving media from R2:', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve media' }, { status: 500 });
  }
}

export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await params;
    const validation = await validateMediaKey(key, request);
    if (!validation.valid || !validation.r2Key) {
      return new Response(null, { status: validation.status || 400 });
    }

    const r2Key = validation.r2Key;
    let object = null;
    try {
      object = await headMediaObject(r2Key);
    } catch {
      try {
        const { prisma } = await import('@/lib/prisma');
        const imgMeta = await prisma.productImage.findFirst({
          where: { r2Key },
          select: { url: true },
        });
        if (imgMeta?.url) {
          return new Response(null, { status: 200, headers: { 'Content-Type': 'image/webp', 'X-Content-Type-Options': 'nosniff' } });
        }
      } catch {}
      return new Response(null, { status: 404 });
    }

    if (!object) {
      return new Response(null, { status: 404 });
    }

    const headers = new Headers();
    if (object.httpMetadata?.contentType) {
      headers.set('Content-Type', object.httpMetadata.contentType);
    } else {
      headers.set('Content-Type', 'image/webp');
    }
    headers.set('Content-Length', String(object.size));
    if (object.httpEtag) {
      headers.set('ETag', object.httpEtag);
    }
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('X-Content-Type-Options', 'nosniff');

    return new Response(null, { status: 200, headers });
  } catch (error) {
    console.error('Error in HEAD media from R2:', error);
    return new Response(null, { status: 500 });
  }
}
