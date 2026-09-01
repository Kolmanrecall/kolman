import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from '@/lib/supabase-server';
import { isAllowedAccessEmail } from '@/lib/access-control';

export async function ensureUserProfile(user: User) {
  const service = createServiceRoleSupabaseClient();
  await service.from('users').upsert(
    {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Kolman-bruker',
    },
    { onConflict: 'id' },
  );
}

export async function getSessionUser() {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();

  if (error || !user) return { authClient, user: null };
  return { authClient, user };
}

export async function requireApiUser() {
  const { authClient, user } = await getSessionUser();

  if (!user) {
    return { user: null, errorResponse: NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 }) };
  }

  if (!isAllowedAccessEmail(user.email)) {
    await authClient.auth.signOut();
    return { user: null, errorResponse: NextResponse.json({ error: 'Denne kontoen har ikke tilgang ennå.' }, { status: 403 }) };
  }

  await ensureUserProfile(user);

  return { user, errorResponse: null };
}
