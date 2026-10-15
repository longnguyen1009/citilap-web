'use client';

import { use } from 'react';
import PostEditor from '@/components/admin/content/PostEditor';

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PostEditor id={id} />;
}
