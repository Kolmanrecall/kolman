import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleSupabaseClient } from '@/lib/supabase-server';
import { requireApiUser } from '@/lib/auth-user';
import { apiError } from '@/lib/api-error';

const emptyToNull = (value: unknown) => {
  if (typeof value !== 'string') return value ?? null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const nullableText = z.preprocess(emptyToNull, z.string().nullable().optional()).transform((value) => value ?? null);
const nullableDate = z
  .preprocess(emptyToNull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Siste kontakt må være en gyldig dato.').nullable().optional())
  .transform((value) => value ?? null);

const rowSchema = z.object({
  full_name: z.string().trim().min(1, 'Alle rader må ha navn.'),
  email: z.preprocess(emptyToNull, z.string().email('E-post må være gyldig.').nullable().optional()).transform((value) => value ?? null),
  phone: nullableText,
  city: nullableText,
  notes: nullableText,
  source: nullableText,
  status_raw: nullableText,
  last_contacted_at: nullableDate,
});

const bodySchema = z.object({
  rows: z.array(rowSchema).min(1, 'Fant ingen kontakter å importere.').max(5000, 'Maks 5000 kontakter per import.'),
});

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireApiUser();
  if (!user) return errorResponse!;

  try {
    const json = await request.json();
    const { rows } = bodySchema.parse(json);

    const supabase = createServiceRoleSupabaseClient();
    const payload = rows.map((row) => ({ ...row, user_id: user.id }));

    const { data, error } = await supabase.from('contacts').insert(payload).select('*');
    if (error) throw error;

    return NextResponse.json({ inserted: data?.length ?? 0, contacts: data ?? [] });
  } catch (error) {
    return apiError(error, 'Importen feilet. Sjekk filen og prøv igjen.', 400, 'contacts:import');
  }
}
