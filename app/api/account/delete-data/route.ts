import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '@/lib/auth-user';
import { createServiceRoleSupabaseClient } from '@/lib/supabase-server';

const bodySchema = z.object({
  confirmation: z.string().trim(),
});

export async function DELETE(request: NextRequest) {
  const { user, errorResponse } = await requireApiUser();
  if (!user) return errorResponse!;

  try {
    const body = bodySchema.parse(await request.json().catch(() => ({})));

    if (body.confirmation !== 'SLETT') {
      return Response.json({ error: 'Skriv SLETT for å bekrefte sletting.' }, { status: 400 });
    }

    const supabase = createServiceRoleSupabaseClient();
    const { data: contacts, error: contactLookupError } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', user.id);

    if (contactLookupError) throw contactLookupError;

    const contactIds = (contacts ?? []).map((contact) => contact.id);

    if (contactIds.length) {
      const repliesDelete = await supabase.from('contact_replies').delete().in('contact_id', contactIds);
      if (repliesDelete.error) throw repliesDelete.error;

      const classificationsDelete = await supabase.from('contact_classifications').delete().in('contact_id', contactIds);
      if (classificationsDelete.error) throw classificationsDelete.error;
    }

    const activityDelete = await supabase.from('contact_activities').delete().eq('user_id', user.id);
    if (activityDelete.error) throw activityDelete.error;

    const followUpsDelete = await supabase.from('follow_ups').delete().eq('user_id', user.id);
    if (followUpsDelete.error) throw followUpsDelete.error;

    const draftsDelete = await supabase.from('message_drafts').delete().eq('user_id', user.id);
    if (draftsDelete.error) throw draftsDelete.error;

    const contactsDelete = await supabase.from('contacts').delete().eq('user_id', user.id);
    if (contactsDelete.error) throw contactsDelete.error;

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Kunne ikke slette data.' },
      { status: 400 },
    );
  }
}
