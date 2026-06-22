import { AccountDataPanel } from '@/components/account-data-panel';
import { SectionCard } from '@/components/section-card';
import { Shell } from '@/components/shell';

const points = [
  'Hver megler ser kun egne kontakter og egen import',
  'Kontaktdata brukes til oppfølging, notater, historikk og meldingsutkast',
  'Eksport og sletting kan gjøres fra denne siden',
  'Tilgang er begrenset til godkjente e-postadresser',
];

export default function DataPage() {
  return (
    <Shell>
      <div className="space-y-10">
        <div className="kolman-card p-9 md:p-12">
          <p className="text-sm uppercase tracking-[0.24em] text-[#c6a884]">Data</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">Data og personvern</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#d4c4b2] md:text-lg">
            Kontroll over egne kontakter, historikk og oppfølginger.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionCard title="Prinsipper" description="Kolman er bygget for lukket tilgang og separerte brukerdata.">
            <div className="space-y-3">
              {points.map((point) => (
                <div key={point} className="rounded-2xl border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] px-4 py-3 text-sm leading-6 text-[#b8aa98]">
                  {point}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Eksport og sletting" description="Håndter egne arbeidsdata direkte fra Kolman.">
            <AccountDataPanel />
          </SectionCard>
        </div>

        <SectionCard title="Lukket første versjon" description="Tilgang gis til utvalgte meglere mens arbeidsflyten ferdigstilles.">
          <div className="rounded-[28px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] p-6 text-sm leading-7 text-[#b8aa98]">
            Kolman Eiendom brukes nå som en første operativ versjon. Før bred utrulling og integrasjoner bør databehandleravtale, rutiner for sletting og importansvar formaliseres tydeligere.
          </div>
        </SectionCard>
      </div>
    </Shell>
  );
}
