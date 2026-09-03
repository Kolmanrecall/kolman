'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { RecallQueueItem } from '@/lib/recall';

function priorityClass(priority: RecallQueueItem['priority']) {
  if (priority === 'high') return 'border-[rgba(183,146,104,0.36)] bg-[rgba(183,146,104,0.12)] text-[#f3dfc2]';
  if (priority === 'medium') return 'border-[rgba(183,146,104,0.22)] bg-[rgba(183,146,104,0.10)] text-[#f0dcc3]';
  return 'border-white/6 bg-white/[0.03] text-[#d4c4b2]';
}

function formatDate(date: string | null | undefined) {
  if (!date) return 'Uten dato';
  try {
    return new Intl.DateTimeFormat('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));
  } catch {
    return date;
  }
}

function formatLastContact(item: RecallQueueItem) {
  if (!item.contact.last_contacted_at) return 'Ingen registrert kontakt';
  const date = formatDate(item.contact.last_contacted_at);
  return item.daysSinceLastContact === null ? date : `${date} · ${item.daysSinceLastContact} dager`;
}

function contactSubtitle(item: RecallQueueItem) {
  const parts = [item.contact.city, item.contact.status_raw].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Ingen status';
}

function cleanPhone(value: string) {
  return value.replace(/\s+/g, '');
}

type ContactOutcome = 'spoke' | 'left_message' | 'no_answer';

export function RecallQueueClient({ items }: { items: RecallQueueItem[] }) {
  const router = useRouter();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, { type: 'success' | 'error'; text: string }>>({});
  const [outcomeContactId, setOutcomeContactId] = useState<string | null>(null);
  const [snoozeContactId, setSnoozeContactId] = useState<string | null>(null);

  function setItemMessage(contactId: string, type: 'success' | 'error', text: string) {
    setMessages((current) => ({ ...current, [contactId]: { type, text } }));
  }

  function isContactBusy(contactId: string) {
    return loadingKey?.startsWith(`${contactId}:`) ?? false;
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
          note: `Fra oppfølgingskø: ${item.reasons.join(' · ')}`,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Kunne ikke lage oppfølging.');
      setItemMessage(item.contact.id, 'success', json.message || 'Oppfølging lagret.');
      router.refresh();
    } catch (error) {
      setItemMessage(item.contact.id, 'error', error instanceof Error ? error.message : 'Kunne ikke lage oppfølging.');
    } finally {
      setLoadingKey(null);
    }
  }


  async function markContacted(item: RecallQueueItem, outcome: ContactOutcome) {
    const key = `${item.contact.id}:contacted:${outcome}`;
    setLoadingKey(key);
    setItemMessage(item.contact.id, 'success', '');

    try {
      const response = await fetch('/api/recall/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: item.contact.id, action: 'mark_contacted', outcome }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Kunne ikke registrere utfallet.');
      setItemMessage(item.contact.id, 'success', json.message || 'Utfallet er registrert.');
      setOutcomeContactId(null);
      router.refresh();
    } catch (error) {
      setItemMessage(item.contact.id, 'error', error instanceof Error ? error.message : 'Kunne ikke registrere utfallet.');
    } finally {
      setLoadingKey(null);
    }
  }

  async function snoozeContact(item: RecallQueueItem, months: 1 | 3 | 6 | 12) {
    const key = `${item.contact.id}:snooze:${months}`;
    setLoadingKey(key);
    setItemMessage(item.contact.id, 'success', '');

    try {
      const response = await fetch('/api/recall/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: item.contact.id, action: 'snooze', months }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Kunne ikke utsette kontakten.');
      setItemMessage(item.contact.id, 'success', months === 12 ? 'Kontakt skjult i 12 måneder.' : `Kontakt utsatt i ${months} måneder.`);
      setSnoozeContactId(null);
      router.refresh();
    } catch (error) {
      setItemMessage(item.contact.id, 'error', error instanceof Error ? error.message : 'Kunne ikke utsette kontakten.');
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const message = messages[item.contact.id];
        const contactBusy = isContactBusy(item.contact.id);
        const followUpLoading = loadingKey === `${item.contact.id}:follow-up`;
        const outcomeOpen = outcomeContactId === item.contact.id;
        const snoozeOpen = snoozeContactId === item.contact.id;

        return (
          <article key={item.contact.id} className="rounded-[22px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.025)] p-4 md:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <Link href={`/contacts/${item.contact.id}` as any} className="text-xl font-semibold text-white transition hover:text-[#ead3b7]">
                    {item.contact.full_name}
                  </Link>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] ${priorityClass(item.priority)}`}>
                    {item.priorityLabel}
                  </span>
                  {item.latestAttempt ? <span className="text-xs uppercase tracking-[0.16em] text-[#c6a884]">{item.latestAttempt.label}</span> : null}
                </div>
                <p className="mt-2 text-sm text-[#9f907f]">{contactSubtitle(item)}</p>

                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  {item.contact.phone ? (
                    <a href={`tel:${cleanPhone(item.contact.phone)}`} className="rounded-full border border-[rgba(183,146,104,0.28)] bg-[rgba(183,146,104,0.10)] px-3 py-1.5 font-medium text-[#f0dcc3] transition hover:bg-[rgba(183,146,104,0.18)]">
                      Ring {item.contact.phone}
                    </a>
                  ) : (
                    <span className="rounded-full border border-[rgba(220,194,163,0.10)] px-3 py-1.5 text-[#9f907f]">Ingen telefon</span>
                  )}
                  {item.contact.email ? (
                    <a href={`mailto:${item.contact.email}`} className="rounded-full border border-[rgba(220,194,163,0.10)] px-3 py-1.5 text-[#d4c4b2] transition hover:bg-[rgba(255,245,232,0.04)]">
                      {item.contact.email}
                    </a>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-[1fr_0.9fr]">
                  <div className="rounded-2xl border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#9f907f]">Hvorfor nå</p>
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
                    <p className="text-xs uppercase tracking-[0.18em] text-[#9f907f]">Arbeid</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-[#b8aa98]">
                      <div>
                        <p className="uppercase tracking-[0.16em] text-[#9f907f]">Siste kontakt</p>
                        <p className="mt-1 text-white">{formatLastContact(item)}</p>
                      </div>
                      <div>
                        <p className="uppercase tracking-[0.16em] text-[#9f907f]">Oppfølging</p>
                        <p className="mt-1 text-white">{item.openFollowUp ? formatDate(item.openFollowUp.due_date) : formatDate(item.suggestedDueDate)}</p>
                      </div>
                    </div>
                    {item.caseSignal ? (
                      <div className="mt-4 border-t border-[rgba(220,194,163,0.08)] pt-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-[#9f907f]">Sak</p>
                        <p className="mt-1 text-sm text-white">{item.caseSignal.label}</p>
                        <p className="mt-1 text-xs text-[#b8aa98]">{item.caseSignal.title}{item.caseSignal.due_date ? ` · ${formatDate(item.caseSignal.due_date)}` : ''}</p>
                      </div>
                    ) : item.hasUnsentDraft ? (
                      <div className="mt-4 border-t border-[rgba(220,194,163,0.08)] pt-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-[#9f907f]">Utkast</p>
                        <p className="mt-1 text-sm text-[#d4c4b2]">Meldingsutkast ligger på kontakten.</p>
                      </div>
                    ) : null}
                    {item.latestNote ? (
                      <div className="mt-4 border-t border-[rgba(220,194,163,0.08)] pt-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-[#9f907f]">Siste notat</p>
                        <p
                          className="mt-2 overflow-hidden text-sm leading-6 text-[#d4c4b2]"
                          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                        >
                          {item.latestNote}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 lg:w-[210px]">
                <button
                  type="button"
                  onClick={() => createFollowUp(item)}
                  disabled={contactBusy}
                  className="rounded-2xl border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.16)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[rgba(183,146,104,0.24)] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {followUpLoading ? 'Lagrer…' : item.openFollowUp ? 'Lag ny oppfølging' : 'Lag oppfølging'}
                </button>
                <button
                  type="button"
                  onClick={() => setOutcomeContactId(outcomeOpen ? null : item.contact.id)}
                  disabled={contactBusy}
                  className="rounded-2xl border border-[rgba(220,194,163,0.14)] bg-[rgba(255,245,232,0.03)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[rgba(255,245,232,0.06)] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Registrer forsøk
                </button>
                {outcomeOpen ? (
                  <div className="space-y-2 rounded-2xl border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.025)] p-3">
                    <button type="button" onClick={() => markContacted(item, 'spoke')} disabled={contactBusy} className="w-full rounded-xl px-3 py-2 text-left text-sm text-[#efe2d1] transition hover:bg-[rgba(255,245,232,0.06)] disabled:opacity-55">Snakket med</button>
                    <button type="button" onClick={() => markContacted(item, 'left_message')} disabled={contactBusy} className="w-full rounded-xl px-3 py-2 text-left text-sm text-[#efe2d1] transition hover:bg-[rgba(255,245,232,0.06)] disabled:opacity-55">La igjen beskjed</button>
                    <button type="button" onClick={() => markContacted(item, 'no_answer')} disabled={contactBusy} className="w-full rounded-xl px-3 py-2 text-left text-sm text-[#efe2d1] transition hover:bg-[rgba(255,245,232,0.06)] disabled:opacity-55">Ikke svar</button>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => setSnoozeContactId(snoozeOpen ? null : item.contact.id)}
                  disabled={contactBusy}
                  className="rounded-2xl border border-[rgba(220,194,163,0.14)] bg-[rgba(255,245,232,0.03)] px-4 py-3 text-sm font-medium text-[#d4c4b2] transition hover:bg-[rgba(255,245,232,0.06)] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Utsett
                </button>
                {snoozeOpen ? (
                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.025)] p-3">
                    {([1, 3, 6, 12] as const).map((months) => (
                      <button key={months} type="button" onClick={() => snoozeContact(item, months)} disabled={contactBusy} className="rounded-xl px-3 py-2 text-sm text-[#efe2d1] transition hover:bg-[rgba(255,245,232,0.06)] disabled:opacity-55">
                        {months === 12 ? 'Ikke relevant nå' : `${months} mnd`}
                      </button>
                    ))}
                  </div>
                ) : null}
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
