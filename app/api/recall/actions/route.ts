import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '@/lib/auth-user';
import { createServiceRoleSupabaseClient } from '@/lib/supabase-server';

const bodySchema = z.object({
  contactId: z.string().uuid(),
  action: z.literal('mark_contacted'),
});

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireApiUser();
  if (!user) return errorResponse!;

  try {
    const { contactId } = bodySchema.parse(await request.json());
    const supabase = createServiceRoleSupabaseClient();

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, full_name')
      .eq('id', contactId)
      .eq('user_id', user.id)
      .single();

    if (contactError || !contact) throw new Error('Kontakten ble ikke funnet.');

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('contacts')
      .update({ last_contacted_at: now })
      .eq('id', contactId)
      .eq('user_id', user.id);

    if (updateError) throw updateError;

    await supabase.from('contact_activities').insert({
      user_id: user.id,
      contact_id: contactId,
      activity_type: 'contacted',
      body: 'Kontakt markert som fulgt opp fra recall-kø.',
    });

    return NextResponse.json({ ok: true, lastContactedAt: now });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Kunne ikke oppdatere recall-status.' }, { status: 400 });
  }
}
