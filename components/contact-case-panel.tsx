'use client';

import { FormEvent, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PropertyCase } from '@/lib/types';

export function ContactCasePanel({
  contactId,
  cases,
  linkedCases,
}: {
  contactId: string;
  cases: PropertyCase[];
  linkedCases: PropertyCase[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const linkedIds = useMemo(() => new Set(linkedCases.map((item) => item.id)), [linkedCases]);
  const availableCases = cases.filter((item) => !linkedIds.has(item.id));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const caseId = String(formData.get('caseId') || '');

    const response = await fetch(`/api/cases/${caseId}/link-contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactId,
        role: String(formData.get('role') || '').trim(),
        note: String(formData.get('note') || '').trim() || null,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error || 'Kunne ikke koble kontakten.');
      return;
    }

    form.reset();
    setSuccess('Kontakt koblet til sak.');
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      {linkedCases.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {linkedCases.map((item) => {
            const link = item.contacts?.[0];
            return (
              <Link key={item.id} href={`/cases/${item.id}` as any} className="block rounded-2xl border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.025)] p-4 transition hover:border-[rgba(183,146,104,0.32)] hover:bg-[rgba(255,245,232,0.04)]">
                <div className="font-medium text-white">{item.title}</div>
                <div className="mt-1 text-sm text-[#8e7c69]">{[item.address, item.city].filter(Boolean).join(', ') || 'Ingen adresse'}</div>
                <div className="mt-3 text-xs uppercase tracking-[0.16em] text-[#c6a884]">{link?.role || 'Tilknyttet'}</div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[24px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] p-5 text-sm text-[#d4c4b2]">Ingen sak/adresse koblet.</div>
      )}

      {availableCases.length ? (
        <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[1fr_0.8fr_auto] lg:items-end">
          <div>
            <label className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]" htmlFor="caseId">Sak</label>
            <select id="caseId" name="caseId" required className="mt-2 w-full rounded-2xl border border-[rgba(220,194,163,0.12)] bg-[#0f0c0a] px-4 py-3 text-sm text-white outline-none transition focus:border-[rgba(183,146,104,0.42)]">
              <option value="">Velg sak</option>
              {availableCases.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]" htmlFor="role">Rolle</label>
            <input id="role" name="role" required placeholder="Selger, medeier, interessent" className="mt-2 w-full rounded-2xl border border-[rgba(220,194,163,0.12)] bg-[#0f0c0a] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#6f6255] focus:border-[rgba(183,146,104,0.42)]" />
          </div>
          <button disabled={isPending} className="rounded-full border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.12)] px-5 py-3 text-xs font-medium uppercase tracking-[0.18em] text-[#ead3b7] transition hover:bg-[rgba(183,146,104,0.20)] disabled:cursor-not-allowed disabled:opacity-60" type="submit">
            {isPending ? 'Lagrer' : 'Koble'}
          </button>
          <input type="hidden" name="note" defaultValue="" />
        </form>
      ) : (
        <Link href="/cases" className="inline-flex rounded-full border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.12)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#ead3b7] transition hover:bg-[rgba(183,146,104,0.20)]">Opprett sak</Link>
      )}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {success ? <p className="text-sm text-[#c6a884]">{success}</p> : null}
    </div>
  );
}
