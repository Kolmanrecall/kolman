import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleSupabaseClient } from '@/lib/supabase-server';
import { requireApiUser } from '@/lib/auth-user';

const rowSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  status_raw: z.string().optional().nullable(),
  last_contacted_at: z.string().optional().nullable(),
});

const bodySchema = z.object({
  rows: z.array(rowSchema),
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
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Import feilet' }, { status: 400 });
  }
}
