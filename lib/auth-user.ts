import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from '@/lib/supabase-server';
import { isAllowedBetaEmail } from '@/lib/beta-access';

export async function requireApiUser() {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();

  if (error || !user) {
    return { user: null, errorResponse: NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 }) };
  }

  if (!isAllowedBetaEmail(user.email)) {
    await authClient.auth.signOut();
    return { user: null, errorResponse: NextResponse.json({ error: 'Denne kontoen har ikke tilgang ennå.' }, { status: 403 }) };
  }

  const service = createServiceRoleSupabaseClient();
  await service.from('users').upsert(
    {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Kolman-bruker',
    },
    { onConflict: 'id' },
  );

  return { user, errorResponse: null };
}
