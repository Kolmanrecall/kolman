'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { RecallQueueItem } from '@/lib/recall';

function priorityBarClass(priority: RecallQueueItem['priority']) {
  if (priority === 'high') return 'bg-[#b79268]';
  if (priority === 'medium') return 'bg-[#6e5637]';
  return 'bg-[#2e2924]';
}

function priorityLabel(priority: RecallQueueItem['priority']) {
  if (priority === 'high') return 'Høy';
  if (priority === 'medium') return 'Medium';
  return 'Lav';
}

function formatDate(date: string | null | undefined) {
  if (!date) return '—';
  try {
    return new Intl.DateTimeFormat('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date));
  } catch {
    return date;
  }
}

function formatDays(item: RecallQueueItem) {
  if (!item.contact.last_contacted_at) return 'Aldri kontaktet';
  if (item.daysSinceLastContact === null) return 'Registrert kontakt';
  if (item.daysSinceLastContact === 0) return 'I dag';
  return `${item.daysSinceLastContact} dager`;
}

function contactSubtitle(item: RecallQueueItem) {
  const parts = [item.contact.city, item.contact.status_raw].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Ingen status';
}

function cleanPhone(value: string) {
  return value.replace(/\s+/g, '');
}

function shortEmail(email: string) {
  if (email.length <= 22) return email;
  const [name, domain] = email.split('@');
  if (!domain) return `${email.slice(0, 19)}…`;
  return `${name.slice(0, 14)}…@${domain.slice(0, 10)}`;
}

function primaryReason(reason: string) {
  const separatorIndex = reason.indexOf(':');
  if (separatorIndex === -1) return <span className="font-medium text-[#d6cec3]">{reason}</span>;
  return (
    <>
      <span className="font-medium text-[#d6cec3]">{reason.slice(0, separatorIndex + 1)}</span>
      <span> {reason.slice(separatorIndex + 1).trim()}</span>
    </>
  );
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
    <div>
      {items.map((item, index) => {
        const message = messages[item.contact.id];
        const contactBusy = isContactBusy(item.contact.id);
        const followUpLoading = loadingKey === `${item.contact.id}:follow-up`;
        const outcomeOpen = outcomeContactId === item.contact.id;
        const snoozeOpen = snoozeContactId === item.contact.id;
        const phoneHref = item.contact.phone ? `tel:${cleanPhone(item.contact.phone)}` : undefined;
        const reasons = item.reasons.slice(0, 2);

        return (
          <article
            key={item.contact.id}
            className="kolman-data-row group relative grid min-h-[74px] grid-cols-[34px_3px_minmax(0,1fr)] gap-x-3 py-3 transition md:grid-cols-[46px_3px_minmax(190px,1.15fr)_132px_132px_172px] md:gap-x-5"
          >
            <div className="pt-1 font-mono text-[13px] tabular-nums text-[#8a8177]">{String(index + 1).padStart(2, '0')}</div>
            <div className={`h-full min-h-[50px] w-[3px] ${priorityBarClass(item.priority)}`} aria-label={`Prioritet: ${priorityLabel(item.priority)}`} />

            <div className="min-w-0">
              <Link href={`/contacts/${item.contact.id}` as any} className="kolman-focus-ring text-[15px] font-medium text-[#f0ebe4] transition hover:text-white">
                {item.contact.full_name}
              </Link>
              <p className="mt-1 truncate text-[12.5px] text-[#8a8177]">{contactSubtitle(item)}</p>
            </div>

            <div className="mt-3 min-w-0 md:mt-0">
              {item.contact.phone ? (
                <a href={phoneHref} className="kolman-focus-ring font-mono text-[13.5px] tabular-nums text-[#f0ebe4] underline decoration-[#6e5637] underline-offset-4 transition hover:decoration-[#b79268]">
                  {item.contact.phone}
                </a>
              ) : (
                <p className="font-mono text-[13.5px] text-[#8a8177]">Ingen telefon</p>
              )}
              <p className="mt-1 truncate text-[12.5px] text-[#8a8177]">{item.contact.email ? shortEmail(item.contact.email) : 'Ingen e-post'}</p>
            </div>

            <div className="mt-3 md:mt-0">
              <p className="font-mono text-[13.5px] tabular-nums text-[#f0ebe4]">{formatDate(item.contact.last_contacted_at)}</p>
              <p className="mt-1 text-[12.5px] text-[#8a8177]">{formatDays(item)}</p>
            </div>

            <div className="relative mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] md:mt-0 md:block">
              {item.contact.phone ? (
                <a href={phoneHref} className="kolman-focus-ring inline-flex rounded-[8px] bg-[#b79268] px-4 py-2 font-semibold text-[#17120e] transition hover:bg-[#c8a77c]">
                  Ring
                </a>
              ) : (
                <span className="inline-flex rounded-[8px] border border-[#2e2924] px-4 py-2 font-medium text-[#8a8177]">Ring</span>
              )}
              <div className="mt-0 flex flex-wrap gap-x-4 gap-y-2 md:mt-2">
                <button
                  type="button"
                  onClick={() => createFollowUp(item)}
                  disabled={contactBusy}
                  className="kolman-focus-ring text-[#a79e92] transition hover:text-[#f0ebe4] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {followUpLoading ? 'Lagrer…' : 'Følg opp'}
                </button>
                <button
                  type="button"
                  onClick={() => setSnoozeContactId(snoozeOpen ? null : item.contact.id)}
                  disabled={contactBusy}
                  className="kolman-focus-ring text-[#a79e92] transition hover:text-[#f0ebe4] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Utsett
                </button>
                <button
                  type="button"
                  onClick={() => setOutcomeContactId(outcomeOpen ? null : item.contact.id)}
                  disabled={contactBusy}
                  className="kolman-focus-ring text-[#a79e92] transition hover:text-[#f0ebe4] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Utfall
                </button>
                <Link href={`/contacts/${item.contact.id}` as any} className="kolman-focus-ring text-[#8a8177] transition hover:text-[#f0ebe4]">
                  Åpne
                </Link>
              </div>

              {outcomeOpen ? (
                <div className="absolute right-0 top-[58px] z-30 w-52 border border-[#231f1c] bg-[#141110] p-2 shadow-[0_18px_48px_rgba(0,0,0,0.28)]">
                  <button type="button" onClick={() => markContacted(item, 'spoke')} disabled={contactBusy} className="kolman-focus-ring block w-full px-3 py-2 text-left text-sm text-[#f0ebe4] transition hover:bg-[#1d1916] disabled:opacity-55">Snakket med</button>
                  <button type="button" onClick={() => markContacted(item, 'left_message')} disabled={contactBusy} className="kolman-focus-ring block w-full px-3 py-2 text-left text-sm text-[#f0ebe4] transition hover:bg-[#1d1916] disabled:opacity-55">La igjen beskjed</button>
                  <button type="button" onClick={() => markContacted(item, 'no_answer')} disabled={contactBusy} className="kolman-focus-ring block w-full px-3 py-2 text-left text-sm text-[#f0ebe4] transition hover:bg-[#1d1916] disabled:opacity-55">Ikke svar</button>
                </div>
              ) : null}

              {snoozeOpen ? (
                <div className="absolute right-0 top-[58px] z-30 grid w-56 grid-cols-2 gap-1 border border-[#231f1c] bg-[#141110] p-2 shadow-[0_18px_48px_rgba(0,0,0,0.28)]">
                  {([1, 3, 6, 12] as const).map((months) => (
                    <button key={months} type="button" onClick={() => snoozeContact(item, months)} disabled={contactBusy} className="kolman-focus-ring px-3 py-2 text-left text-sm text-[#f0ebe4] transition hover:bg-[#1d1916] disabled:opacity-55">
                      {months === 12 ? 'Ikke relevant' : `${months} mnd`}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="col-span-full ml-[49px] mt-1 min-w-0 md:col-start-3 md:col-end-7 md:ml-0">
              <p className="kolman-line-clamp-2 text-[13px] leading-5 text-[#a79e92]" title={[...reasons, item.latestNote ? `Notat: ${item.latestNote}` : ''].filter(Boolean).join(' · ')}>
                {reasons.length ? (
                  <>
                    {primaryReason(reasons[0])}
                    {reasons[1] ? <span> · {reasons[1]}</span> : null}
                    {item.latestNote ? <span className="text-[#8a8177]"> · Notat: {item.latestNote}</span> : null}
                  </>
                ) : item.latestNote ? (
                  <span>Notat: {item.latestNote}</span>
                ) : (
                  <span>Åpne kontakten for mer kontekst.</span>
                )}
              </p>
              {message?.text ? (
                <p className={`mt-1 text-[13px] ${message.type === 'success' ? 'text-[#d6cec3]' : 'text-[#c4674f]'}`}>{message.text}</p>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
