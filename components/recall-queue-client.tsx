'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { RecallQueueItem } from '@/lib/recall';

function priorityClass(priority: RecallQueueItem['priority']) {
  if (priority === 'high') return 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100';
  if (priority === 'medium') return 'border-[rgba(183,146,104,0.22)] bg-[rgba(183,146,104,0.10)] text-[#f0dcc3]';
  return 'border-white/6 bg-white/[0.03] text-[#d4c4b2]';
}

function formatDate(date: string | null | undefined) {
  if (!date) return 'Uten dato';
  try {
    return new Intl.DateTimeFormat('no-NO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));
  } catch {
    return date;
  }
}

function contactSubtitle(item: RecallQueueItem) {
  const parts = [item.contact.city, item.contact.status_raw].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Ingen status';
}

export function RecallQueueClient({ items }: { items: RecallQueueItem[] }) {
  const router = useRouter();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, { type: 'success' | 'error'; text: string }>>({});

  function setItemMessage(contactId: string, type: 'success' | 'error', text: string) {
    setMessages((current) => ({ ...current, [contactId]: { type, text } }));
  }

  async function createFollowUp(item: RecallQueueItem) {
    const key = `${item.contact.id}:follow-up`;
    setLoadingKey(key);
    setItemMessage(item.contact.id, 'success', '');

    try {
      const response = await fetch('/api/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: item.contact.id,
          title: item.suggestedFollowUpTitle,
          dueDate: item.suggestedDueDate,
          note: `Fra recall-kø: ${item.reasons.join(' · ')}`,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Kunne ikke lage oppfølging.');
      setItemMessage(item.contact.id, 'success', 'Oppfølging lagret.');
      router.refresh();
    } catch (error) {
      setItemMessage(item.contact.id, 'error', error instanceof Error ? error.message : 'Kunne ikke lage oppfølging.');
    } finally {
      setLoadingKey(null);
    }
  }

  async function generateMessage(item: RecallQueueItem) {
    const key = `${item.contact.id}:message`;
    setLoadingKey(key);
    setItemMessage(item.contact.id, 'success', '');

    try {
      const response = await fetch('/api/ai/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: item.contact.id, intent: 'seller-reactivation', channel: 'SMS' }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Kunne ikke lage meldingsutkast.');
      setItemMessage(item.contact.id, 'success', 'Meldingsutkast lagret på kontakten.');
      router.refresh();
    } catch (error) {
      setItemMessage(item.contact.id, 'error', error instanceof Error ? error.message : 'Kunne ikke lage meldingsutkast.');
    } finally {
      setLoadingKey(null);
    }
  }

  async function markContacted(item: RecallQueueItem) {
    const key = `${item.contact.id}:contacted`;
    setLoadingKey(key);
    setItemMessage(item.contact.id, 'success', '');

    try {
      const response = await fetch('/api/recall/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: item.contact.id, action: 'mark_contacted' }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Kunne ikke markere som kontaktet.');
      setItemMessage(item.contact.id, 'success', 'Kontakt markert som fulgt opp.');
      router.refresh();
    } catch (error) {
      setItemMessage(item.contact.id, 'error', error instanceof Error ? error.message : 'Kunne ikke markere som kontaktet.');
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const message = messages[item.contact.id];
        const followUpLoading = loadingKey === `${item.contact.id}:follow-up`;
        const messageLoading = loadingKey === `${item.contact.id}:message`;
        const contactedLoading = loadingKey === `${item.contact.id}:contacted`;

        return (
          <article key={item.contact.id} className="rounded-[28px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.025)] p-5 md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <Link href={`/contacts/${item.contact.id}` as any} className="text-xl font-semibold text-white transition hover:text-[#ead3b7]">
                    {item.contact.full_name}
                  </Link>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] ${priorityClass(item.priority)}`}>
                    {item.priorityLabel}
                  </span>
                  <span className="text-xs uppercase tracking-[0.16em] text-[#8e7c69]">Score {item.score}</span>
                </div>
                <p className="mt-2 text-sm text-[#8e7c69]">{contactSubtitle(item)}</p>

                <div className="mt-5 grid gap-3 md:grid-cols-[1fr_0.85fr]">
                  <div className="rounded-2xl border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]">Hvorfor nå</p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-[#d4c4b2]">
                      {item.reasons.map((reason) => (
                        <li key={reason} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c6a884]" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]">Neste handling</p>
                    <p className="mt-3 text-sm leading-6 text-white">{item.recommendedAction}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-[#b8aa98]">
                      <div>
                        <p className="uppercase tracking-[0.16em] text-[#8e7c69]">Oppfølging</p>
                        <p className="mt-1 text-white">{item.openFollowUp ? formatDate(item.openFollowUp.due_date) : formatDate(item.suggestedDueDate)}</p>
                      </div>
                      <div>
                        <p className="uppercase tracking-[0.16em] text-[#8e7c69]">Saker</p>
                        <p className="mt-1 text-white">{item.linkedCaseCount}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 lg:w-[220px]">
                <button
                  type="button"
                  onClick={() => createFollowUp(item)}
                  disabled={Boolean(loadingKey)}
                  className="rounded-2xl border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.16)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[rgba(183,146,104,0.24)] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {followUpLoading ? 'Lagrer…' : item.openFollowUp ? 'Lag ny oppfølging' : 'Lag oppfølging'}
                </button>
                <button
                  type="button"
                  onClick={() => generateMessage(item)}
                  disabled={Boolean(loadingKey)}
                  className="rounded-2xl border border-[rgba(220,194,163,0.14)] bg-[rgba(255,245,232,0.03)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[rgba(255,245,232,0.06)] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {messageLoading ? 'Lager…' : item.hasUnsentDraft ? 'Lag nytt utkast' : 'Lag melding'}
                </button>
                <button
                  type="button"
                  onClick={() => markContacted(item)}
                  disabled={Boolean(loadingKey)}
                  className="rounded-2xl border border-[rgba(220,194,163,0.14)] bg-[rgba(255,245,232,0.03)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[rgba(255,245,232,0.06)] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {contactedLoading ? 'Markerer…' : 'Marker kontaktet'}
                </button>
                <Link href={`/contacts/${item.contact.id}` as any} className="rounded-2xl border border-transparent px-4 py-3 text-center text-sm font-medium text-[#d4c4b2] transition hover:border-[rgba(220,194,163,0.10)] hover:bg-[rgba(255,245,232,0.03)]">
                  Åpne kontakt
                </Link>
              </div>
            </div>

            {message?.text ? (
              <p className={`mt-4 text-sm ${message.type === 'success' ? 'text-emerald-300' : 'text-rose-300'}`}>{message.text}</p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
