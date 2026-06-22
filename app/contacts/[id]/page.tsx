import { notFound } from 'next/navigation';
import { Shell } from '@/components/shell';
import { SectionCard } from '@/components/section-card';
import { ClassificationCard } from '@/components/classification-card';
import { MessageDraftCard } from '@/components/message-draft-card';
import { ReplyAnalysisCard } from '@/components/reply-analysis-card';
import { ContactNotesCard } from '@/components/contact-notes-card';
import { ContactActivityTimeline } from '@/components/contact-activity-timeline';
import { FollowUpForm } from '@/components/follow-up-form';
import { FollowUpList } from '@/components/follow-up-list';
import { getContactActivities, getContactById, getContactFollowUps, getLatestClassification, getLatestMessageDraft, getLatestReplyAnalysis } from '@/lib/data';
import { StatusBadge, toneFromStatus } from '@/components/status-badge';

function formatDate(date: string | null) {
  if (!date) return 'Ingen dato';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
}

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contact = await getContactById(id);

  if (!contact) notFound();

  const classification = await getLatestClassification(id);
  const latestDraft = await getLatestMessageDraft(id);
  const latestReplyAnalysis = await getLatestReplyAnalysis(id);
  const activities = await getContactActivities(id);
  const followUps = await getContactFollowUps(id);
  const nextFollowUp = followUps[0] ?? null;

  return (
    <Shell>
      <div className="space-y-10">
        <div className="kolman-card p-9 md:p-11">
          <p className="mt-4 text-sm uppercase tracking-[0.24em] text-[#c6a884]">Kontakt</p>
          <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-white">{contact.full_name}</h1>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge value={contact.status_raw ?? 'Ukjent status'} tone={toneFromStatus(contact.status_raw)} />
                <StatusBadge value={contact.city ?? 'Ukjent by'} />
                <StatusBadge value={`Siste kontakt ${formatDate(contact.last_contacted_at)}`} />
                <StatusBadge value={nextFollowUp ? `Neste oppfølging ${formatDate(nextFollowUp.due_date)}` : 'Ingen oppfølging'} />
              </div>
            </div>
            <div className="grid min-w-[280px] grid-cols-2 gap-3 text-sm">
              <div className="rounded-[22px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.03)] px-5 py-4 text-[#d4c4b2]">
                <div className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]">Oppfølginger</div>
                <div className="mt-1 text-lg font-semibold text-white">{followUps.length}</div>
              </div>
              <div className="rounded-[22px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.03)] px-5 py-4 text-[#d4c4b2]">
                <div className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]">Utkast</div>
                <div className="mt-1 text-lg font-semibold text-white">{latestDraft ? 'Klar' : 'Mangler'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <SectionCard title="Kontaktinfo">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.2em] text-[#8e7c69]">E-post</dt>
                <dd className="mt-2 text-zinc-100">{contact.email ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.2em] text-[#8e7c69]">Telefon</dt>
                <dd className="mt-2 text-zinc-100">{contact.phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.2em] text-[#8e7c69]">By</dt>
                <dd className="mt-2 text-zinc-100">{contact.city ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.2em] text-[#8e7c69]">Siste kontakt</dt>
                <dd className="mt-2 text-zinc-100">{formatDate(contact.last_contacted_at)}</dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="Notater">
            <ContactNotesCard contactId={contact.id} initialNotes={contact.notes} />
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <SectionCard title="Oppfølginger">
            <FollowUpList followUps={followUps} showContact={false} />
          </SectionCard>

          <SectionCard title="Ny oppfølging">
            <FollowUpForm fixedContactId={contact.id} compact />
          </SectionCard>
        </div>

        <SectionCard title="Historikk">
          <ContactActivityTimeline activities={activities} />
        </SectionCard>

        <SectionCard title="Prioritering">
          <ClassificationCard contactId={contact.id} initialClassification={classification} />
        </SectionCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Meldingsutkast">
            <MessageDraftCard contactId={contact.id} initialDraft={latestDraft} />
          </SectionCard>

          <SectionCard title="Svaranalyse">
            <ReplyAnalysisCard contactId={contact.id} messageDraft={latestDraft} initialAnalysis={latestReplyAnalysis} />
          </SectionCard>
        </div>
      </div>
    </Shell>
  );
}
