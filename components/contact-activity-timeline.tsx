import type { ContactActivity } from '@/lib/types';

function formatActivityDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

export function ContactActivityTimeline({ activities }: { activities: ContactActivity[] }) {
  if (!activities.length) {
    return (
      <div className="rounded-[24px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] p-5 text-sm leading-6 text-[#b8aa98]">
        Ingen aktivitet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <article key={activity.id} className="rounded-[24px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs uppercase tracking-[0.18em] text-[#c6a884]">{activity.activity_type === 'quick_note' ? 'Hurtignotat' : activity.activity_type === 'follow_up_created' ? 'Oppfølging' : activity.activity_type === 'follow_up_completed' ? 'Ferdig' : activity.activity_type === 'follow_up_postponed' ? 'Utsatt' : 'Notat'}</p>
            <time className="text-xs text-[#8e7c69]">{formatActivityDate(activity.created_at)}</time>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#d4c4b2]">{activity.body}</p>
        </article>
      ))}
    </div>
  );
}
