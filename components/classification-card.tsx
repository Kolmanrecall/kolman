'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  contactId: string;
  readOnly?: boolean;
  initialClassification: {
    category: string;
    warmth_score: number;
    recommended_flow: string;
    reasoning: string;
    created_at?: string;
  } | null;
};

function getWarmthTone(score: number) {
  if (score >= 8) return 'text-emerald-300';
  if (score >= 5) return 'text-amber-300';
  return 'text-[#d4c4b2]';
}

export function ClassificationCard({ contactId, initialClassification, readOnly = false }: Props) {
  const router = useRouter();
  const [classification, setClassification] = useState(initialClassification);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleClassify() {
    setIsLoading(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch('/api/ai/classify-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Klassifisering feilet.');
      }

      setClassification(json.classification);
      setInfo(json.mode === 'fallback' ? 'Klassifisering oppdatert.' : 'Klassifisering oppdatert med AI.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Klassifisering feilet.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {classification ? (
        <div className="space-y-4 rounded-[24px] border border-[rgba(220,194,163,0.14)] bg-[rgba(255,245,232,0.03)] p-5 text-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#8e7c69]">Kategori</p>
              <p className="mt-2 font-medium text-white">{classification.category}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#8e7c69]">Varmegrad</p>
              <p className={`mt-2 font-medium ${getWarmthTone(classification.warmth_score)}`}>{classification.warmth_score}/10</p>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#8e7c69]">Anbefalt flyt</p>
            <p className="mt-2 font-medium text-white">{classification.recommended_flow}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#8e7c69]">Begrunnelse</p>
            <p className="mt-2 text-[#d4c4b2]">{classification.reasoning}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#b8aa98]">Ingen klassifisering ennå. Trykk under for å analysere kontakten.</p>
      )}

      <button
        type="button"
        onClick={handleClassify}
        disabled={isLoading || readOnly}
        className="rounded-2xl border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.16)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[rgba(183,146,104,0.24)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? 'Klassifiserer…' : classification ? 'Kjør klassifisering på nytt' : 'Klassifiser kontakt'}
      </button>

      {info ? <p className="text-sm text-emerald-300">{info}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
