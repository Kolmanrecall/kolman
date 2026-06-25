'use client';

import { useState, useTransition } from 'react';

export function AccountDataPanel() {
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleExport() {
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/account/export', { method: 'GET' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Eksport feilet.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kolman-rapport-${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage('Dataeksporten er lastet ned som en lesbar rapport.');
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Eksport feilet.');
    }
  }

  function handleDelete() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch('/api/account/delete-data', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmation }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Sletting feilet.');

        setConfirmation('');
        setMessage('Importerte kontakter, notater, historikk og oppfølginger er slettet.');
        window.location.href = '/dashboard';
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : 'Sletting feilet.');
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Eksporter data</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#b8aa98]">
              Last ned en lesbar rapport med egne kontakter, notater, oppfølginger, historikk og lagrede utkast.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-full border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.12)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#ead3b7] transition hover:bg-[rgba(183,146,104,0.20)]"
          >
            Last ned rapport
          </button>
        </div>
      </div>

      <div className="rounded-[28px] border border-[rgba(190,84,66,0.22)] bg-[rgba(190,84,66,0.04)] p-6">
        <h3 className="text-lg font-semibold text-white">Slett arbeidsdata</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#b8aa98]">
          Sletter importerte kontakter, notater, historikk, oppfølginger og meldingsutkast for din bruker. Kontoen beholdes.
        </p>
        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="Skriv SLETT"
            className="min-h-11 flex-1 rounded-2xl border border-[rgba(220,194,163,0.10)] bg-[#0f0c0a] px-4 text-sm text-white outline-none transition placeholder:text-[#6f6254] focus:border-[rgba(183,146,104,0.45)]"
          />
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending || confirmation !== 'SLETT'}
            className="rounded-full border border-[rgba(190,84,66,0.30)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#f0b2a8] transition hover:bg-[rgba(190,84,66,0.10)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isPending ? 'Sletter' : 'Slett data'}
          </button>
        </div>
      </div>

      {message ? <p className="rounded-2xl border border-[rgba(116,160,119,0.22)] bg-[rgba(116,160,119,0.06)] px-4 py-3 text-sm text-[#cfe5cf]">{message}</p> : null}
      {error ? <p className="rounded-2xl border border-[rgba(190,84,66,0.22)] bg-[rgba(190,84,66,0.06)] px-4 py-3 text-sm text-[#f0b2a8]">{error}</p> : null}
    </div>
  );
}
