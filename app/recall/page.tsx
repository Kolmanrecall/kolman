import Link from 'next/link';
import { Shell } from '@/components/shell';
import { SectionCard } from '@/components/section-card';
import { RecallQueueClient } from '@/components/recall-queue-client';
import { getRecallQueue, getRecallSnoozedCount } from '@/lib/recall';
import { requirePageUser } from '@/lib/page-auth';

export default async function RecallPage() {
  await requirePageUser();
  const [items, snoozedCount] = await Promise.all([getRecallQueue(60), getRecallSnoozedCount()]);
  const high = items.filter((item) => item.priority === 'high').length;
  const medium = items.filter((item) => item.priority === 'medium').length;
  const withNoFollowUp = items.filter((item) => !item.openFollowUp).length;

  return (
    <Shell>
      <div className="space-y-8">
        <div className="kolman-card overflow-hidden p-9 md:p-12">
          <p className="text-sm uppercase tracking-[0.24em] text-[#c6a884]">Kolman</p>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">Oppfølgingskø</h1>
              <p className="mt-3 max-w-2xl text-base text-[#d4c4b2] md:text-lg">Kontakter som bør følges opp nå, rangert etter tydelige signaler og manglende neste steg.</p>
            </div>
            <Link href="/contacts" className="rounded-full border border-[rgba(220,194,163,0.10)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#efe2d1] transition hover:bg-[rgba(255,245,232,0.06)]">
              Alle kontakter
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="kolman-card p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8e7c69]">Høy prioritet</p>
            <p className="mt-3 text-3xl font-semibold text-white">{high}</p>
          </div>
          <div className="kolman-card p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8e7c69]">Medium</p>
            <p className="mt-3 text-3xl font-semibold text-white">{medium}</p>
          </div>
          <div className="kolman-card p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8e7c69]">Mangler oppfølging</p>
            <p className="mt-3 text-3xl font-semibold text-white">{withNoFollowUp}</p>
          </div>
        </div>

        <SectionCard title="Prioritert nå">
          {snoozedCount > 0 ? (
            <div className="mb-4 rounded-2xl border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] px-4 py-3 text-sm text-[#d4c4b2]">
              Utsatt: {snoozedCount} kontakter er skjult fra køen til valgt dato.
            </div>
          ) : null}
          {items.length ? (
            <RecallQueueClient items={items} />
          ) : (
            <div className="rounded-[28px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] p-8">
              <h2 className="text-2xl font-semibold text-white">Ingen kontakter i køen akkurat nå</h2>
              <p className="mt-3 max-w-xl text-[#d4c4b2]">Når kontakter mangler neste steg, har gamle relasjoner eller får nye signaler, dukker de opp her.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/import" className="rounded-full border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.12)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#ead3b7] transition hover:bg-[rgba(183,146,104,0.20)]">
                  Importer
                </Link>
                <Link href="/dashboard" className="rounded-full border border-[rgba(220,194,163,0.10)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#efe2d1] transition hover:bg-[rgba(255,245,232,0.06)]">
                  Oversikt
                </Link>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </Shell>
  );
}
