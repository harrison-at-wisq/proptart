import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ProposalInputs } from '@/types/proposal';
import { MicrositeDocument } from '@/components/microsite/MicrositeDocument';

export const dynamic = 'force-dynamic';

interface MicrositePageProps {
  params: Promise<{ slug: string }>;
}

async function getMicrositeData(slug: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('microsites')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data || data.unpublished_at) {
    return null;
  }

  // Increment view count
  supabase
    .from('microsites')
    .update({
      view_count: (data.view_count || 0) + 1,
      last_viewed_at: new Date().toISOString(),
    })
    .eq('id', data.id)
    .then(() => {});

  return data;
}

export async function generateMetadata({ params }: MicrositePageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getMicrositeData(slug);

  if (!data) {
    return { title: 'Not Found' };
  }

  const proposalData = data.data as ProposalInputs;
  const companyName = proposalData?.company?.companyName || 'Your Company';

  return {
    title: `Wisq Proposal for ${companyName}`,
    description: `See how Wisq can transform HR operations at ${companyName} with AI-powered employee support.`,
    openGraph: {
      title: `Wisq Proposal for ${companyName}`,
      description: `See how Wisq can transform HR operations at ${companyName}.`,
      type: 'website',
    },
  };
}

export default async function MicrositePage({ params }: MicrositePageProps) {
  const { slug } = await params;
  const data = await getMicrositeData(slug);

  if (!data) {
    notFound();
  }

  const proposalData = data.data as ProposalInputs;

  return <MicrositeDocument inputs={proposalData} />;
}
