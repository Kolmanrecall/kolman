import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '@/lib/auth-user';
import { createServiceRoleSupabaseClient } from '@/lib/supabase-server';

const bodySchema = z.object({
  contactId: z.string().uuid(),
  title: z.string().trim().min(2, 'Oppfølgingen må ha en tittel.').max(160, 'Tittelen er for lang.'),
  dueDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  note: z.string().trim().max(1200, 'Notatet er for langt.').nullable().optional(),
});

function formatActivityBody(title: string, dueDate?: string | null) {
  return dueDate ? `Oppfølging opprettet: ${title}. Dato: ${dueDate}.` : `Oppfølging opprettet: ${title}.`;
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireApiUser();
  if (!user) return errorResponse!;

  try {
    const { contactId, title, dueDate, note } = bodySchema.parse(await request.json());
    const supabase = createServiceRoleSupabaseClient();

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, full_name')
      .eq('id', contactId)
      .eq('user_id', user.id)
      .single();

    if (contactError || !contact) throw new Error('Kontakten ble ikke funnet.');

    const { data: followUp, error: followUpError } = await supabase
      .from('follow_ups')
      .insert({
        user_id: user.id,
        contact_id: contactId,
        title,
        due_date: dueDate || null,
        note: note || null,
        status: 'open',
      })
      .select('*')
      .single();

    if (followUpError) throw followUpError;

    await supabase.from('contact_activities').insert({
      user_id: user.id,
      contact_id: contactId,
      activity_type: 'follow_up_created',
      body: formatActivityBody(title, dueDate),
    });

    return NextResponse.json({ followUp });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Kunne ikke lagre oppfølgingen.' }, { status: 400 });
  }
}
