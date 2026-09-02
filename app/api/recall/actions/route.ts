import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '@/lib/auth-user';
import { createServiceRoleSupabaseClient } from '@/lib/supabase-server';
import { apiError } from '@/lib/api-error';

const bodySchema = z.discriminatedUnion('action', [
  z.object({
    contactId: z.string().uuid(),
    action: z.literal('mark_contacted'),
    outcome: z.enum(['spoke', 'left_message', 'no_answer']),
  }),
  z.object({
    contactId: z.string().uuid(),
    action: z.literal('snooze'),
    months: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]),
  }),
]);

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function outcomeText(outcome: 'spoke' | 'left_message' | 'no_answer') {
  if (outcome === 'spoke') {
    return {
      activityType: 'contacted_spoke',
      body: 'Kontakt registrert som snakket med fra oppfølgingskø.',
      success: 'Samtale registrert.',
    };
  }

  if (outcome === 'left_message') {
    return {
      activityType: 'contacted_left_message',
      body: 'Kontaktforsøk registrert: la igjen beskjed.',
      success: 'Beskjed registrert.',
    };
  }

  return {
    activityType: 'contacted_no_answer',
    body: 'Kontaktforsøk registrert: ikke svar.',
    success: 'Forsøk registrert.',
  };
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireApiUser();
  if (!user) return errorResponse!;

  try {
    const body = bodySchema.parse(await request.json());
    const supabase = createServiceRoleSupabaseClient();

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, full_name')
      .eq('id', body.contactId)
      .eq('user_id', user.id)
      .single();

    if (contactError || !contact) throw new Error('Kontakten ble ikke funnet.');

    if (body.action === 'snooze') {
      const snoozedUntil = toDateInput(addMonths(new Date(), body.months));
      const { error: snoozeError } = await supabase
        .from('contacts')
        .update({ snoozed_until: snoozedUntil })
        .eq('id', body.contactId)
        .eq('user_id', user.id);

      if (snoozeError) throw snoozeError;

      await supabase.from('contact_activities').insert({
        user_id: user.id,
        contact_id: body.contactId,
        activity_type: 'recall_snoozed',
        body: body.months === 12 ? 'Kontakt utsatt fra oppfølgingskø i 12 måneder.' : `Kontakt utsatt fra oppfølgingskø i ${body.months} måneder.`,
      });

      return NextResponse.json({ ok: true, snoozedUntil });
    }

    const now = new Date().toISOString();
    const outcome = outcomeText(body.outcome);

    if (body.outcome === 'spoke') {
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ last_contacted_at: now, snoozed_until: null })
        .eq('id', body.contactId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;
    }

    await supabase.from('contact_activities').insert({
      user_id: user.id,
      contact_id: body.contactId,
      activity_type: outcome.activityType,
      body: outcome.body,
    });

    return NextResponse.json({ ok: true, lastContactedAt: body.outcome === 'spoke' ? now : null, message: outcome.success });
  } catch (error) {
    return apiError(error, 'Kunne ikke oppdatere oppfølgingskøen.', 400, 'recall:actions');
  }
}
