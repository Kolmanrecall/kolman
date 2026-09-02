import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '@/lib/auth-user';
import { createServiceRoleSupabaseClient } from '@/lib/supabase-server';
import { CASE_STATUS_VALUES } from '@/lib/case-status';
import { apiError } from '@/lib/api-error';

const bodySchema = z.object({
  title: z.string().trim().min(2, 'Saken må ha et navn.').max(180, 'Navnet er for langt.'),
  address: z.string().trim().max(220, 'Adressen er for lang.').nullable().optional(),
  city: z.string().trim().max(120, 'Byen er for lang.').nullable().optional(),
  status: z.enum(CASE_STATUS_VALUES).default('lead'),
  nextStep: z.string().trim().max(180, 'Neste steg er for langt.').nullable().optional(),
  nextStepDueDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
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
        next_step: body.nextStep || null,
        next_step_due_date: body.nextStepDueDate || null,
        notes: body.notes || null,
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ case: propertyCase });
  } catch (error) {
    return apiError(error, 'Kunne ikke opprette saken.', 400, 'cases:create');
  }
}
