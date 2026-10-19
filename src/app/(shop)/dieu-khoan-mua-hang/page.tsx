import CmsPolicyPage, { cmsPolicyMetadata } from '@/components/policy/CmsPolicyPage';

export const generateMetadata = () => cmsPolicyMetadata('dieu-khoan-mua-hang');

export default function Page() {
  return <CmsPolicyPage slug="dieu-khoan-mua-hang" />;
}
