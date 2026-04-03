import Link from 'next/link';
import { Shell } from '@/components/shell';
import { SectionCard } from '@/components/section-card';
import { StatCard } from '@/components/stat-card';
import { getContacts, getDashboardStats } from '@/lib/data';
import { StatusBadge, toneFromStatus } from '@/components/status-badge';

const overviewPoints = [
  'Kontakter, notater, relasjoner og historikk samlet på ett sted',
  'Klassifisering, meldingsutkast og svaranalyse lagres per kontakt',
  'Arbeidsflaten er bygget for oppfølging av gamle leads og tidligere kunder',
];

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const contacts = await getContacts();
  const recentContacts = contacts.slice(0, 5);
  const hasContacts = contacts.length > 0;

  return (
    <Shell>
      <div className="space-y-10">
        <div className="kolman-card overflow-hidden p-9 md:p-12">
          <p className="text-sm uppercase tracking-[0.24em] text-[#c6a884]">Kolman</p>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">Oversikt</h1>
              <p className="mt-3 max-w-3xl text-base text-[#d4c4b2] md:text-lg">
                En samlet arbeidsflate for kontaktarbeid, oppfølging og historikk.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/import" className="rounded-full border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.12)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#ead3b7] transition hover:bg-[rgba(183,146,104,0.20)]">Importer kontakter</Link>
              <Link href="/contacts" className="rounded-full border border-[rgba(220,194,163,0.10)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#efe2d1] transition hover:bg-[rgba(255,245,232,0.06)]">Åpne kontakter</Link>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Totale kontakter" value={String(stats.totalContacts)} sublabel="I arbeidsflaten" />
          <StatCard label="Varme signaler" value={String(stats.warmOpportunities)} sublabel="Prioriterte kontakter" />
          <StatCard label="Utkast laget" value={String(stats.draftsCreated)} sublabel="Lagrer per kontakt" />
          <StatCard label="Svar mottatt" value={String(stats.repliesReceived)} sublabel="Siste aktivitet" />
        </div>

        {!hasContacts ? (
          <SectionCard title="Ingen kontakter ennå" description="Når kontaktlisten er importert, vises arbeidsflaten her.">
            <div className="rounded-[28px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] p-8">
              <h2 className="text-2xl font-semibold text-white">Start med en kontaktliste</h2>
              <p className="mt-3 max-w-2xl text-[#d4c4b2]">
                Importer en CSV med egne kontakter for å bruke Kolman på gamle leads, tidligere kunder og videre oppfølging.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/import" className="rounded-full border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.12)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#ead3b7] transition hover:bg-[rgba(183,146,104,0.20)]">Importer kontakter</Link>
              </div>
            </div>
          </SectionCard>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <SectionCard title="Nylige kontakter" description="En rask inngang til kontaktbasen din.">
              <div className="space-y-3">
                {recentContacts.map((contact) => (
                  <Link key={contact.id} href={`/contacts/${contact.id}`} className="flex items-center justify-between rounded-2xl border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] px-4 py-3 transition hover:border-[rgba(183,146,104,0.32)] hover:bg-[rgba(255,245,232,0.03)]">
                    <div>
                      <div className="font-medium text-white">{contact.full_name}</div>
                      <div className="mt-1 text-xs text-[#8e7c69]">{contact.city || 'Ukjent by'}</div>
                    </div>
                    <StatusBadge value={contact.status_raw || 'Ukjent'} tone={toneFromStatus(contact.status_raw)} />
                  </Link>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Kolman i bruk" description="Kjernen i arbeidsflaten.">
              <div className="space-y-3">
                {overviewPoints.map((item) => (
                  <div key={item} className="rounded-2xl border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] px-4 py-3 text-sm leading-6 text-[#b8aa98]">
                    {item}
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </Shell>
  );
}
