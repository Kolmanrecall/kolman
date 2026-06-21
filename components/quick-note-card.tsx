'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type QuickNoteContact = {
  id: string;
  full_name: string;
  city: string | null;
  status_raw: string | null;
};

type SaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'success'; contactId: string; contactName: string }
  | { status: 'error'; message: string };

export function QuickNoteCard({ contacts }: { contacts: QuickNoteContact[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedContactId, setSelectedContactId] = useState(contacts[0]?.id ?? '');
  const [note, setNote] = useState('');
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' });

  const filteredContacts = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) return contacts;

    return contacts.filter((contact) => {
      const haystack = `${contact.full_name} ${contact.city ?? ''} ${contact.status_raw ?? ''}`.toLowerCase();
      return haystack.includes(trimmedQuery);
    });
  }, [contacts, query]);

  const selectedContact = contacts.find((contact) => contact.id === selectedContactId) ?? contacts[0] ?? null;
  const canSave = Boolean(selectedContactId && note.trim().length >= 2 && saveState.status !== 'saving');

  async function handleSave() {
    if (!canSave || !selectedContact) return;

    setSaveState({ status: 'saving' });

    try {
      const response = await fetch('/api/quick-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: selectedContactId, note }),
      });
      const json = await response.json();

      if (!response.ok) throw new Error(json.error || 'Kunne ikke lagre hurtignotatet.');

      setNote('');
      setQuery('');
      setSaveState({ status: 'success', contactId: selectedContact.id, contactName: selectedContact.full_name });
      router.refresh();
    } catch (error) {
      setSaveState({ status: 'error', message: error instanceof Error ? error.message : 'Kunne ikke lagre hurtignotatet.' });
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[0.7fr_1fr]">
        <div className="space-y-3">
          <label className="block text-xs uppercase tracking-[0.2em] text-[#8e7c69]" htmlFor="quick-note-search">
            Finn kontakt
          </label>
          <input
            id="quick-note-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Søk på navn, by eller status"
            className="w-full rounded-2xl border border-[rgba(220,194,163,0.14)] bg-[rgba(255,245,232,0.03)] px-4 py-3 text-sm text-white outline-none placeholder:text-[#8e7c69] focus:border-[#c59f74]"
          />
          <select
            value={selectedContactId}
            onChange={(event) => setSelectedContactId(event.target.value)}
            className="w-full rounded-2xl border border-[rgba(220,194,163,0.14)] bg-[#17120f] px-4 py-3 text-sm text-white outline-none focus:border-[#c59f74]"
          >
            {filteredContacts.length ? (
              filteredContacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.full_name}{contact.city ? ` · ${contact.city}` : ''}
                </option>
              ))
            ) : (
              <option value={selectedContactId}>Ingen treff</option>
            )}
          </select>
          <p className="text-xs leading-5 text-[#8e7c69]">
            Første versjon bruker manuell kontaktvalg. Det gjør lagringen trygg og unngår at notater havner på feil kunde.
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-xs uppercase tracking-[0.2em] text-[#8e7c69]" htmlFor="quick-note-body">
            Hurtignotat
          </label>
          <textarea
            id="quick-note-body"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={7}
            placeholder="F.eks. Snakket med Per. Vurderer salg etter sommeren. Følg opp i august."
            className="w-full rounded-[24px] border border-[rgba(220,194,163,0.14)] bg-[rgba(255,245,232,0.03)] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-[#8e7c69] focus:border-[#c59f74]"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="rounded-2xl border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.16)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[rgba(183,146,104,0.24)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {saveState.status === 'saving' ? 'Lagrer…' : 'Lagre på kontakt'}
        </button>

        <div className="min-h-6 text-sm">
          {saveState.status === 'success' ? (
            <p className="text-emerald-300">
              Lagret på{' '}
              <Link href={`/contacts/${saveState.contactId}`} className="underline decoration-[rgba(167,243,208,0.45)] underline-offset-4">
                {saveState.contactName}
              </Link>
              .
            </p>
          ) : null}
          {saveState.status === 'error' ? <p className="text-rose-300">{saveState.message}</p> : null}
        </div>
      </div>
    </div>
  );
}
