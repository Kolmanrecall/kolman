import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createServiceRoleSupabaseClient } from '@/lib/supabase-server';
import { isAllowedBetaEmail } from '@/lib/beta-access';

export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user ?? null;
}

export async function requireApiUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: 'Ikke autentisert.' }, { status: 401 }),
    };
  }

  if (!isAllowedBetaEmail(user.email)) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: 'Ikke godkjent.' }, { status: 403 }),
    };
  }

  return {
    user,
    errorResponse: null,
  };
}

export function getServiceSupabase() {
  return createServiceRoleSupabaseClient();
}