'use client';

import { use } from 'react';
import StaticPageEditor from '@/components/admin/content/StaticPageEditor';

export default function EditStaticPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <StaticPageEditor id={id} />;
}
