import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAllowedAccessEmails, isAllowedAccessEmail } from '@/lib/access-control';

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const { email } = bodySchema.parse(await request.json());
    const allowedEmails = getAllowedAccessEmails();

    if (!isAllowedAccessEmail(email)) {
      return NextResponse.json(
        {
          allowed: false,
          error: allowedEmails.length
            ? 'Denne e-posten er ikke invitert til Kolman ennå.'
            : 'Tilgangslisten er ikke satt opp ennå.',
        },
        { status: 403 },
      );
    }

    return NextResponse.json({ allowed: true });
  } catch {
    return NextResponse.json({ allowed: false, error: 'Ugyldig e-postadresse.' }, { status: 400 });
  }
}
