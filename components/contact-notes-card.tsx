'use client';

import { useState } from 'react';

export function ContactNotesCard({ initialNotes }: { initialNotes: string | null }) {
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
          className="rounded-2xl border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.16)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[rgba(183,146,104,0.24)]"
        >
          Lagre notat
        </button>
        {saved ? <p className="text-sm text-emerald-300">Notat lagret lokalt i denne versjonen.</p> : null}
      </div>
    </div>
  );
}
