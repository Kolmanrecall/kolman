import { BrandMark } from './brand-mark';
import { NavLinks } from './nav-links';

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0e0c0b]">
      <header className="sticky top-0 z-20 border-b border-[#231f1c] bg-[#0e0c0b]">
        <div className="mx-auto flex min-h-[52px] max-w-[1440px] flex-col gap-3 px-5 py-3 md:flex-row md:items-center md:justify-between">
          <BrandMark />
          <NavLinks />
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-5 py-8 md:py-9">{children}</main>
    </div>
  );
}
