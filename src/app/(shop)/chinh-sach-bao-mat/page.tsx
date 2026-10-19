import CmsPolicyPage, { cmsPolicyMetadata } from '@/components/policy/CmsPolicyPage';

export const generateMetadata = () => cmsPolicyMetadata('chinh-sach-bao-mat');

export default function Page() {
  return <CmsPolicyPage slug="chinh-sach-bao-mat" />;
}
