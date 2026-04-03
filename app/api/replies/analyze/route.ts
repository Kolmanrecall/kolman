import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleSupabaseClient } from '@/lib/supabase-server';
import { getOpenAIClient } from '@/lib/openai';
import { ANALYZE_REPLY_SYSTEM_PROMPT } from '@/prompts/real-estate';
import { requireApiUser } from '@/lib/auth-user';

const bodySchema = z.object({
  contactId: z.string().uuid(),
  messageDraftId: z.string().uuid().optional().nullable(),
  replyText: z.string().min(1),
});

function fallbackAnalyzeReply(input: { replyText: string }) {
  const text = input.replyText.toLowerCase();

  if (text.includes('ikke interessert') || text.includes('ikke aktuelt') || text.includes('har allerede') || text.includes('stopp') || text.includes('ikke kontakt')) {
    return {
      replyCategory: 'Ikke interessert',
      nextStep: 'Stopp oppfølging',
      suggestedResponse: 'Skjønner, takk for tilbakemeldingen. Bare gi lyd hvis det blir aktuelt senere.',
    };
  }

  if (text.includes('etter sommeren') || text.includes('senere') || text.includes('om noen måneder') || text.includes('til høsten') || text.includes('neste år')) {
    return {
      replyCategory: 'Interessert senere',
      nextStep: 'Følg opp senere',
      suggestedResponse: 'Det gir mening. Jeg kan gjerne ta kontakt igjen nærmere tidspunktet, og i mellomtiden sier du bare fra hvis du vil ha en rask verdivurdering.',
    };
  }

  if (text.includes('ja') || text.includes('gjerne') || text.includes('kan du sende') || text.includes('verdivurdering') || text.includes('ta en prat') || text.includes('ring meg')) {
    return {
      replyCategory: 'Varmt selgersvar',
      nextStep: 'Book verdivurdering',
      suggestedResponse: 'Supert — jeg kan sende deg en oppdatert verdivurdering og ta en kort prat om veien videre. Hva passer best for deg?',
    };
  }

  return {
    replyCategory: 'Trenger manuell vurdering',
    nextStep: 'Fortsett dialogen',
    suggestedResponse: 'Takk for svar! Jeg følger gjerne opp videre og tilpasser meg det som passer best for dere.',
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
      .select('*')
      .eq('id', body.contactId)
      .eq('user_id', user.id)
      .single();

    if (contactError || !contact) throw new Error('Kontakten ble ikke funnet');

    const { data: draft } = body.messageDraftId
      ? await supabase.from('message_drafts').select('*').eq('id', body.messageDraftId).eq('user_id', user.id).single()
      : { data: null };

    const client = getOpenAIClient();
    const useFallback = !client;

    const parsed = useFallback
      ? fallbackAnalyzeReply({ replyText: body.replyText })
      : JSON.parse(
          (
            await client.responses.create({
              model: 'gpt-5-mini',
              input: [
                { role: 'system', content: ANALYZE_REPLY_SYSTEM_PROMPT },
                {
                  role: 'user',
                  content: JSON.stringify({
                    contact: {
                      fullName: contact.full_name,
                      notes: contact.notes,
                      statusRaw: contact.status_raw,
                    },
                    latestOutgoingMessage: draft?.message_text ?? null,
                    incomingReply: body.replyText,
                  }),
                },
              ],
              text: {
                format: {
                  type: 'json_schema',
                  name: 'reply_analysis',
                  schema: {
                    type: 'object',
                    properties: {
                      replyCategory: { type: 'string' },
                      nextStep: { type: 'string' },
                      suggestedResponse: { type: 'string' },
                    },
                    required: ['replyCategory', 'nextStep', 'suggestedResponse'],
                    additionalProperties: false,
                  },
                },
              },
            })
          ).output_text,
        );

    const { data, error } = await supabase
      .from('contact_replies')
      .insert({
        contact_id: body.contactId,
        message_draft_id: body.messageDraftId,
        reply_text: body.replyText,
        reply_category: parsed.replyCategory,
        next_step: parsed.nextStep,
        suggested_response: parsed.suggestedResponse,
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ analysis: data, mode: useFallback ? 'fallback' : 'openai' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Svaranalyse feilet' }, { status: 400 });
  }
}
