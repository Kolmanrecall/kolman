'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CASE_STATUS_OPTIONS } from '@/lib/case-status';
import type { PropertyCase } from '@/lib/types';

export function CaseUpdateForm({ propertyCase }: { propertyCase: PropertyCase }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      title: String(formData.get('title') || '').trim(),
      address: String(formData.get('address') || '').trim() || null,
      city: String(formData.get('city') || '').trim() || null,
      status: String(formData.get('status') || 'lead'),
      nextStep: String(formData.get('nextStep') || '').trim() || null,
      nextStepDueDate: String(formData.get('nextStepDueDate') || '').trim() || null,
      notes: String(formData.get('notes') || '').trim() || null,
    };

    const response = await fetch(`/api/cases/${propertyCase.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error || 'Kunne ikke oppdatere saken.');
      return;
    }

    setSuccess('Saken er oppdatert.');
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]" htmlFor="title">Navn</label>
        <input id="title" name="title" required defaultValue={propertyCase.title} className="mt-2 w-full rounded-2xl border border-[rgba(220,194,163,0.12)] bg-[#0f0c0a] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#6f6255] focus:border-[rgba(183,146,104,0.42)]" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]" htmlFor="address">Adresse</label>
          <input id="address" name="address" defaultValue={propertyCase.address ?? ''} className="mt-2 w-full rounded-2xl border border-[rgba(220,194,163,0.12)] bg-[#0f0c0a] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#6f6255] focus:border-[rgba(183,146,104,0.42)]" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]" htmlFor="city">By</label>
          <input id="city" name="city" defaultValue={propertyCase.city ?? ''} className="mt-2 w-full rounded-2xl border border-[rgba(220,194,163,0.12)] bg-[#0f0c0a] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#6f6255] focus:border-[rgba(183,146,104,0.42)]" />
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]" htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={propertyCase.status} className="mt-2 w-full rounded-2xl border border-[rgba(220,194,163,0.12)] bg-[#0f0c0a] px-4 py-3 text-sm text-white outline-none transition focus:border-[rgba(183,146,104,0.42)]">
          {CASE_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_170px]">
        <div>
          <label className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]" htmlFor="nextStep">Neste steg</label>
          <input id="nextStep" name="nextStep" defaultValue={propertyCase.next_step ?? ''} placeholder="Ring selger om verdivurdering" className="mt-2 w-full rounded-2xl border border-[rgba(220,194,163,0.12)] bg-[#0f0c0a] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#6f6255] focus:border-[rgba(183,146,104,0.42)]" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]" htmlFor="nextStepDueDate">Dato</label>
          <input id="nextStepDueDate" name="nextStepDueDate" type="date" defaultValue={propertyCase.next_step_due_date ?? ''} className="mt-2 w-full rounded-2xl border border-[rgba(220,194,163,0.12)] bg-[#0f0c0a] px-4 py-3 text-sm text-white outline-none transition focus:border-[rgba(183,146,104,0.42)]" />
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]" htmlFor="notes">Notat</label>
        <textarea id="notes" name="notes" rows={4} defaultValue={propertyCase.notes ?? ''} className="mt-2 w-full resize-none rounded-2xl border border-[rgba(220,194,163,0.12)] bg-[#0f0c0a] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#6f6255] focus:border-[rgba(183,146,104,0.42)]" />
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {success ? <p className="text-sm text-[#c6a884]">{success}</p> : null}

      <button disabled={isPending} className="rounded-full border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.12)] px-5 py-3 text-xs font-medium uppercase tracking-[0.18em] text-[#ead3b7] transition hover:bg-[rgba(183,146,104,0.20)] disabled:cursor-not-allowed disabled:opacity-60" type="submit">
        {isPending ? 'Lagrer' : 'Lagre sak'}
      </button>
    </form>
  );
}
