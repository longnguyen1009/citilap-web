import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { mediaEnvironment } from '@/server/media-http';
import { publicPageBySlug } from '@/server/services/page.service';
import { MediaError } from '@/server/services/media-library.service';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { businessProfile } from '@/config/business-profile';
import PolicyLayout from './PolicyLayout';

async function load(slug: string) {
  const { DB } = await mediaEnvironment();
  try { return await publicPageBySlug(DB, slug); }
  catch (error) {
    if (error instanceof MediaError && error.status === 404) notFound();
    throw error;
  }
}

export async function cmsPolicyMetadata(slug: string): Promise<Metadata> {
  const page = await load(slug);
  return { title: page.seo.title, description: page.seo.description,
    alternates: { canonical: `${businessProfile.canonicalSiteUrl}/${slug}` } };
}

export default async function CmsPolicyPage({ slug }: { slug: string }) {
  const page = await load(slug);
  return <PolicyLayout currentSlug={slug} title={page.title} subtitle={page.seo.description} isPublished
    lastUpdated={new Date(page.updatedAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}>
    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.contentHtml) }} />
  </PolicyLayout>;
}
