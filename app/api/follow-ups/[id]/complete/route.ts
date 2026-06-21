import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth-user';
import { createServiceRoleSupabaseClient } from '@/lib/supabase-server';

export async function PATCH(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, errorResponse } = await requireApiUser();
  if (!user) return errorResponse!;

  try {
    const { id } = await params;
    const supabase = createServiceRoleSupabaseClient();

    const { data: existing, error: existingError } = await supabase
      .from('follow_ups')
      .select('id, contact_id, title')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (existingError || !existing) throw new Error('Oppfølgingen ble ikke funnet.');

    const { data: followUp, error } = await supabase
      .from('follow_ups')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) throw error;

    await supabase.from('contact_activities').insert({
      user_id: user.id,
      contact_id: existing.contact_id,
      activity_type: 'follow_up_completed',
      body: `Oppfølging fullført: ${existing.title}.`,
    });

    return NextResponse.json({ followUp });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Kunne ikke markere oppfølgingen som ferdig.' }, { status: 400 });
  }
}
