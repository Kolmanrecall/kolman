import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '@/lib/auth-user';
import { createServiceRoleSupabaseClient } from '@/lib/supabase-server';
import { apiError } from '@/lib/api-error';

const bodySchema = z.object({
  notes: z.string().max(8000).nullable(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, errorResponse } = await requireApiUser();
  if (!user) return errorResponse!;

  try {
    const { id } = await params;
    const { notes } = bodySchema.parse(await request.json());
    const supabase = createServiceRoleSupabaseClient();

    const { data, error } = await supabase
      .from('contacts')
      .update({ notes: notes?.trim() || null })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, notes')
      .single();

    if (error) throw error;
    return NextResponse.json({ contact: data });
  } catch (error) {
    return apiError(error, 'Kunne ikke lagre notatet.', 400, 'contacts:notes');
  }
}
