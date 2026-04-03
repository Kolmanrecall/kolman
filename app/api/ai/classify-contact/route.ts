import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleSupabaseClient } from '@/lib/supabase-server';
import { getOpenAIClient } from '@/lib/openai';
import { CLASSIFY_CONTACT_SYSTEM_PROMPT } from '@/prompts/real-estate';
import { requireApiUser } from '@/lib/auth-user';

const bodySchema = z.object({
  contactId: z.string().uuid(),
});

function fallbackClassify(contact: {
  status_raw?: string | null;
  notes?: string | null;
  last_contacted_at?: string | null;
}) {
  const haystack = `${contact.status_raw ?? ''} ${contact.notes ?? ''}`.toLowerCase();

  if (haystack.includes('tidligere kunde') || haystack.includes('kjøpte') || haystack.includes('solgte')) {
    return {
      category: 'Tidligere kunde',
      warmthScore: 7,
      recommendedFlow: 'Tidligere kunde Check-In',
      reasoning: 'Kontaktdata tyder på at dette er en tidligere kunde som bør holdes varm.',
    };
  }

  if (haystack.includes('vurderer salg') || haystack.includes('skal selge') || haystack.includes('verdivurdering')) {
    return {
      category: 'Varm salgsintensjon',
      warmthScore: 8,
      recommendedFlow: 'Reaktivering av selger',
      reasoning: 'Notater og status tyder på aktiv eller nylig salgsinteresse.',
    };
  }

  if (haystack.includes('lead') || haystack.includes('dialog') || haystack.includes('vurderer')) {
    return {
      category: 'Eldre selgerlead',
      warmthScore: 6,
      recommendedFlow: 'Reaktivering av selger',
      reasoning: 'Kontakten ser ut som en eldre lead som bør reaktiveres med en myk oppfølging.',
    };
  }

  return {
    category: 'Trenger manuell vurdering',
    warmthScore: 4,
    recommendedFlow: 'Manuell vurdering',
    reasoning: 'Det er for lite tydelige signaler i dataene til å velge sikker kategori automatisk.',
  };
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireApiUser();
  if (!user) return errorResponse!;

  try {
    const { contactId } = bodySchema.parse(await request.json());
    const supabase = createServiceRoleSupabaseClient();

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('user_id', user.id)
      .single();

    if (contactError || !contact) throw new Error('Kontakten ble ikke funnet');

    const useFallback = !process.env.OPENAI_API_KEY;
    const client = getOpenAIClient();

    const parsed = useFallback
      ? fallbackClassify(contact)
      : JSON.parse(
          (
            await client!.responses.create({
              model: 'gpt-5-mini',
              input: [
                { role: 'system', content: CLASSIFY_CONTACT_SYSTEM_PROMPT },
                {
                  role: 'user',
                  content: JSON.stringify({
                    fullName: contact.full_name,
                    notes: contact.notes,
                    source: contact.source,
                    statusRaw: contact.status_raw,
                    lastContactedAt: contact.last_contacted_at,
                    city: contact.city,
                  }),
                },
              ],
              text: {
                format: {
                  type: 'json_schema',
                  name: 'contact_classification',
                  schema: {
                    type: 'object',
                    properties: {
                      category: { type: 'string' },
                      warmthScore: { type: 'number' },
                      recommendedFlow: { type: 'string' },
                      reasoning: { type: 'string' },
                    },
                    required: ['category', 'warmthScore', 'recommendedFlow', 'reasoning'],
                    additionalProperties: false,
                  },
                },
              },
            })
          ).output_text,
        );

    const { data, error } = await supabase
      .from('contact_classifications')
      .insert({
        contact_id: contactId,
        category: parsed.category,
        warmth_score: parsed.warmthScore,
        recommended_flow: parsed.recommendedFlow,
        reasoning: parsed.reasoning,
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ classification: data, mode: useFallback ? 'fallback' : 'openai' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Klassifisering feilet' }, { status: 400 });
  }
}
