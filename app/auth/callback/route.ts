import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleSupabaseClient } from '@/lib/supabase-server';
import { isAllowedBetaEmail } from '@/lib/beta-access';

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/dashboard', request.url));
  const code = request.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!isAllowedBetaEmail(data.user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=ikke-godkjent', request.url));
  }

  const service = createServiceRoleSupabaseClient();
  await service.from('users').upsert(
    {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Kolman-bruker',
    },
    { onConflict: 'id' },
  );

  return response;
}
