import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAccessListConfigured, isAllowedAccessEmail } from '@/lib/access-control';

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const { email } = bodySchema.parse(await request.json());

    if (!isAccessListConfigured()) {
      return NextResponse.json(
        { allowed: false, error: 'Tilgang er ikke satt opp ennå.' },
        { status: 403 },
      );
    }

    if (!isAllowedAccessEmail(email)) {
      return NextResponse.json(
        { allowed: false, error: 'Denne e-posten har ikke tilgang til Kolman ennå.' },
        { status: 403 },
      );
    }

    return NextResponse.json({ allowed: true });
  } catch {
    return NextResponse.json({ allowed: false, error: 'Ugyldig e-postadresse.' }, { status: 400 });
  }
}
