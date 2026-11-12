import { ZodError } from 'zod';
import { withAdminContext } from '@/server/admin-request-context';
import { mediaAdmin } from '@/server/media-http';
import { getPreviewLandingPage } from '@/server/services/site-builder.service';
import { MediaError } from '@/server/services/media-library.service';
import { landingPageDocumentSchema, type LandingPageDocument } from '@/contracts/cms/site-builder';

type Context = { params: Promise<{ id: string }> };

async function POSTHandler(request: Request, context: Context) {
  const { id } = await context.params;
  return mediaAdmin(request, false, async (env) => {
    let documentOverride: LandingPageDocument | undefined;
    const text = await request.text();
    if (text.trim()) {
      try {
        const body: unknown = JSON.parse(text);
        documentOverride = landingPageDocumentSchema.parse(
          body && typeof body === 'object' && 'document' in body ? body.document : body
        );
      } catch (err: unknown) {
        if (err instanceof ZodError) {
          const issues = err.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          }));
          const formattedIssues = issues
            .map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message))
            .join('; ');
          throw new MediaError(`Cấu trúc trang không hợp lệ: ${formattedIssues}`, 400, issues);
        }
        throw new MediaError('Dữ liệu JSON xem trước không hợp lệ.', 400, [
          { path: '', message: 'Dữ liệu JSON xem trước không hợp lệ.' },
        ]);
      }
    }

    try {
      return await getPreviewLandingPage(env.DB, id, documentOverride);
    } catch (err: unknown) {
      if (err instanceof MediaError || err instanceof ZodError) throw err;
      throw new MediaError('Lỗi máy chủ khi dựng bản xem trước.', 500);
    }
  });
}

export const POST = withAdminContext(POSTHandler);
