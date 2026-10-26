import { notFound, permanentRedirect } from "next/navigation";
import { getPublishedNavigation } from "@/server/services/storefront-cms.service";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
export async function generateMetadata() { return { robots: { index: false, follow: true } }; }
export default async function LegacyCategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = (await getPublishedNavigation())?.categories.find(c => c.slug === slug);
  if (!category) notFound();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
  permanentRedirect(category.href + (query.size ? `?${query}` : ''));
}
