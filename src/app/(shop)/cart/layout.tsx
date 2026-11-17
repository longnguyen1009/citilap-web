import type { Metadata } from 'next';
import { formatSeoTitle } from '@/lib/seo-helpers';

export const metadata: Metadata = {
  title: formatSeoTitle('Giỏ hàng của bạn'),
  description: 'Xem lại cấu hình sản phẩm, gói bảo hành và gửi yêu cầu đặt hàng tại CitiLap.',
  robots: { index: false, follow: false },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
