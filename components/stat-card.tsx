export function StatCard({ label, value, sublabel }: { label: string; value: string | number; sublabel?: string }) {
  return (
    <div className="kolman-card overflow-hidden p-6">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#8e7c69]">{label}</p>
      <p className="mt-3 text-4xl font-semibold tracking-tight text-white">{value}</p>
      {sublabel ? <p className="mt-2 max-w-[22ch] text-sm leading-6 text-[#a59482]">{sublabel}</p> : null}
    </div>
  );
}
