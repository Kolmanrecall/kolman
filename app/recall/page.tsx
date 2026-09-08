import Link from 'next/link';
import { Shell } from '@/components/shell';
import { RecallQueueClient } from '@/components/recall-queue-client';
import { getRecallQueueResult, getRecallSnoozedCount } from '@/lib/recall';
import { requirePageUser } from '@/lib/page-auth';

export default async function RecallPage() {
  await requirePageUser();
  const [queue, snoozedCount] = await Promise.all([getRecallQueueResult(60), getRecallSnoozedCount()]);
  const { items, total, high, medium, hasMore } = queue;

  return (
    <Shell>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 border-b border-[#231f1c] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-[#f0ebe4]">Hvem bør kontaktes nå</h1>
            <p className="mt-1 text-sm text-[#a79e92]">Ringeliste for gamle kunder, varme kontakter og saker som mangler neste steg.</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[13px] tabular-nums text-[#a79e92]">
            <span><strong className="font-medium text-[#f0ebe4]">{items.length}</strong>{hasMore ? ` av ${total}` : ''} i kø</span>
            <span><strong className="font-medium text-[#f0ebe4]">{high}</strong> høy</span>
            <span><strong className="font-medium text-[#f0ebe4]">{medium}</strong> medium</span>
            <span><strong className="font-medium text-[#f0ebe4]">{snoozedCount}</strong> utsatt</span>
            <Link href="/contacts/new" className="border-b border-[#6e5637] pb-0.5 text-[#f0ebe4] transition hover:border-[#b79268] kolman-focus-ring">Ny kontakt</Link>
          </div>
        </div>

        {items.length ? (
          <div>
            <div className="grid grid-cols-[46px_3px_minmax(190px,1.15fr)_132px_132px_172px] gap-x-5 border-b border-[#2e2924] pb-2 font-mono text-[10px] font-medium uppercase tracking-[0.13em] text-[#8a8177] max-lg:hidden">
              <div>Nr</div>
              <div />
              <div>Kontakt</div>
              <div>Telefon</div>
              <div>Siste kontakt</div>
              <div>Handling</div>
            </div>
            <RecallQueueClient items={items} />
            {hasMore ? (
              <p className="pt-4 text-sm text-[#8a8177]">Viser de første {items.length} av {total} kontakter. Jobb listen ovenfra, så fylles den på etter hvert.</p>
            ) : null}
            {snoozedCount > 0 ? (
              <p className="pt-2 text-sm text-[#8a8177]">
                {snoozedCount} kontakter er utsatt og skjult fra køen til valgt dato.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="border-b border-[#231f1c] py-12">
            <h2 className="text-lg font-semibold text-[#f0ebe4]">Ingen kontakter i køen akkurat nå</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#a79e92]">
              Når kontakter mangler neste steg, har gamle relasjoner eller får nye signaler fra sakene dine, dukker de opp her.
            </p>
            <div className="mt-6 flex flex-wrap gap-5 text-sm">
              <Link href="/import" className="border-b border-[#b79268] pb-0.5 font-medium text-[#f0ebe4] transition hover:text-white kolman-focus-ring">
                Importer kontakter
              </Link>
              <Link href="/contacts/new" className="border-b border-[#6e5637] pb-0.5 text-[#a79e92] transition hover:text-[#f0ebe4] kolman-focus-ring">
                Legg inn én kontakt
              </Link>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
