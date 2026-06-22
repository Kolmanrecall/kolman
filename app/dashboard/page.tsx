import Link from 'next/link';
import { Shell } from '@/components/shell';
import { SectionCard } from '@/components/section-card';
import { StatCard } from '@/components/stat-card';
import { getContacts, getDashboardStats, getUpcomingFollowUps } from '@/lib/data';
import { StatusBadge, toneFromStatus } from '@/components/status-badge';
import { QuickNoteCard } from '@/components/quick-note-card';
import { FollowUpForm } from '@/components/follow-up-form';
import { FollowUpList } from '@/components/follow-up-list';

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const contacts = await getContacts();
  const followUps = await getUpcomingFollowUps(8);
  const recentContacts = contacts.slice(0, 5);
  const hasContacts = contacts.length > 0;
  const contactOptions = contacts.map((contact) => ({ id: contact.id, full_name: contact.full_name, city: contact.city }));

  return (
    <Shell>
      <div className="space-y-10">
        <div className="kolman-card overflow-hidden p-9 md:p-12">
          <p className="text-sm uppercase tracking-[0.24em] text-[#c6a884]">Kolman</p>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">Oversikt</h1>
              <p className="mt-3 max-w-2xl text-base text-[#d4c4b2] md:text-lg">Kontaktarbeid, oppfølging og historikk.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/import" className="rounded-full border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.12)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#ead3b7] transition hover:bg-[rgba(183,146,104,0.20)]">Importer</Link>
              <Link href="/contacts" className="rounded-full border border-[rgba(220,194,163,0.10)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#efe2d1] transition hover:bg-[rgba(255,245,232,0.06)]">Kontakter</Link>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Kontakter" value={String(stats.totalContacts)} sublabel="Importert" />
          <StatCard label="Varme signaler" value={String(stats.warmOpportunities)} sublabel="Prioritet" />
          <StatCard label="Oppfølginger" value={String(stats.openFollowUps)} sublabel="Åpne" />
          <StatCard label="Utkast" value={String(stats.draftsCreated)} sublabel="Lagret" />
        </div>

        {!hasContacts ? (
          <SectionCard title="Ingen kontakter">
            <div className="rounded-[28px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] p-8">
              <h2 className="text-2xl font-semibold text-white">Importer kontaktliste</h2>
              <p className="mt-3 max-w-xl text-[#d4c4b2]">CSV fra CRM, Excel eller Google Sheets.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/import" className="rounded-full border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.12)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#ead3b7] transition hover:bg-[rgba(183,146,104,0.20)]">Importer</Link>
              </div>
            </div>
          </SectionCard>
        ) : (
          <>
            <SectionCard title="Hurtignotat">
              <QuickNoteCard contacts={contacts.map((contact) => ({ id: contact.id, full_name: contact.full_name, city: contact.city, status_raw: contact.status_raw }))} />
            </SectionCard>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <SectionCard title="Neste oppfølginger">
                <FollowUpList followUps={followUps} />
              </SectionCard>

              <SectionCard title="Lag oppfølging">
                <FollowUpForm contacts={contactOptions} compact />
              </SectionCard>
            </div>

            <SectionCard title="Nylige kontakter">
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
          </>
        )}
      </div>
    </Shell>
  );
}
