import type { Metadata } from 'next';
import { formatSeoTitle } from '@/lib/seo-helpers';

export const metadata: Metadata = {
  title: formatSeoTitle('Xác nhận yêu cầu đặt hàng'),
  description: 'Hoàn tất thông tin giao nhận và phương thức thanh toán cho đơn hàng tại CitiLap.',
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
