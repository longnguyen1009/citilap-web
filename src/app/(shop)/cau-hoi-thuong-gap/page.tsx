import CmsPolicyPage, { cmsPolicyMetadata } from '@/components/policy/CmsPolicyPage';

export const generateMetadata = () => cmsPolicyMetadata('cau-hoi-thuong-gap');

export default function Page() {
  return <CmsPolicyPage slug="cau-hoi-thuong-gap" />;
}
