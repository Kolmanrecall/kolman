import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '@/lib/auth-user';
import { createServiceRoleSupabaseClient } from '@/lib/supabase-server';

const bodySchema = z.object({
  title: z.string().trim().min(2, 'Saken må ha et navn.').max(180, 'Navnet er for langt.'),
  address: z.string().trim().max(220, 'Adressen er for lang.').nullable().optional(),
  city: z.string().trim().max(120, 'Byen er for lang.').nullable().optional(),
  status: z.enum(['active', 'paused', 'closed']).default('active'),
  notes: z.string().trim().max(2000, 'Notatet er for langt.').nullable().optional(),
});

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireApiUser();
  if (!user) return errorResponse!;

  try {
    const body = bodySchema.parse(await request.json());
    const supabase = createServiceRoleSupabaseClient();

    const { data: propertyCase, error } = await supabase
      .from('property_cases')
      .insert({
        user_id: user.id,
        title: body.title,
        address: body.address || null,
        city: body.city || null,
        status: body.status,
        notes: body.notes || null,
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ case: propertyCase });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Kunne ikke opprette saken.' },
      { status: 400 },
    );
  }
}
