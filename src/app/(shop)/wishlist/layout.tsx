import type { Metadata } from 'next';
import { formatSeoTitle } from '@/lib/seo-helpers';

export const metadata: Metadata = {
  title: formatSeoTitle('Sản phẩm yêu thích đã lưu'),
  description: 'Danh sách laptop và phụ kiện bạn đã lưu để theo dõi giá và cấu hình tại CitiLap.',
  robots: { index: false, follow: true },
};

export default function WishlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
