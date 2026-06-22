import { requireApiUser } from '@/lib/auth-user';
import { createServiceRoleSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  const { user, errorResponse } = await requireApiUser();
  if (!user) return errorResponse!;

  try {
    const supabase = createServiceRoleSupabaseClient();

    const [{ data: profile }, { data: contacts, error: contactsError }, { data: followUps, error: followUpsError }, { data: activities, error: activitiesError }, { data: drafts, error: draftsError }] = await Promise.all([
      supabase.from('users').select('id, name, email, company_name, created_at').eq('id', user.id).maybeSingle(),
      supabase.from('contacts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('follow_ups').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('contact_activities').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('message_drafts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);

    if (contactsError) throw contactsError;
    if (followUpsError) throw followUpsError;
    if (activitiesError) throw activitiesError;
    if (draftsError) throw draftsError;

    const contactIds = (contacts ?? []).map((contact) => contact.id);

    const classificationsResult = contactIds.length
      ? await supabase.from('contact_classifications').select('*').in('contact_id', contactIds).order('created_at', { ascending: false })
      : { data: [], error: null };

    const repliesResult = contactIds.length
      ? await supabase.from('contact_replies').select('*').in('contact_id', contactIds).order('created_at', { ascending: false })
      : { data: [], error: null };

    if (classificationsResult.error) throw classificationsResult.error;
    if (repliesResult.error) throw repliesResult.error;

    const payload = {
      exportedAt: new Date().toISOString(),
      product: 'Kolman Eiendom',
      account: profile ?? {
        id: user.id,
        email: user.email,
      },
      data: {
        contacts: contacts ?? [],
        followUps: followUps ?? [],
        activities: activities ?? [],
        messageDrafts: drafts ?? [],
        classifications: classificationsResult.data ?? [],
        replies: repliesResult.data ?? [],
      },
    };

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="kolman-data-${new Date().toISOString().slice(0, 10)}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Kunne ikke eksportere data.' },
      { status: 500 },
    );
  }
}
