import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '@/lib/auth-user';
import { apiError } from '@/lib/api-error';
import { createServiceRoleSupabaseClient } from '@/lib/supabase-server';

const emptyToNull = (value: unknown) => {
  if (typeof value !== 'string') return value ?? null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const nullableText = (max: number) =>
  z.preprocess(emptyToNull, z.string().max(max, 'Feltet er for langt.').nullable().optional()).transform((value) => value ?? null);

const contactSchema = z.object({
  full_name: z.string().trim().min(2, 'Kontakten må ha et navn.').max(160, 'Navnet er for langt.'),
  email: z
    .preprocess(emptyToNull, z.string().email('Skriv en gyldig e-postadresse.').nullable().optional())
    .transform((value) => value ?? null),
  phone: nullableText(80),
  city: nullableText(120),
  status_raw: nullableText(160),
  notes: nullableText(4000),
  source: nullableText(120),
  last_contacted_at: z
    .preprocess(emptyToNull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Siste kontakt må være en dato.').nullable().optional())
    .transform((value) => value ?? null),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, errorResponse } = await requireApiUser();
  if (!user) return errorResponse!;

  try {
    const { id } = await params;
    const body = contactSchema.parse(await request.json());
    const supabase = createServiceRoleSupabaseClient();

    const { data: contact, error } = await supabase
      .from('contacts')
      .update({
        full_name: body.full_name,
        email: body.email,
        phone: body.phone,
        city: body.city,
        status_raw: body.status_raw,
        notes: body.notes,
        last_contacted_at: body.last_contacted_at,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ contact });
  } catch (error) {
    return apiError(error, 'Kunne ikke oppdatere kontakten.', 400, 'contacts:update');
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, errorResponse } = await requireApiUser();
  if (!user) return errorResponse!;

  try {
    const { id } = await params;
    const supabase = createServiceRoleSupabaseClient();

    const { data: existing, error: existingError } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) return NextResponse.json({ error: 'Fant ikke kontakten.' }, { status: 404 });

    const { error } = await supabase.from('contacts').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return apiError(error, 'Kunne ikke slette kontakten.', 400, 'contacts:delete');
  }
}
