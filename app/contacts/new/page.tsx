import Link from 'next/link';
import { Shell } from '@/components/shell';
import { SectionCard } from '@/components/section-card';
import { ContactForm } from '@/components/contact-form';
import { requirePageUser } from '@/lib/page-auth';

export default async function NewContactPage() {
  await requirePageUser();

  return (
    <Shell>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[#c6a884]">Kontaktbase</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">Ny kontakt</h1>
            <p className="mt-3 max-w-2xl text-[#d4c4b2]">Legg inn én kontakt direkte, uten CSV.</p>
          </div>
          <Link href="/contacts" className="rounded-full border border-[rgba(220,194,163,0.10)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#efe2d1] transition hover:bg-[rgba(255,245,232,0.06)]">
            Alle kontakter
          </Link>
        </div>

        <SectionCard title="Kontaktinfo" description="Navn er påkrevd. E-post, telefon og status gjør køen mer presis.">
          <ContactForm mode="create" />
        </SectionCard>
      </div>
    </Shell>
  );
}
