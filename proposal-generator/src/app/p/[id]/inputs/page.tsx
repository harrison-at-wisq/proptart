'use client';

import { use } from 'react';
import { ProposalForm } from '@/components/form/ProposalForm';

export default function ProposalEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ProposalForm proposalId={id} />;
}
