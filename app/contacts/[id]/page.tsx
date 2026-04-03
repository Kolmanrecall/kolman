import { notFound } from 'next/navigation';
import { Shell } from '@/components/shell';
import { SectionCard } from '@/components/section-card';
import { ClassificationCard } from '@/components/classification-card';
import { MessageDraftCard } from '@/components/message-draft-card';
import { ReplyAnalysisCard } from '@/components/reply-analysis-card';
import { ContactNotesCard } from '@/components/contact-notes-card';
import { ContactRelationsCard } from '@/components/contact-relations-card';
import { getContactById, getLatestClassification, getLatestMessageDraft, getLatestReplyAnalysis } from '@/lib/data';
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

  return (
    <Shell>
      <div className="space-y-10">
        <div className="kolman-card p-9 md:p-11">
          <p className="mt-4 text-sm uppercase tracking-[0.24em] text-[#c6a884]">Kontakt</p>
          <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-white">{contact.full_name}</h1>
              <p className="mt-3 max-w-3xl text-[#d4c4b2]">Samle notater, klassifisering, meldingsutkast og svar på ett sted for hver kontakt.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge value={contact.status_raw ?? 'Ukjent status'} tone={toneFromStatus(contact.status_raw)} />
                <StatusBadge value={contact.city ?? 'Ukjent by'} />
                <StatusBadge value={`Siste kontakt ${formatDate(contact.last_contacted_at)}`} />
              </div>
            </div>
            <div className="grid min-w-[280px] grid-cols-2 gap-3 text-sm">
              <div className="rounded-[22px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.03)] px-5 py-4 text-[#d4c4b2]">
                <div className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]">Klassifisering</div>
                <div className="mt-1 text-lg font-semibold text-white">{classification ? 'Klar' : 'Mangler'}</div>
              </div>
              <div className="rounded-[22px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.03)] px-5 py-4 text-[#d4c4b2]">
                <div className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]">Meldingsutkast</div>
                <div className="mt-1 text-lg font-semibold text-white">{latestDraft ? 'Klar' : 'Mangler'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <SectionCard title="Kontaktinfo" description="Grunnleggende informasjon og status på kontakten.">
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

          <SectionCard title="Notater" description="Lagre korte notater og relevant kontekst på kontakten.">
            <ContactNotesCard initialNotes={contact.notes} />
          </SectionCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Relasjoner" description="Koble sammen personer som hører til samme bolig, oppdrag eller prosess.">
            <ContactRelationsCard />
          </SectionCard>

          <SectionCard title="AI-klassifisering" description="Vurder kontaktens status og prioritet videre i arbeidsflyten.">
            <ClassificationCard contactId={contact.id} initialClassification={classification} />
          </SectionCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Meldingsutkast" description="Lag et kort, naturlig utkast som kan tilpasses før sending.">
            <MessageDraftCard contactId={contact.id} initialDraft={latestDraft} />
          </SectionCard>

          <SectionCard title="Svaranalyse" description="Analyser innkommende svar og få forslag til videre oppfølging.">
            <ReplyAnalysisCard contactId={contact.id} messageDraft={latestDraft} initialAnalysis={latestReplyAnalysis} />
          </SectionCard>
        </div>
      </div>
    </Shell>
  );
}
