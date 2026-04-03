export function StatusBadge({ value, tone = 'neutral' }: { value: string; tone?: 'hot' | 'warm' | 'cold' | 'client' | 'neutral' }) {
  const toneClass = {
    hot: 'border-emerald-400/18 bg-emerald-400/7 text-emerald-100',
    warm: 'border-[rgba(183,146,104,0.20)] bg-[rgba(183,146,104,0.08)] text-[#f0dcc3]',
    cold: 'border-white/6 bg-white/[0.03] text-[#d4c4b2]',
    client: 'border-[rgba(220,194,163,0.14)] bg-[rgba(220,194,163,0.06)] text-[#f3e2cf]',
    neutral: 'border-[rgba(220,194,163,0.10)] bg-white/[0.03] text-[#d4c4b2]',
  }[tone];

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] ${toneClass}`}>
      {value}
    </span>
  );
}

export function toneFromStatus(status?: string | null): 'hot' | 'warm' | 'cold' | 'client' | 'neutral' {
  const value = (status || '').toLowerCase();
  if (value.includes('varm') || value.includes('klar') || value.includes('selg')) return 'hot';
  if (value.includes('vurderer') || value.includes('oppfølging')) return 'warm';
  if (value.includes('tidligere kunde') || value.includes('client') || value.includes('kunde')) return 'client';
  if (value.includes('ikke') || value.includes('kald') || value.includes('senere')) return 'cold';
  return 'neutral';
}
