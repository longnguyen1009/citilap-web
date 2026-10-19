import CmsPolicyPage, { cmsPolicyMetadata } from '@/components/policy/CmsPolicyPage';

export const generateMetadata = () => cmsPolicyMetadata('huong-dan-mua-hang');

export default function Page() {
  return <CmsPolicyPage slug="huong-dan-mua-hang" />;
}
