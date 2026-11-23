import { notFound, permanentRedirect } from 'next/navigation';
import { getPublishedNavigation } from '@/server/services/storefront-cms.service';
import { canonicalCategoryPath } from '@/lib/category-paths';
type Props = { params: Promise<{ category: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
export default async function LegacyCategoryPath({ params, searchParams }: Props) {
  const navigation = await getPublishedNavigation();
  const target = canonicalCategoryPath('/phan-loai/' + (await params).category.join('/'), navigation?.categories || []);
  if (!target) notFound();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
  permanentRedirect(target + (query.size ? '?' + query : ''));
}
