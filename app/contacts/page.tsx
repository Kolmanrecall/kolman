import Link from 'next/link';
import { Shell } from '@/components/shell';
import { SectionCard } from '@/components/section-card';
import { ContactsTableClient } from '@/components/contacts-table-client';
import { getContacts } from '@/lib/data';

export default async function ContactsPage() {
  const contacts = await getContacts();
  const uniqueCities = new Set(contacts.map((contact) => contact.city).filter(Boolean)).size;
  const warmSignals = contacts.filter((contact) => /warm|hot|vurderer|tidligere kunde/i.test(contact.status_raw ?? '')).length;
  const hasContacts = contacts.length > 0;

  return (
    <Shell>
      <div className="space-y-10">
        <div className="kolman-card p-9 md:p-11">
          <p className="text-sm uppercase tracking-[0.24em] text-[#c6a884]">Kontaktbase</p>
          <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-white">Kontakter</h1>
              <p className="mt-3 max-w-3xl text-[#d4c4b2]">Arbeid med egne leads, tidligere kunder og relasjoner i én samlet kontaktbase.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm md:min-w-[420px]">
              <div className="rounded-[22px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.03)] px-5 py-4 text-[#d4c4b2]">
                <div className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]">Totale</div>
                <div className="mt-1 text-2xl font-semibold text-white">{contacts.length}</div>
              </div>
              <div className="rounded-[22px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.03)] px-5 py-4 text-[#d4c4b2]">
                <div className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]">Byer</div>
                <div className="mt-1 text-2xl font-semibold text-white">{uniqueCities}</div>
              </div>
              <div className="rounded-[22px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.03)] px-5 py-4 text-[#d4c4b2]">
                <div className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]">Varme signaler</div>
                <div className="mt-1 text-2xl font-semibold text-white">{warmSignals}</div>
              </div>
            </div>
          </div>
        </div>

        {hasContacts ? (
          <SectionCard title="Alle kontakter" description="Søk, filtrer og åpne en kontakt for å jobbe videre med notater, klassifisering og meldinger.">
            <ContactsTableClient contacts={contacts} />
          </SectionCard>
        ) : (
          <SectionCard title="Ingen kontakter ennå" description="Kontaktlisten er tom til egne kontakter er importert.">
            <div className="rounded-[28px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] p-8">
              <h2 className="text-2xl font-semibold text-white">Klar for første import</h2>
              <p className="mt-3 max-w-2xl text-[#d4c4b2]">
                Importer en CSV med egne kontakter for å begynne å bruke Kolman i det daglige kontaktarbeidet.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/import" className="rounded-full border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.12)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#ead3b7] transition hover:bg-[rgba(183,146,104,0.20)]">Importer kontakter</Link>
              </div>
            </div>
          </SectionCard>
        )}
      </div>
    </Shell>
  );
}
