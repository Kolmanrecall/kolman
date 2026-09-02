import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? fallback;
  }

  return fallback;
}

export function apiError(error: unknown, fallback: string, status = 400, scope?: string) {
  if (scope) {
    console.error(`[Kolman API] ${scope}`, error);
  } else {
    console.error('[Kolman API]', error);
  }

  return NextResponse.json({ error: getSafeErrorMessage(error, fallback) }, { status });
}
