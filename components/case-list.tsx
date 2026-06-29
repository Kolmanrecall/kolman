import Link from 'next/link';
import type { PropertyCase } from '@/lib/types';

function statusLabel(status: PropertyCase['status']) {
  if (status === 'closed') return 'Lukket';
  if (status === 'paused') return 'Avventer';
  return 'Aktiv';
}

export function CaseList({ cases }: { cases: PropertyCase[] }) {
  if (!cases.length) {
    return (
      <div className="rounded-[28px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] p-8">
        <h2 className="text-2xl font-semibold text-white">Ingen saker</h2>
        <p className="mt-3 max-w-xl text-[#d4c4b2]">Opprett en sak eller adresse når flere kontakter hører til samme eiendom.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cases.map((item) => (
        <article key={item.id} className="rounded-[28px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                <span className="rounded-full border border-[rgba(183,146,104,0.20)] bg-[rgba(183,146,104,0.08)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[#dcbf9e]">{statusLabel(item.status)}</span>
              </div>
              <p className="mt-2 text-sm text-[#8e7c69]">{[item.address, item.city].filter(Boolean).join(', ') || 'Ingen adresse'}</p>
              {item.notes ? <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#d4c4b2]">{item.notes}</p> : null}
            </div>
            <div className="rounded-2xl border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.03)] px-4 py-3 text-sm text-[#d4c4b2]">
              <span className="text-white">{item.contacts?.length ?? 0}</span> kontakter
            </div>
          </div>

          {item.contacts?.length ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {item.contacts.map((link) => (
                <Link key={link.id} href={`/contacts/${link.contact_id}` as any} className="rounded-2xl border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.025)] px-4 py-3 transition hover:border-[rgba(183,146,104,0.32)] hover:bg-[rgba(255,245,232,0.04)]">
                  <div className="font-medium text-white">{link.contact?.full_name ?? 'Ukjent kontakt'}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[#8e7c69]">{link.role || 'Tilknyttet'}</div>
                </Link>
              ))}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
