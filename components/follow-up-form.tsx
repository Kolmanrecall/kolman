'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type FollowUpContact = {
  id: string;
  full_name: string;
  city: string | null;
};

type SaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

function getDefaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

export function FollowUpForm({
  contacts,
  fixedContactId,
  compact = false,
}: {
  contacts?: FollowUpContact[];
  fixedContactId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const selectableContacts = contacts ?? [];
  const [contactId, setContactId] = useState(fixedContactId ?? selectableContacts[0]?.id ?? '');
  const [title, setTitle] = useState('Følg opp kunden');
  const [dueDate, setDueDate] = useState(getDefaultDueDate());
  const [note, setNote] = useState('');
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' });

  const canSave = Boolean(contactId && title.trim().length >= 2 && saveState.status !== 'saving');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    setSaveState({ status: 'saving' });

    try {
      const response = await fetch('/api/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, title, dueDate: dueDate || null, note: note || null }),
      });
      const json = await response.json();

      if (!response.ok) throw new Error(json.error || 'Kunne ikke lagre oppfølgingen.');

      setTitle('Følg opp kunden');
      setDueDate(getDefaultDueDate());
      setNote('');
      setSaveState({ status: 'success', message: 'Oppfølgingen er lagret.' });
      router.refresh();
    } catch (error) {
      setSaveState({ status: 'error', message: error instanceof Error ? error.message : 'Kunne ikke lagre oppfølgingen.' });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!fixedContactId ? (
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-[#8e7c69]" htmlFor="follow-up-contact">
            Kontakt
          </label>
          <select
            id="follow-up-contact"
            value={contactId}
            onChange={(event) => setContactId(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-[rgba(220,194,163,0.14)] bg-[#17120f] px-4 py-3 text-sm text-white outline-none focus:border-[#c59f74]"
          >
            {selectableContacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.full_name}{contact.city ? ` · ${contact.city}` : ''}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className={compact ? 'grid gap-4 sm:grid-cols-[1fr_160px]' : 'grid gap-4 md:grid-cols-[1fr_170px]'}>
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-[#8e7c69]" htmlFor="follow-up-title">
            Oppfølging
          </label>
          <input
            id="follow-up-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="F.eks. Ring om verdivurdering"
            className="mt-2 w-full rounded-2xl border border-[rgba(220,194,163,0.14)] bg-[rgba(255,245,232,0.03)] px-4 py-3 text-sm text-white outline-none placeholder:text-[#8e7c69] focus:border-[#c59f74]"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-[#8e7c69]" htmlFor="follow-up-date">
            Dato
          </label>
          <input
            id="follow-up-date"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-[rgba(220,194,163,0.14)] bg-[rgba(255,245,232,0.03)] px-4 py-3 text-sm text-white outline-none focus:border-[#c59f74]"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.2em] text-[#8e7c69]" htmlFor="follow-up-note">
          Notat
        </label>
        <textarea
          id="follow-up-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={compact ? 3 : 4}
          placeholder="Kort kontekst: hvorfor skal kontakten følges opp?"
          className="mt-2 w-full rounded-[22px] border border-[rgba(220,194,163,0.14)] bg-[rgba(255,245,232,0.03)] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-[#8e7c69] focus:border-[#c59f74]"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={!canSave}
          className="rounded-2xl border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.16)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[rgba(183,146,104,0.24)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {saveState.status === 'saving' ? 'Lagrer…' : 'Lag oppfølging'}
        </button>

        <div className="min-h-6 text-sm">
          {saveState.status === 'success' ? <p className="text-emerald-300">{saveState.message}</p> : null}
          {saveState.status === 'error' ? <p className="text-rose-300">{saveState.message}</p> : null}
        </div>
      </div>
    </form>
  );
}
