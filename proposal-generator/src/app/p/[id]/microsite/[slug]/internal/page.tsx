import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getAuthUser } from '@/lib/supabase-server';
import type { ProposalInputs } from '@/types/proposal';
import { MicrositeDocument } from '@/components/microsite/MicrositeDocument';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string; slug: string }>;
}

export default async function MicrositeInternalPage({ params }: Props) {
  const { id, slug } = await params;
  const user = await getAuthUser();
  if (!user?.email) notFound();

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('microsites')
    .select('owner_email, proposal_id, draft_data')
    .eq('slug', slug)
    .single();

  if (error || !data) notFound();
  if (data.owner_email !== user.email) notFound();
  if (data.proposal_id !== id) notFound();

  return <MicrositeDocument inputs={data.draft_data as ProposalInputs} />;
}
