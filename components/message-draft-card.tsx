'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Draft = {
  id: string;
  message_text: string;
  channel: string;
  intent: string;
  generated_by_model: string;
  approved?: boolean;
  sent?: boolean;
  created_at?: string;
};

type Props = {
  contactId: string;
  initialDraft: Draft | null;
  readOnly?: boolean;
};

export function MessageDraftCard({ contactId, initialDraft, readOnly = false }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isMarkingSent, setIsMarkingSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  async function handleGenerate() {
    setIsLoading(true);
    setError(null);
    setInfo(null);
    setExplanation(null);

    try {
      const response = await fetch('/api/ai/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, intent: 'seller-reactivation', channel: 'SMS' }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Kunne ikke lage meldingsutkast.');
      }

      setDraft(json.draft);
      setExplanation(json.explanation ?? null);
      setInfo(json.mode === 'fallback' ? 'Utkast oppdatert.' : 'Utkast oppdatert med AI.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke lage meldingsutkast.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApprove() {
    if (!draft) return;
    setIsApproving(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(`/api/message-drafts/${draft.id}/approve`, { method: 'PATCH' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Kunne ikke godkjenne utkast.');
      setDraft(json.draft);
      setInfo('Utkast markert som godkjent.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke godkjenne utkast.');
    } finally {
      setIsApproving(false);
    }
  }

  async function handleMarkSent() {
    if (!draft) return;
    setIsMarkingSent(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(`/api/message-drafts/${draft.id}/sent`, { method: 'PATCH' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Kunne ikke markere som sendt.');
      setDraft(json.draft);
      setInfo('Utkast markert som sendt.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke markere som sendt.');
    } finally {
      setIsMarkingSent(false);
    }
  }

  return (
    <div className="space-y-4">
      {draft ? (
        <div className="space-y-4 rounded-[24px] border border-[rgba(220,194,163,0.14)] bg-[rgba(255,245,232,0.03)] p-5 text-sm">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#8e7c69]">Utkast</p>
            <p className="mt-3 whitespace-pre-wrap text-zinc-100">{draft.message_text}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#8e7c69]">Formål</p>
              <p className="mt-2 font-medium text-white">{draft.intent}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#8e7c69]">Kanal</p>
              <p className="mt-2 font-medium text-white">{draft.channel.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#8e7c69]">Generert av</p>
              <p className="mt-2 font-medium text-white">{draft.generated_by_model}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#8e7c69]">Status</p>
              <p className="mt-2 font-medium text-white">{draft.sent ? 'Sendt' : draft.approved ? 'Godkjent' : 'Utkast'}</p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#b8aa98]">Ingen meldingsutkast ennå. Generer et kort, naturlig utkast basert på kontaktdata og klassifisering.</p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isLoading || readOnly}
          className="rounded-2xl border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.16)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[rgba(183,146,104,0.24)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? 'Genererer…' : draft ? 'Lag nytt utkast' : 'Generer melding'}
        </button>

        {draft ? (
          <>
            <button
              type="button"
              onClick={handleApprove}
              disabled={isApproving || draft.approved || readOnly}
              className="rounded-2xl border border-[rgba(220,194,163,0.16)] bg-[rgba(255,245,232,0.03)] px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {draft.approved ? 'Godkjent' : isApproving ? 'Godkjenner…' : 'Godkjenn utkast'}
            </button>
            <button
              type="button"
              onClick={handleMarkSent}
              disabled={isMarkingSent || draft.sent || readOnly}
              className="rounded-2xl border border-[rgba(220,194,163,0.16)] bg-[rgba(255,245,232,0.03)] px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {draft.sent ? 'Sendt' : isMarkingSent ? 'Lagrer…' : 'Marker som sendt'}
            </button>
          </>
        ) : null}
      </div>

      {explanation ? <p className="text-sm text-[#b8aa98]">{explanation}</p> : null}
      {info ? <p className="text-sm text-emerald-300">{info}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
