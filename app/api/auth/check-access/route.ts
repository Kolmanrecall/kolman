import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAllowedBetaEmails, isAllowedBetaEmail } from '@/lib/beta-access';

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const { email } = bodySchema.parse(await request.json());
    const allowedEmails = getAllowedBetaEmails();

    if (!isAllowedBetaEmail(email)) {
      return NextResponse.json(
        {
          allowed: false,
          error:
            allowedEmails.length >= 4
              ? 'Denne e-posten er ikke invitert til Kolman ennå.'
              : 'Denne e-posten har ikke tilgang ennå.',
        },
        { status: 403 },
      );
    }

    return NextResponse.json({ allowed: true });
  } catch {
    return NextResponse.json({ allowed: false, error: 'Ugyldig e-postadresse.' }, { status: 400 });
  }
}
