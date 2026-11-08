import ProductPage, { generateMetadata as productMetadata, type ProductPageProps } from '@/components/product/ProductDetailPage';
// URL cũ: luôn 301 về đường dẫn chuẩn (/laptop/... hoặc /phu-kien/...) nhờ namespace không khớp.
type Props = Omit<ProductPageProps, 'namespace'>;
export function generateMetadata(props: Props) { return productMetadata(props); }
export default function Page(props: Props) { return ProductPage({ ...props, namespace: 'product' }); }
