'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FollowUp } from '@/lib/types';

function formatDueDate(date: string | null) {
  if (!date) return 'Ingen dato';
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
}

function dueTone(date: string | null, status: string) {
  if (status === 'completed') return 'Ferdig';
  if (!date) return 'Uten dato';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${date}T00:00:00`);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) return 'Forfalt';
  if (diffDays === 0) return 'I dag';
  if (diffDays <= 7) return 'Denne uken';
  return 'Planlagt';
}

export function FollowUpList({ followUps, showContact = true }: { followUps: FollowUp[]; showContact?: boolean }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patchFollowUp(id: string, path: 'complete' | 'postpone') {
    setBusyId(id);
    setError(null);

    try {
      const response = await fetch(`/api/follow-ups/${id}/${path}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: path === 'postpone' ? JSON.stringify({ days: 7 }) : undefined,
      });
      const json = await response.json();

      if (!response.ok) throw new Error(json.error || 'Kunne ikke oppdatere oppfølgingen.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke oppdatere oppfølgingen.');
    } finally {
      setBusyId(null);
    }
  }

  if (!followUps.length) {
    return (
      <div className="rounded-[24px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] p-5 text-sm leading-6 text-[#b8aa98]">
        Ingen åpne oppfølginger.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {followUps.map((followUp) => (
        <div key={followUp.id} className="rounded-[24px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[rgba(183,146,104,0.20)] bg-[rgba(183,146,104,0.08)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[#f0dcc3]">
                  {dueTone(followUp.due_date, followUp.status)}
                </span>
                <span className="text-xs text-[#8e7c69]">{formatDueDate(followUp.due_date)}</span>
              </div>
              <h3 className="mt-2 font-medium text-white">{followUp.title}</h3>
              {showContact && followUp.contact ? (
                <Link href={`/contacts/${followUp.contact.id}`} className="mt-1 inline-block text-xs text-[#c6a884] underline decoration-[rgba(198,168,132,0.32)] underline-offset-4">
                  {followUp.contact.full_name}{followUp.contact.city ? ` · ${followUp.contact.city}` : ''}
                </Link>
              ) : null}
              {followUp.note ? <p className="mt-2 text-sm leading-6 text-[#b8aa98]">{followUp.note}</p> : null}
            </div>

            {followUp.status !== 'completed' ? (
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => patchFollowUp(followUp.id, 'postpone')}
                  disabled={busyId === followUp.id}
                  className="rounded-full border border-[rgba(220,194,163,0.12)] px-3 py-2 text-xs font-medium text-[#d4c4b2] transition hover:bg-[rgba(255,245,232,0.05)] disabled:opacity-45"
                >
                  Utsett 7 dager
                </button>
                <button
                  type="button"
                  onClick={() => patchFollowUp(followUp.id, 'complete')}
                  disabled={busyId === followUp.id}
                  className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-100 transition hover:bg-emerald-400/15 disabled:opacity-45"
                >
                  Ferdig
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ))}

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
