import ProductPage, { generateMetadata as productMetadata, type ProductPageProps } from '@/components/product/ProductDetailPage';
type Props = Omit<ProductPageProps, 'namespace'>;
export function generateMetadata(props: Props) { return productMetadata(props); }
export default function Page(props: Props) { return ProductPage(props); }
