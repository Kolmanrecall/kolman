import Image from 'next/image';
import Link from 'next/link';

export function BrandMark({ showText = true, size = 40 }: { showText?: boolean; size?: number }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <div
        className="relative overflow-hidden rounded-2xl border border-[rgba(220,194,163,0.16)] bg-[#14100d] shadow-[0_18px_48px_rgba(0,0,0,0.35)]"
        style={{ width: size, height: size }}
      >
        <Image src="/kolman-logo.jpg" alt="Kolman logo" fill sizes={`${size}px`} className="object-cover" priority />
      </div>
      {showText ? (
        <div className="leading-tight">
          <div className="text-[11px] uppercase tracking-[0.28em] text-[#c6a884]">Kolman</div>
          <div className="text-base font-semibold text-white">Recall</div>
        </div>
      ) : null}
    </Link>
  );
}
