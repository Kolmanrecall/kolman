import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '@/lib/auth-user';
import { createServiceRoleSupabaseClient } from '@/lib/supabase-server';

const bodySchema = z.object({
  days: z.number().int().min(1).max(90).default(7),
});

function addDays(dateValue: string | null, days: number) {
  const base = dateValue ? new Date(`${dateValue}T12:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) base.setTime(Date.now());
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, errorResponse } = await requireApiUser();
  if (!user) return errorResponse!;

  try {
    const { id } = await params;
    const { days } = bodySchema.parse(await request.json().catch(() => ({})));
    const supabase = createServiceRoleSupabaseClient();

    const { data: existing, error: existingError } = await supabase
      .from('follow_ups')
      .select('id, contact_id, title, due_date')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (existingError || !existing) throw new Error('Oppfølgingen ble ikke funnet.');

    const newDate = addDays(existing.due_date, days);
    const { data: followUp, error } = await supabase
      .from('follow_ups')
      .update({ status: 'postponed', due_date: newDate })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) throw error;

    await supabase.from('contact_activities').insert({
      user_id: user.id,
      contact_id: existing.contact_id,
      activity_type: 'follow_up_postponed',
      body: `Oppfølging utsatt: ${existing.title}. Ny dato: ${newDate}.`,
    });

    return NextResponse.json({ followUp });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Kunne ikke utsette oppfølgingen.' }, { status: 400 });
  }
}
