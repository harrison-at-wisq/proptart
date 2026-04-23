import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getAuthUser } from '@/lib/supabase-server';
import type { MicrositeData } from '@/types/microsite';
import { MicrositeStudio } from '@/components/microsite/studio/MicrositeStudio';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string; slug: string }>;
}

export default async function MicrositeStudioPage({ params }: Props) {
  const { id, slug } = await params;
  const user = await getAuthUser();
  if (!user?.email) notFound();

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('microsites')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) notFound();
  if (data.owner_email !== user.email) notFound();
  if (data.proposal_id !== id) notFound();

  return (
    <MicrositeStudio
      proposalId={id}
      slug={slug}
      name={data.name}
      initialDraft={data.draft_data as MicrositeData}
      initialPublished={data.published_data as MicrositeData}
      initialPublishedAt={data.published_at as string}
    />
  );
}
