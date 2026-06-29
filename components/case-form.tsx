'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function CaseForm() {
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
      status: String(formData.get('status') || 'active'),
      notes: String(formData.get('notes') || '').trim() || null,
    };

    const response = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error || 'Kunne ikke opprette saken.');
      return;
    }

    form.reset();
    setSuccess('Sak opprettet.');
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]" htmlFor="title">Navn</label>
        <input id="title" name="title" required placeholder="Oscars gate 12" className="mt-2 w-full rounded-2xl border border-[rgba(220,194,163,0.12)] bg-[#0f0c0a] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#6f6255] focus:border-[rgba(183,146,104,0.42)]" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]" htmlFor="address">Adresse</label>
          <input id="address" name="address" placeholder="Oscars gate 12" className="mt-2 w-full rounded-2xl border border-[rgba(220,194,163,0.12)] bg-[#0f0c0a] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#6f6255] focus:border-[rgba(183,146,104,0.42)]" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]" htmlFor="city">By</label>
          <input id="city" name="city" placeholder="Oslo" className="mt-2 w-full rounded-2xl border border-[rgba(220,194,163,0.12)] bg-[#0f0c0a] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#6f6255] focus:border-[rgba(183,146,104,0.42)]" />
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]" htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue="active" className="mt-2 w-full rounded-2xl border border-[rgba(220,194,163,0.12)] bg-[#0f0c0a] px-4 py-3 text-sm text-white outline-none transition focus:border-[rgba(183,146,104,0.42)]">
          <option value="active">Aktiv</option>
          <option value="paused">Avventer</option>
          <option value="closed">Lukket</option>
        </select>
      </div>

      <div>
        <label className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]" htmlFor="notes">Notat</label>
        <textarea id="notes" name="notes" rows={4} placeholder="Eiere, situasjon eller relevant kontekst." className="mt-2 w-full resize-none rounded-2xl border border-[rgba(220,194,163,0.12)] bg-[#0f0c0a] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#6f6255] focus:border-[rgba(183,146,104,0.42)]" />
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {success ? <p className="text-sm text-[#c6a884]">{success}</p> : null}

      <button disabled={isPending} className="rounded-full border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.12)] px-5 py-3 text-xs font-medium uppercase tracking-[0.18em] text-[#ead3b7] transition hover:bg-[rgba(183,146,104,0.20)] disabled:cursor-not-allowed disabled:opacity-60" type="submit">
        {isPending ? 'Lagrer' : 'Opprett sak'}
      </button>
    </form>
  );
}
