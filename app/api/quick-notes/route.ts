import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '@/lib/auth-user';
import { createServiceRoleSupabaseClient } from '@/lib/supabase-server';

const bodySchema = z.object({
  contactId: z.string().uuid(),
  note: z.string().trim().min(2, 'Notatet må ha minst to tegn.').max(4000, 'Notatet er for langt.'),
});

function formatNoteTimestamp(date: Date) {
  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireApiUser();
  if (!user) return errorResponse!;

  try {
    const { contactId, note } = bodySchema.parse(await request.json());
    const supabase = createServiceRoleSupabaseClient();

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, full_name, notes')
      .eq('id', contactId)
      .eq('user_id', user.id)
      .single();

    if (contactError || !contact) throw new Error('Kontakten ble ikke funnet.');

    const { data: activity, error: activityError } = await supabase
      .from('contact_activities')
      .insert({
        user_id: user.id,
        contact_id: contactId,
        activity_type: 'quick_note',
        body: note,
      })
      .select('*')
      .single();

    if (activityError) throw activityError;

    const timestamp = formatNoteTimestamp(new Date());
    const existingNotes = typeof contact.notes === 'string' ? contact.notes.trim() : '';
    const appendedNotes = [existingNotes, `[${timestamp}] ${note}`].filter(Boolean).join('\n\n');

    const { data: updatedContact, error: updateError } = await supabase
      .from('contacts')
      .update({ notes: appendedNotes })
      .eq('id', contactId)
      .eq('user_id', user.id)
      .select('id, full_name, notes')
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ contact: updatedContact, activity });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Kunne ikke lagre hurtignotatet.' }, { status: 400 });
  }
}
