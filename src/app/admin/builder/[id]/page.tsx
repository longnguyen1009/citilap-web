'use client';

import { use } from 'react';
import SiteBuilderEditor from '@/components/admin/builder/SiteBuilderEditor';

export default function EditBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <SiteBuilderEditor pageId={id} />;
}
