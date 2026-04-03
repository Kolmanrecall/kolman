import { BrandMark } from './brand-mark';
import { NavLinks } from './nav-links';

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="pointer-events-none fixed inset-0 kolman-grid opacity-20" />
      <header className="sticky top-0 z-20 border-b border-[rgba(220,194,163,0.08)] bg-[rgba(11,9,8,0.72)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-6">
            <BrandMark />
            <div className="hidden rounded-full border border-[rgba(183,146,104,0.18)] bg-[rgba(183,146,104,0.08)] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[#dcbf9e] md:block">
              Webverktøy for meglere
            </div>
          </div>
          <NavLinks />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10 md:py-12">{children}</main>
    </div>
  );
}
