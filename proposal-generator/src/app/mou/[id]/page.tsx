'use client';

import { use } from 'react';
import { MOUForm } from '@/components/form/MOUForm';

export default function MOUEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <MOUForm proposalId={id} />;
}
