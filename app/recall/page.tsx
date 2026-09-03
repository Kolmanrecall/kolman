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
      <div className="space-y-7">
        <div className="flex flex-col gap-4 border-b border-[rgba(220,194,163,0.10)] pb-7 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[#c6a884]">Oppfølgingskø</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Hvem bør kontaktes nå</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#d4c4b2]">
              En prioritert arbeidsliste for gamle kunder, varme kontakter og saker som mangler neste steg.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/contacts/new" className="rounded-full border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.12)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#ead3b7] transition hover:bg-[rgba(183,146,104,0.20)]">Ny kontakt</Link>
            <Link href="/contacts" className="rounded-full border border-[rgba(220,194,163,0.10)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#efe2d1] transition hover:bg-[rgba(255,245,232,0.06)]">
              Alle kontakter
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[22px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.025)] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[#9f907f]">Høy prioritet</p>
            <p className="mt-2 text-2xl font-semibold text-white">{high}</p>
          </div>
          <div className="rounded-[22px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.025)] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[#9f907f]">Medium</p>
            <p className="mt-2 text-2xl font-semibold text-white">{medium}</p>
          </div>
          <div className="rounded-[22px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.025)] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[#9f907f]">Mangler oppfølging</p>
            <p className="mt-2 text-2xl font-semibold text-white">{withNoFollowUp}</p>
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
            <div className="rounded-[24px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] p-7">
              <h2 className="text-xl font-semibold text-white">Ingen kontakter i køen akkurat nå</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#d4c4b2]">
                Når kontakter mangler neste steg, har gamle relasjoner eller får nye signaler fra sakene dine, dukker de opp her.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/import" className="rounded-full border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.12)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#ead3b7] transition hover:bg-[rgba(183,146,104,0.20)]">
                  Importer
                </Link>
                <Link href="/contacts/new" className="rounded-full border border-[rgba(220,194,163,0.10)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#efe2d1] transition hover:bg-[rgba(255,245,232,0.06)]">
                  Ny kontakt
                </Link>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </Shell>
  );
}
