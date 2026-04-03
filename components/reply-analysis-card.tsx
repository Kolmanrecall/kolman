'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Analysis = {
  id?: string;
  reply_text: string;
  reply_category: string;
  next_step: string;
  suggested_response: string | null;
  created_at?: string;
};

type Draft = {
  id: string;
  message_text: string;
};

type Props = {
  contactId: string;
  messageDraft: Draft | null;
  initialAnalysis: Analysis | null;
  readOnly?: boolean;
};

export function ReplyAnalysisCard({ contactId, messageDraft, initialAnalysis, readOnly = false }: Props) {
  const router = useRouter();
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [replyText, setReplyText] = useState(initialAnalysis?.reply_text ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!replyText.trim()) {
      setError('Lim inn et svar først.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch('/api/replies/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          messageDraftId: messageDraft?.id ?? null,
          replyText,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Svaranalyse feilet.');
      }

      setAnalysis(json.analysis);
      setInfo(json.mode === 'fallback' ? 'Svaranalyse oppdatert.' : 'Svaranalyse oppdatert med AI.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Svaranalyse feilet.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {messageDraft ? (
        <div className="rounded-[24px] border border-[rgba(220,194,163,0.14)] bg-[rgba(255,245,232,0.03)] p-5 text-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-[#8e7c69]">Siste utgående melding</p>
          <p className="mt-3 whitespace-pre-wrap text-zinc-100">{messageDraft.message_text}</p>
        </div>
      ) : (
        <p className="text-sm text-[#b8aa98]">Ingen sendt eller generert melding funnet ennå. Du kan fortsatt lime inn et svar og analysere det.</p>
      )}

      <div>
        <label htmlFor="replyText" className="mb-2 block text-sm font-medium text-white">
          Lim inn svar fra kontakten
        </label>
        <textarea
          id="replyText"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          disabled={readOnly}
          rows={5}
          placeholder="F.eks. Hei, ja vi vurderer faktisk å selge etter sommeren..."
          className="w-full rounded-[24px] border border-[rgba(220,194,163,0.14)] bg-[rgba(255,245,232,0.03)] px-4 py-3 text-sm text-white outline-none placeholder:text-[#8e7c69] focus:border-[#c59f74]"
        />
      </div>

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={isLoading || readOnly}
        className="rounded-2xl border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.16)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[rgba(183,146,104,0.24)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? 'Analyserer…' : 'Analyser svar'}
      </button>

      {analysis ? (
        <div className="space-y-4 rounded-[24px] border border-[rgba(220,194,163,0.14)] bg-[rgba(255,245,232,0.03)] p-5 text-sm">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#8e7c69]">Svar-kategori</p>
            <p className="mt-2 font-medium text-white">{analysis.reply_category}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#8e7c69]">Neste steg</p>
            <p className="mt-2 font-medium text-white">{analysis.next_step}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#8e7c69]">Foreslått svar</p>
            <p className="mt-2 whitespace-pre-wrap text-zinc-100">{analysis.suggested_response || '—'}</p>
          </div>
        </div>
      ) : null}

      {info ? <p className="text-sm text-emerald-300">{info}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
