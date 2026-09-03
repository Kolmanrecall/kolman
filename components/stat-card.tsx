export function StatCard({ label, value, sublabel }: { label: string; value: string | number; sublabel?: string }) {
  return (
    <div className="kolman-card-soft rounded-[22px] p-5">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[#9f907f]">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{value}</p>
      {sublabel ? <p className="mt-2 max-w-[24ch] text-sm leading-6 text-[#b8aa98]">{sublabel}</p> : null}
    </div>
  );
}
