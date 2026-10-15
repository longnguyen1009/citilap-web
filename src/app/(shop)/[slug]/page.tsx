import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import PolicyLayout from "@/components/policy/PolicyLayout";
import { mediaEnvironment } from "@/server/media-http";
import { publicPageBySlug } from "@/server/services/page.service";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { businessProfile } from "@/config/business-profile";

interface CustomPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CustomPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const env = await mediaEnvironment();
    const page = await publicPageBySlug(env.DB, slug);
    const title = `${page.seo.title} | ${businessProfile.brandName}`;
    const description = page.seo.description || `Thông tin chính thức từ ${businessProfile.brandName}.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        publishedTime: page.publishedAt,
        modifiedTime: page.updatedAt,
        images: page.seo.ogImageUrl ? [{ url: page.seo.ogImageUrl }] : undefined,
      },
      alternates: {
        canonical: `${businessProfile.canonicalSiteUrl}/${page.slug}`,
      },
    };
  } catch {
    return {
      title: `Trang không tồn tại | ${businessProfile.brandName}`,
    };
  }
}

export default async function CustomCmsPage({ params }: CustomPageProps) {
  const { slug } = await params;

  let env;
  try {
    env = await mediaEnvironment();
  } catch {
    notFound();
  }

  let page;
  try {
    page = await publicPageBySlug(env.DB, slug);
  } catch {
    notFound();
  }

  // Historical alias handling: if the slug accessed matches an old published revision,
  // Next.js App Router permanentRedirect issues HTTP 308
  if (page.slug !== slug) {
    permanentRedirect(`/${encodeURIComponent(page.slug)}`);
  }

  return (
    <PolicyLayout
      currentSlug={page.slug}
      title={page.title}
      subtitle={page.seo.description || undefined}
      isPublished={true}
      lastUpdated={new Date(page.updatedAt).toLocaleDateString("vi-VN")}
    >
      <div
        className="prose prose-sm sm:prose-base max-w-none text-slate-700 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.contentHtml) }}
      />
    </PolicyLayout>
  );
}
