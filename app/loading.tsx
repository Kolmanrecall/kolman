import { BrandMark } from '@/components/brand-mark';

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(183,146,104,0.18),_transparent_28%),linear-gradient(180deg,_#110d0a_0%,_#17120f_100%)] px-6">
      <div className="flex flex-col items-center gap-6 text-center text-white">
        <div className="loader-orbit rounded-[28px] bg-[rgba(255,245,232,0.05)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur">
          <BrandMark showText={false} size={80} />
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-[#caa882]">Kolman Recall</p>
          <h2 className="mt-2 text-2xl font-semibold">Laster arbeidsflaten…</h2>
          <p className="mt-2 text-sm text-[#cbbba8]">Forbereder kontakter, flows og AI-signaler.</p>
        </div>
      </div>
    </div>
  );
}
