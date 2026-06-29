import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Shell } from '@/components/shell';
import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { FollowUpList } from '@/components/follow-up-list';
import { CaseUpdateForm } from '@/components/case-update-form';
import { getCaseFollowUps, getPropertyCaseById } from '@/lib/data';
import { getCaseStatusLabel, getCaseStatusTone } from '@/lib/case-status';

function formatDate(date: string | null) {
  if (!date) return 'Ingen dato';
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
}

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propertyCase = await getPropertyCaseById(id);

  if (!propertyCase) notFound();

  const followUps = await getCaseFollowUps(id);
  const contacts = propertyCase.contacts ?? [];

  return (
    <Shell>
      <div className="space-y-10">
        <div className="kolman-card p-9 md:p-11">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[#c6a884]">Sak</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">{propertyCase.title}</h1>
              <p className="mt-3 text-sm text-[#8e7c69]">{[propertyCase.address, propertyCase.city].filter(Boolean).join(', ') || 'Ingen adresse'}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge value={getCaseStatusLabel(propertyCase.status)} tone={getCaseStatusTone(propertyCase.status)} />
                <StatusBadge value={`${contacts.length} kontakter`} />
                <StatusBadge value={`${followUps.length} åpne oppfølginger`} />
              </div>
            </div>
            <Link href="/cases" className="rounded-full border border-[rgba(220,194,163,0.10)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#efe2d1] transition hover:bg-[rgba(255,245,232,0.06)]">Alle saker</Link>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <SectionCard title="Neste steg">
            <div className="rounded-[28px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] p-6">
              <div className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]">Handling</div>
              <div className="mt-2 text-xl font-semibold text-white">{propertyCase.next_step || 'Ingen neste steg'}</div>
              <div className="mt-2 text-sm text-[#c6a884]">{formatDate(propertyCase.next_step_due_date)}</div>
            </div>
          </SectionCard>

          <SectionCard title="Personer">
            {contacts.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {contacts.map((link) => (
                  <Link key={link.id} href={`/contacts/${link.contact_id}` as any} className="rounded-2xl border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.025)] px-4 py-3 transition hover:border-[rgba(183,146,104,0.32)] hover:bg-[rgba(255,245,232,0.04)]">
                    <div className="font-medium text-white">{link.contact?.full_name ?? 'Ukjent kontakt'}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[#8e7c69]">{link.role || 'Tilknyttet'}</div>
                    {link.contact?.phone ? <div className="mt-2 text-xs text-[#c6a884]">{link.contact.phone}</div> : null}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] p-5 text-sm text-[#d4c4b2]">Ingen kontakter koblet til saken.</div>
            )}
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <SectionCard title="Åpne oppfølginger">
            <FollowUpList followUps={followUps} />
          </SectionCard>

          <SectionCard title="Rediger sak">
            <CaseUpdateForm propertyCase={propertyCase} />
          </SectionCard>
        </div>

        {propertyCase.notes ? (
          <SectionCard title="Notat">
            <div className="whitespace-pre-wrap text-sm leading-6 text-[#d4c4b2]">{propertyCase.notes}</div>
          </SectionCard>
        ) : null}
      </div>
    </Shell>
  );
}
