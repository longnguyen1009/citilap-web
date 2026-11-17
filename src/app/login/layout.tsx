import type { Metadata } from 'next';
import { formatSeoTitle } from '@/lib/seo-helpers';

export const metadata: Metadata = {
  title: formatSeoTitle('Đăng nhập hệ thống quản trị'),
  description: 'Cổng đăng nhập dành cho quản trị viên và nhân viên CitiLap.',
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
