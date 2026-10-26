import ProductPage, { generateMetadata as productMetadata, type ProductPageProps } from '@/components/product/ProductDetailPage';

import CategoryPage, { generateMetadata as categoryMetadata } from '@/components/category/CategoryPage';
import { getPublishedNavigation } from '@/server/services/storefront-cms.service';

type Props = Omit<ProductPageProps, 'namespace'>;
async function categoryProps(props: Props) {
  const { id } = await props.params;
  const navigation = await getPublishedNavigation();
  return navigation?.categories.some(c => c.href === '/phu-kien/' + id)
    ? { params: Promise.resolve({ category: ['phu-kien', id] }), searchParams: props.searchParams }
    : null;
}
export async function generateMetadata(props: Props) {
  const category = await categoryProps(props);
  return category ? categoryMetadata(category) : productMetadata(props);
}
export default async function Page(props: Props) {
  const category = await categoryProps(props);
  return category ? CategoryPage(category) : ProductPage({ ...props, namespace: 'phu-kien' });
}
