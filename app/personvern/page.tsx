import Link from 'next/link';
import { BrandMark } from '@/components/brand-mark';

const sections = [
  {
    title: 'Hvilke data behandles',
    body: 'Kolman behandler kontaktdata som megleren selv importerer eller registrerer, for eksempel navn, e-post, telefon, by, status, notater, historikk og oppfølginger.',
  },
  {
    title: 'Hva dataene brukes til',
    body: 'Dataene brukes til å gi megleren oversikt over kontakter, oppfølginger, notater, klassifiseringer, meldingsutkast og svaranalyse.',
  },
  {
    title: 'Tilgang og isolasjon',
    body: 'Tilgang er begrenset til godkjente e-postadresser. Hver innlogget bruker arbeider med egne data, og kontaktdata skal ikke vises på tvers av meglere.',
  },
  {
    title: 'Eksport og sletting',
    body: 'Innloggede brukere kan eksportere egne arbeidsdata og slette importerte kontakter, historikk, notater, oppfølginger og utkast fra Data-siden i Kolman.',
  },
  {
    title: 'AI-funksjoner',
    body: 'AI-funksjoner kan brukes til å foreslå klassifisering, meldingsutkast og svaranalyse. Forslag skal vurderes av megleren før de brukes i kundedialog.',
  },
];

export default function PersonvernPage() {
  return (
    <main className="min-h-screen bg-[#0a0807] px-6 py-10 text-white">
      <div className="pointer-events-none fixed inset-0 kolman-grid opacity-20" />
      <div className="relative mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <BrandMark />
          <Link href="/login" className="rounded-full border border-[rgba(220,194,163,0.10)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#efe2d1] transition hover:bg-[rgba(255,245,232,0.06)]">
            Logg inn
          </Link>
        </div>

        <section className="kolman-card mt-12 p-9 md:p-12">
          <p className="text-sm uppercase tracking-[0.24em] text-[#c6a884]">Kolman Eiendom</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">Personvern og data</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-[#d4c4b2] md:text-lg">
            En oversikt over hvordan Kolman håndterer data i den lukkede første versjonen for eiendomsmeglere.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <div key={section.title} className="rounded-[28px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.03)] p-6">
              <h2 className="text-lg font-semibold text-white">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#b8aa98]">{section.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-[28px] border border-[rgba(183,146,104,0.18)] bg-[rgba(183,146,104,0.06)] p-6 text-sm leading-7 text-[#d4c4b2]">
          Denne siden er en produktmessig personvernoversikt for første operative versjon. Formelle juridiske dokumenter og databehandleravtale bør ferdigstilles før bred utrulling og eksterne integrasjoner.
        </section>
      </div>
    </main>
  );
}
