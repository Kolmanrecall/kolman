'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Contact } from '@/lib/types';

type ContactFormProps = {
  contact?: Contact;
  mode: 'create' | 'edit';
};

function toDateValue(value: string | null | undefined) {
  if (!value) return '';
  return value.slice(0, 10);
}

export function ContactForm({ contact, mode }: ContactFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(contact?.full_name ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [city, setCity] = useState(contact?.city ?? '');
  const [statusRaw, setStatusRaw] = useState(contact?.status_raw ?? '');
  const [lastContactedAt, setLastContactedAt] = useState(toDateValue(contact?.last_contacted_at));
  const [notes, setNotes] = useState(contact?.notes ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitLabel = useMemo(() => {
    if (isSaving) return mode === 'create' ? 'Lagrer…' : 'Oppdaterer…';
    return mode === 'create' ? 'Lagre kontakt' : 'Lagre endringer';
  }, [isSaving, mode]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(mode === 'create' ? '/api/contacts' : `/api/contacts/${contact?.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          city,
          status_raw: statusRaw,
          last_contacted_at: lastContactedAt,
          notes,
        }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Kunne ikke lagre kontakten.');

      setMessage(mode === 'create' ? 'Kontakten er lagret.' : 'Endringene er lagret.');
      router.refresh();

      if (mode === 'create') {
        router.push(`/contacts/${json.contact.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke lagre kontakten.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!contact) return;
    const confirmed = window.confirm(
      'Slette denne kontakten? Historikk, oppfølginger, meldingsutkast, prioriteringer og saks-koblinger for kontakten slettes samtidig. Dette kan også påvirke månedens resultattall.',
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/contacts/${contact.id}`, { method: 'DELETE' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Kunne ikke slette kontakten.');
      router.push('/contacts');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke slette kontakten.');
      setIsDeleting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm text-[#d4c4b2]">
          <span className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]">Navn</span>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
            className="mt-2 w-full rounded-[20px] border border-[rgba(220,194,163,0.12)] bg-[rgba(255,245,232,0.04)] px-4 py-3 text-sm text-white outline-none transition focus:border-[rgba(220,194,163,0.34)]"
          />
        </label>
        <label className="block text-sm text-[#d4c4b2]">
          <span className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]">E-post</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            className="mt-2 w-full rounded-[20px] border border-[rgba(220,194,163,0.12)] bg-[rgba(255,245,232,0.04)] px-4 py-3 text-sm text-white outline-none transition focus:border-[rgba(220,194,163,0.34)]"
          />
        </label>
        <label className="block text-sm text-[#d4c4b2]">
          <span className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]">Telefon</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="mt-2 w-full rounded-[20px] border border-[rgba(220,194,163,0.12)] bg-[rgba(255,245,232,0.04)] px-4 py-3 text-sm text-white outline-none transition focus:border-[rgba(220,194,163,0.34)]"
          />
        </label>
        <label className="block text-sm text-[#d4c4b2]">
          <span className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]">By</span>
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="mt-2 w-full rounded-[20px] border border-[rgba(220,194,163,0.12)] bg-[rgba(255,245,232,0.04)] px-4 py-3 text-sm text-white outline-none transition focus:border-[rgba(220,194,163,0.34)]"
          />
        </label>
        <label className="block text-sm text-[#d4c4b2] md:col-span-2">
          <span className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]">Status</span>
          <input
            value={statusRaw}
            onChange={(event) => setStatusRaw(event.target.value)}
            placeholder="Tidligere kunde, kjøper, selger, vurderer salg …"
            className="mt-2 w-full rounded-[20px] border border-[rgba(220,194,163,0.12)] bg-[rgba(255,245,232,0.04)] px-4 py-3 text-sm text-white outline-none transition focus:border-[rgba(220,194,163,0.34)]"
          />
        </label>
        <label className="block text-sm text-[#d4c4b2] md:col-span-2">
          <span className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]">Siste kontakt</span>
          <input
            value={lastContactedAt}
            onChange={(event) => setLastContactedAt(event.target.value)}
            type="date"
            className="mt-2 w-full rounded-[20px] border border-[rgba(220,194,163,0.12)] bg-[rgba(255,245,232,0.04)] px-4 py-3 text-sm text-white outline-none transition focus:border-[rgba(220,194,163,0.34)]"
          />
        </label>
        <label className="block text-sm text-[#d4c4b2] md:col-span-2">
          <span className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]">Notater</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={5}
            className="mt-2 w-full rounded-[20px] border border-[rgba(220,194,163,0.12)] bg-[rgba(255,245,232,0.04)] px-4 py-3 text-sm text-white outline-none transition focus:border-[rgba(220,194,163,0.34)]"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isSaving || isDeleting}
          className="rounded-full border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.12)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#ead3b7] transition hover:bg-[rgba(183,146,104,0.20)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitLabel}
        </button>
        {mode === 'edit' ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSaving || isDeleting}
            className="rounded-full border border-rose-300/20 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-rose-200 transition hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? 'Sletter…' : 'Slett kontakt'}
          </button>
        ) : null}
      </div>

      {message ? <p className="text-sm text-[#dcbf9e]">{message}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </form>
  );
}
