import Link from 'next/link';
import { Shell } from '@/components/shell';
import { SectionCard } from '@/components/section-card';
import { StatCard } from '@/components/stat-card';
import { getContacts, getDashboardStats, getUpcomingFollowUps } from '@/lib/data';
import { getRecallQueue } from '@/lib/recall';
import { StatusBadge, toneFromStatus } from '@/components/status-badge';
import { QuickNoteCard } from '@/components/quick-note-card';
import { FollowUpForm } from '@/components/follow-up-form';
import { FollowUpList } from '@/components/follow-up-list';
import { requirePageUser } from '@/lib/page-auth';

export default async function DashboardPage() {
  await requirePageUser();
  const stats = await getDashboardStats();
  const contacts = await getContacts();
  const followUps = await getUpcomingFollowUps(8);
  const recallItems = await getRecallQueue(50);
  const recentContacts = contacts.slice(0, 5);
  const hasContacts = contacts.length > 0;
  const contactOptions = contacts.map((contact) => ({ id: contact.id, full_name: contact.full_name, city: contact.city }));

  return (
    <Shell>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 border-b border-[rgba(220,194,163,0.10)] pb-7 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[#c6a884]">Oversikt</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Dagens arbeid</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#d4c4b2]">
              Se hvem som bør kontaktes, hva som er gjort denne måneden, og hvilke oppfølginger som ligger foran deg.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/recall" className="rounded-full border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.12)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#ead3b7] transition hover:bg-[rgba(183,146,104,0.20)]">Åpne køen</Link>
            <Link href="/import" className="rounded-full border border-[rgba(220,194,163,0.10)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#efe2d1] transition hover:bg-[rgba(255,245,232,0.06)]">Importer</Link>
            <Link href="/contacts/new" className="rounded-full border border-[rgba(220,194,163,0.10)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#efe2d1] transition hover:bg-[rgba(255,245,232,0.06)]">Ny kontakt</Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Samtaler" value={String(stats.spokenThisMonth)} sublabel="Snakket med denne måneden" />
          <StatCard label="Oppfølginger" value={String(stats.completedFollowUpsThisMonth)} sublabel="Fullført denne måneden" />
          <StatCard label="Kontakter jobbet" value={String(stats.workedContactsThisMonth)} sublabel="Unike kontakter denne måneden" />
          <StatCard label="Saker i bevegelse" value={String(stats.casesMovedThisMonth)} sublabel="Flyttet eller oppdatert" />
        </div>

        {!hasContacts ? (
          <SectionCard title="Kom i gang">
            <div className="rounded-[24px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] p-7">
              <h2 className="text-xl font-semibold text-white">Start med kontaktlisten</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#d4c4b2]">
                Importer en CSV eller legg inn én kontakt manuelt. Kolman bruker listen til å finne hvem som bør følges opp først.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/import" className="rounded-full border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.12)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#ead3b7] transition hover:bg-[rgba(183,146,104,0.20)]">Importer kontakter</Link>
                <Link href="/contacts/new" className="rounded-full border border-[rgba(220,194,163,0.10)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#efe2d1] transition hover:bg-[rgba(255,245,232,0.06)]">Legg til én kontakt</Link>
              </div>
            </div>
          </SectionCard>
        ) : (
          <>
            {recallItems.length ? (
              <SectionCard title="Dagens ringeliste" description={`${recallItems.length} kontakter ligger i prioritert oppfølgingskø.`}>
                <div className="space-y-3">
                  {recallItems.slice(0, 5).map((item) => (
                    <Link key={item.contact.id} href={`/recall` as any} className="flex items-center justify-between gap-4 rounded-2xl border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] px-4 py-3 transition hover:border-[rgba(183,146,104,0.32)] hover:bg-[rgba(255,245,232,0.03)]">
                      <div className="min-w-0">
                        <div className="font-medium text-white">{item.contact.full_name}</div>
                        <div className="mt-1 truncate text-xs text-[#b8aa98]">{item.reasons[0]}</div>
                      </div>
                      <span className="shrink-0 rounded-full border border-[rgba(183,146,104,0.20)] bg-[rgba(183,146,104,0.08)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[#dcbf9e]">{item.priorityLabel}</span>
                    </Link>
                  ))}
                  <Link href="/recall" className="inline-flex rounded-full border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.12)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#ead3b7] transition hover:bg-[rgba(183,146,104,0.20)]">Jobb køen</Link>
                </div>
              </SectionCard>
            ) : (
              <SectionCard title="Dagens ringeliste">
                <div className="rounded-[24px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] p-7">
                  <h2 className="text-xl font-semibold text-white">Ingen tydelige oppfølginger akkurat nå</h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-[#d4c4b2]">
                    Legg inn siste kontakt, status eller neste steg på sakene. Da blir køen mer presis uten at listen fylles med tilfeldige navn.
                  </p>
                </div>
              </SectionCard>
            )}

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
                      <div className="mt-1 text-xs text-[#b8aa98]">{contact.city || 'Ukjent by'}</div>
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
