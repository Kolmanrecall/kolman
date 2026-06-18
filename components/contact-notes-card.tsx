'use client';

import { useState } from 'react';

export function ContactNotesCard({ contactId, initialNotes }: { contactId: string; initialNotes: string | null }) {
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setSavedMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/contacts/${contactId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      const json = await response.json();

      if (!response.ok) throw new Error(json.error || 'Kunne ikke lagre notatet.');
      setNotes(json.contact?.notes ?? '');
      setSavedMessage('Notatet er lagret på kontakten.');
      setTimeout(() => setSavedMessage(null), 2400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke lagre notatet.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#b8aa98]">Skriv korte notater om kontakten, tidligere dialoger eller ting som er nyttige å huske til neste oppfølging.</p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={6}
        placeholder="Skriv notater om kontakten her..."
        className="w-full rounded-[24px] border border-[rgba(220,194,163,0.14)] bg-[rgba(255,245,232,0.03)] px-4 py-3 text-sm text-white outline-none placeholder:text-[#8e7c69] focus:border-[#c59f74]"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-2xl border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.16)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[rgba(183,146,104,0.24)]"
        >
          {isSaving ? 'Lagrer…' : 'Lagre notat'}
        </button>
        {savedMessage ? <p className="text-sm text-emerald-300">{savedMessage}</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </div>
    </div>
  );
}
