import Link from 'next/link';
import { Shell } from '@/components/shell';
import { SectionCard } from '@/components/section-card';
import { CaseForm } from '@/components/case-form';
import { CaseList } from '@/components/case-list';
import { getPropertyCases } from '@/lib/data';
import { isOpenCaseStatus } from '@/lib/case-status';
import { requirePageUser } from '@/lib/page-auth';

export default async function CasesPage() {
  await requirePageUser();
  const cases = await getPropertyCases();
  const activeCases = cases.filter((item) => isOpenCaseStatus(item.status));

  return (
    <Shell>
      <div className="space-y-10">
        <div className="kolman-card overflow-hidden p-9 md:p-12">
          <p className="text-sm uppercase tracking-[0.24em] text-[#c6a884]">Kolman</p>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">Saker</h1>
              <p className="mt-3 max-w-2xl text-base text-[#d4c4b2] md:text-lg">Adresser, eiendommer og kontakter som hører sammen.</p>
            </div>
            <Link href="/contacts" className="rounded-full border border-[rgba(220,194,163,0.10)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#efe2d1] transition hover:bg-[rgba(255,245,232,0.06)]">Kontakter</Link>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <SectionCard title="Ny sak">
            <CaseForm />
          </SectionCard>

          <SectionCard title={`Saker (${activeCases.length})`}>
            <CaseList cases={cases} />
          </SectionCard>
        </div>
      </div>
    </Shell>
  );
}
