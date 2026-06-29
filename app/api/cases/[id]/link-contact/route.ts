import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '@/lib/auth-user';
import { createServiceRoleSupabaseClient } from '@/lib/supabase-server';

const bodySchema = z.object({
  contactId: z.string().uuid(),
  role: z.string().trim().min(1, 'Velg en rolle.').max(80, 'Rollen er for lang.'),
  note: z.string().trim().max(800, 'Notatet er for langt.').nullable().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, errorResponse } = await requireApiUser();
  if (!user) return errorResponse!;

  try {
    const { id } = await params;
    const { contactId, role, note } = bodySchema.parse(await request.json());
    const supabase = createServiceRoleSupabaseClient();

    const [{ data: propertyCase, error: caseError }, { data: contact, error: contactError }] = await Promise.all([
      supabase.from('property_cases').select('id, title').eq('id', id).eq('user_id', user.id).single(),
      supabase.from('contacts').select('id, full_name').eq('id', contactId).eq('user_id', user.id).single(),
    ]);

    if (caseError || !propertyCase) throw new Error('Saken ble ikke funnet.');
    if (contactError || !contact) throw new Error('Kontakten ble ikke funnet.');

    const { data: link, error } = await supabase
      .from('case_contacts')
      .upsert(
        {
          user_id: user.id,
          case_id: id,
          contact_id: contactId,
          role,
          note: note || null,
        },
        { onConflict: 'case_id,contact_id' },
      )
      .select('*')
      .single();

    if (error) throw error;

    await supabase.from('contact_activities').insert({
      user_id: user.id,
      contact_id: contactId,
      activity_type: 'case_linked',
      body: `Koblet til sak/adresse: ${propertyCase.title} (${role}).`,
    });

    return NextResponse.json({ link });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Kunne ikke koble kontakt til saken.' },
      { status: 400 },
    );
  }
}
