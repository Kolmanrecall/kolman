import { NextResponse } from 'next/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase-server';
import { requireApiUser } from '@/lib/auth-user';

export async function GET() {
  const { user, errorResponse } = await requireApiUser();
  if (!user) return errorResponse!;

  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ contacts: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ukjent feil' }, { status: 500 });
  }
}
