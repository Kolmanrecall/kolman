import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleSupabaseClient } from '@/lib/supabase-server';
import { getOpenAIClient } from '@/lib/openai';
import { GENERATE_MESSAGE_SYSTEM_PROMPT } from '@/prompts/real-estate';
import { requireApiUser } from '@/lib/auth-user';

const bodySchema = z.object({
  contactId: z.string().uuid(),
  intent: z.string().default('seller-reactivation'),
  channel: z.string().default('sms'),
});

function fallbackGenerateMessage(input: {
  fullName: string;
  city?: string | null;
  notes?: string | null;
  statusRaw?: string | null;
  category?: string | null;
}) {
  const firstName = input.fullName.split(' ')[0];
  const cityPart = input.city ? ` i ${input.city}` : '';
  const haystack = `${input.notes ?? ''} ${input.statusRaw ?? ''}`.toLowerCase();

  let messageText = `Hei ${firstName}! Ville bare høre om dere fortsatt vurderer noe boligbytte${cityPart} i tiden fremover? Gi gjerne lyd hvis du vil at jeg sender en rask oppdatering på markedet.`;

  if ((input.category ?? '').toLowerCase().includes('tidligere kunde')) {
    messageText = `Hei ${firstName}! Håper alt står bra til. Ville bare sende en kort hilsen og si at du gjerne må gi lyd hvis du vil ha en oppdatert verdivurdering${cityPart} eller bare en rask prat om markedet.`;
  } else if (
    (input.category ?? '').toLowerCase().includes('varm') ||
    haystack.includes('verdivurdering') ||
    haystack.includes('vurderer salg')
  ) {
    messageText = `Hei ${firstName}! Ville bare følge opp kort siden dere tidligere vurderte salg${cityPart}. Gi gjerne lyd hvis det er aktuelt at jeg sender en oppdatert verdivurdering eller tar en rask prat.`;
  }

  return {
    messageText,
    intent: 'seller-reactivation',
    explanation: 'Fallback-utkast basert på kontaktens kategori, status og notater.',
  };
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireApiUser();
  if (!user) return errorResponse!;

  try {
    const parsedBody = bodySchema.parse(await request.json());
    const supabase = createServiceRoleSupabaseClient();

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', parsedBody.contactId)
      .eq('user_id', user.id)
      .single();

    if (contactError || !contact) throw new Error('Kontakten ble ikke funnet');

    const { data: latestClassification } = await supabase
      .from('contact_classifications')
      .select('*')
      .eq('contact_id', parsedBody.contactId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const client = getOpenAIClient();
    const useFallback = !client;

    const parsed = useFallback
      ? fallbackGenerateMessage({
          fullName: contact.full_name,
          city: contact.city,
          notes: contact.notes,
          statusRaw: contact.status_raw,
          category: latestClassification?.category ?? null,
        })
      : JSON.parse(
          (
            await client.responses.create({
              model: 'gpt-5-mini',
              input: [
                { role: 'system', content: GENERATE_MESSAGE_SYSTEM_PROMPT },
                {
                  role: 'user',
                  content: JSON.stringify({
                    contact: {
                      fullName: contact.full_name,
                      city: contact.city,
                      notes: contact.notes,
                      statusRaw: contact.status_raw,
                    },
                    classification: latestClassification
                      ? {
                          category: latestClassification.category,
                          warmthScore: latestClassification.warmth_score,
                          recommendedFlow: latestClassification.recommended_flow,
                        }
                      : null,
                    intent: parsedBody.intent,
                    channel: parsedBody.channel,
                    goal: 'Start a natural conversation that could lead to valuation or listing discussion.',
                    maxLength: 320,
                  }),
                },
              ],
              text: {
                format: {
                  type: 'json_schema',
                  name: 'message_generation',
                  schema: {
                    type: 'object',
                    properties: {
                      messageText: { type: 'string' },
                      intent: { type: 'string' },
                      explanation: { type: 'string' },
                    },
                    required: ['messageText', 'intent', 'explanation'],
                    additionalProperties: false,
                  },
                },
              },
            })
          ).output_text,
        );

    const { data, error } = await supabase
      .from('message_drafts')
      .insert({
        contact_id: parsedBody.contactId,
        user_id: user.id,
        message_text: parsed.messageText,
        channel: parsedBody.channel,
        intent: parsed.intent,
        generated_by_model: useFallback ? 'fallback-rules' : 'gpt-5-mini',
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({
      draft: data,
      explanation: parsed.explanation,
      mode: useFallback ? 'fallback' : 'openai',
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Generering av melding feilet' }, { status: 400 });
  }
}
