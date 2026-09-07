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
  rows: z.array(z.unknown()).min(1, 'Fant ingen kontakter å importere.').max(5000, 'Maks 5000 kontakter per import.'),
});

type ImportRow = z.infer<typeof rowSchema>;

function normalizeEmail(value: string | null) {
  return value?.trim().toLowerCase() || null;
}

function normalizePhone(value: string | null) {
  const digits = value?.replace(/\D/g, '') ?? '';
  return digits.length >= 6 ? digits : null;
}

function contactKeys(contact: { email: string | null; phone: string | null }) {
  return [normalizeEmail(contact.email), normalizePhone(contact.phone)].filter((value): value is string => Boolean(value));
}

function chunkRows<T>(rows: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) chunks.push(rows.slice(index, index + size));
  return chunks;
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireApiUser();
  if (!user) return errorResponse!;

  try {
    const json = await request.json();
    const { rows: rawRows } = bodySchema.parse(json);

    const validRows: ImportRow[] = [];
    const invalidRows: { rowNumber: number; reason: string }[] = [];

    rawRows.forEach((row, index) => {
      const parsed = rowSchema.safeParse(row);
      if (parsed.success) {
        validRows.push(parsed.data);
        return;
      }

      invalidRows.push({
        rowNumber: index + 2,
        reason: parsed.error.issues[0]?.message ?? 'Raden kunne ikke importeres.',
      });
    });

    if (!validRows.length) {
      return NextResponse.json({
        inserted: 0,
        skipped: invalidRows.length,
        skippedDuplicates: 0,
        skippedInvalid: invalidRows.length,
        invalidRows: invalidRows.slice(0, 25),
        contacts: [],
      });
    }

    const supabase = createServiceRoleSupabaseClient();
    const { data: existingContacts, error: existingError } = await supabase.from('contacts').select('email, phone').eq('user_id', user.id);
    if (existingError) throw existingError;

    const seenKeys = new Set<string>();
    (existingContacts ?? []).forEach((contact) => {
      contactKeys(contact).forEach((key) => seenKeys.add(key));
    });

    let skippedDuplicates = 0;
    const payload = validRows.flatMap((row) => {
      const keys = contactKeys(row);
      const duplicate = keys.length > 0 && keys.some((key) => seenKeys.has(key));
      if (duplicate) {
        skippedDuplicates += 1;
        return [];
      }
      keys.forEach((key) => seenKeys.add(key));
      return [{ ...row, user_id: user.id }];
    });

    if (!payload.length) {
      return NextResponse.json({
        inserted: 0,
        skipped: skippedDuplicates + invalidRows.length,
        skippedDuplicates,
        skippedInvalid: invalidRows.length,
        invalidRows: invalidRows.slice(0, 25),
        contacts: [],
      });
    }

    const insertedContacts = [];
    for (const chunk of chunkRows(payload, 500)) {
      const { data, error } = await supabase.from('contacts').insert(chunk).select('*');
      if (error) throw error;
      insertedContacts.push(...(data ?? []));
    }

    return NextResponse.json({
      inserted: insertedContacts.length,
      skipped: skippedDuplicates + invalidRows.length,
      skippedDuplicates,
      skippedInvalid: invalidRows.length,
      invalidRows: invalidRows.slice(0, 25),
      contacts: insertedContacts,
    });
  } catch (error) {
    return apiError(error, 'Importen feilet. Sjekk filen og prøv igjen.', 400, 'contacts:import');
  }
}
