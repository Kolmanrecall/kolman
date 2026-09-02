import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase-server';
import { requireApiUser } from '@/lib/auth-user';
import { apiError } from '@/lib/api-error';

export async function PATCH(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, errorResponse } = await requireApiUser();
  if (!user) return errorResponse!;

  try {
    const { id } = await params;
    const supabase = createServiceRoleSupabaseClient();
    const { data, error } = await supabase
      .from('message_drafts')
      .update({ approved: true })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ draft: data });
  } catch (error) {
    return apiError(error, 'Kunne ikke godkjenne meldingsutkastet.', 400, 'message-drafts:approve');
  }
}
