import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ProposalInputs } from '@/types/proposal';
import { MOUInputs } from '@/types/mou';
import { DocumentType } from '@/types/database';

// Force dynamic rendering to avoid build-time data fetching
export const dynamic = 'force-dynamic';

// Proposal row type from database
interface ProposalRow {
  id: string;
  name: string;
  owner_email: string;
  data: ProposalInputs | MOUInputs;
  document_type: DocumentType;
  created_at: string;
  updated_at: string;
}

// GET - Get single proposal
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const proposal = data as ProposalRow;

  return NextResponse.json({
    proposal: {
      id: proposal.id,
      name: proposal.name,
      createdAt: proposal.created_at,
      updatedAt: proposal.updated_at,
      data: proposal.data,
      ownerEmail: proposal.owner_email,
      isOwner: proposal.owner_email === user?.email,
      documentType: proposal.document_type || 'proposal',
    },
  });
}

// PUT - Update proposal (only owner can edit)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { name, data: proposalData } = await request.json();

  // First check ownership
  const supabase = createServerSupabaseClient();
  const { data: existingData, error: fetchError } = await supabase
    .from('proposals')
    .select('owner_email')
    .eq('id', id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  if (!existingData) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  const existing = existingData as { owner_email: string };

  if (existing.owner_email !== user.email) {
    return NextResponse.json({ error: 'Not authorized to edit this proposal' }, { status: 403 });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (name !== undefined) updates.name = name;
  if (proposalData !== undefined) updates.data = proposalData;

  const { data: updateData, error: updateError } = await supabase
    .from('proposals')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('Supabase error:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (!updateData) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  const updated = updateData as ProposalRow;

  return NextResponse.json({
    proposal: {
      id: updated.id,
      name: updated.name,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
      data: updated.data,
      ownerEmail: updated.owner_email,
      isOwner: true,
      documentType: updated.document_type || 'proposal',
    },
  });
}

// DELETE - Delete proposal (only owner can delete)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerSupabaseClient();

  // First check ownership
  const { data: existingData, error: fetchError } = await supabase
    .from('proposals')
    .select('owner_email')
    .eq('id', id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  if (!existingData) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  const existing = existingData as { owner_email: string };

  if (existing.owner_email !== user.email) {
    return NextResponse.json({ error: 'Not authorized to delete this proposal' }, { status: 403 });
  }

  const { error } = await supabase
    .from('proposals')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
