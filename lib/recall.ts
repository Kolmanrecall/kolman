import { createServiceRoleSupabaseClient, getAuthenticatedUser } from '@/lib/supabase-server';
import type { Contact } from '@/lib/types';

export type RecallPriority = 'high' | 'medium' | 'low';

export type RecallQueueItem = {
  contact: Contact;
  score: number;
  priority: RecallPriority;
  priorityLabel: string;
  reasons: string[];
  recommendedAction: string;
  suggestedFollowUpTitle: string;
  suggestedDueDate: string;
  daysSinceLastContact: number | null;
  latestClassification: {
    category: string;
    warmth_score: number;
    reasoning: string | null;
  } | null;
  openFollowUp: {
    id: string;
    title: string;
    due_date: string | null;
  } | null;
  hasUnsentDraft: boolean;
  linkedCaseCount: number;
};

type ClassificationRow = {
  contact_id: string;
  category: string;
  warmth_score: number;
  reasoning: string | null;
  created_at: string;
};

type FollowUpRow = {
  id: string;
  contact_id: string;
  title: string;
  due_date: string | null;
  status: string;
  created_at: string;
};

type DraftRow = {
  contact_id: string;
  sent: boolean | null;
  approved: boolean | null;
  created_at: string;
};

type CaseContactRow = {
  contact_id: string;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function diffDays(from: string | null | undefined, to = new Date()) {
  if (!from) return null;
  const parsed = new Date(from);
  if (Number.isNaN(parsed.getTime())) return null;
  const diff = startOfDay(to).getTime() - startOfDay(parsed).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function includesAny(value: string, words: string[]) {
  const normalized = value.toLowerCase();
  return words.some((word) => normalized.includes(word));
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function getPriority(score: number): { priority: RecallPriority; priorityLabel: string } {
  if (score >= 80) return { priority: 'high', priorityLabel: 'Høy' };
  if (score >= 50) return { priority: 'medium', priorityLabel: 'Medium' };
  return { priority: 'low', priorityLabel: 'Lav' };
}

function getDueRank(followUp: FollowUpRow | null, todayInput: string) {
  if (!followUp?.due_date) return 9_999;
  if (followUp.due_date <= todayInput) return -1;
  const today = new Date(`${todayInput}T00:00:00`);
  const due = new Date(`${followUp.due_date}T00:00:00`);
  if (Number.isNaN(today.getTime()) || Number.isNaN(due.getTime())) return 9_999;
  return Math.floor((due.getTime() - today.getTime()) / 86_400_000);
}

function chooseOpenFollowUp(rows: FollowUpRow[], todayInput: string) {
  if (!rows.length) return null;
  return [...rows].sort((a, b) => getDueRank(a, todayInput) - getDueRank(b, todayInput))[0] ?? null;
}

function getSuggestedTitle(contact: Contact, text: string, classification: ClassificationRow | null) {
  const haystack = `${text} ${classification?.category ?? ''}`;
  if (includesAny(haystack, ['verdivurdering', 'verdi', 'valuation'])) return `Følg opp verdivurdering med ${firstName(contact.full_name)}`;
  if (includesAny(haystack, ['salg', 'selge', 'selger', 'vurderer salg'])) return `Følg opp salgsplan med ${firstName(contact.full_name)}`;
  if (includesAny(haystack, ['tidligere kunde', 'kunde'])) return `Sjekk inn med ${firstName(contact.full_name)}`;
  return `Følg opp ${firstName(contact.full_name)}`;
}

function getRecommendedAction(text: string, classification: ClassificationRow | null, openFollowUp: FollowUpRow | null) {
  const haystack = `${text} ${classification?.category ?? ''}`;
  if (openFollowUp?.due_date) return 'Ta oppfølgingen som allerede ligger klar.';
  if (includesAny(haystack, ['verdivurdering', 'verdi'])) return 'Start med en kort melding om oppdatert verdivurdering.';
  if (includesAny(haystack, ['vurderer salg', 'salg', 'selge', 'selger'])) return 'Følg opp salgsinteressen med konkret neste steg.';
  if (includesAny(haystack, ['tidligere kunde', 'kunde'])) return 'Send en rolig innsjekk og åpne for marked/prat.';
  return 'Send en kort, personlig oppfølging og sett ny dato.';
}

function buildRecallItem(input: {
  contact: Contact;
  classification: ClassificationRow | null;
  openFollowUps: FollowUpRow[];
  hasUnsentDraft: boolean;
  linkedCaseCount: number;
  today: Date;
  todayInput: string;
}): RecallQueueItem | null {
  const { contact, classification, openFollowUps, hasUnsentDraft, linkedCaseCount, today, todayInput } = input;
  const reasons: string[] = [];
  const text = `${contact.status_raw ?? ''} ${contact.notes ?? ''}`;
  let score = 0;

  const openFollowUp = chooseOpenFollowUp(openFollowUps, todayInput);
  if (openFollowUp?.due_date && openFollowUp.due_date <= todayInput) {
    score += 45;
    reasons.push('Har oppfølging som er forfalt eller skal tas i dag.');
  } else if (openFollowUp?.due_date) {
    const daysUntil = getDueRank(openFollowUp, todayInput);
    if (daysUntil <= 7) {
      score += 25;
      reasons.push('Har oppfølging denne uken.');
    } else {
      score -= 10;
      reasons.push('Har allerede en planlagt oppfølging.');
    }
  } else {
    score += 16;
    reasons.push('Ingen åpen oppfølging ligger klar.');
  }

  const daysSinceLastContact = diffDays(contact.last_contacted_at, today);
  if (daysSinceLastContact === null) {
    score += 18;
    reasons.push('Ingen registrert siste kontakt.');
  } else if (daysSinceLastContact >= 180) {
    score += 38;
    reasons.push(`Ikke fulgt opp på ${daysSinceLastContact} dager.`);
  } else if (daysSinceLastContact >= 90) {
    score += 28;
    reasons.push(`Ikke fulgt opp på ${daysSinceLastContact} dager.`);
  } else if (daysSinceLastContact >= 45) {
    score += 16;
    reasons.push(`Ikke fulgt opp på ${daysSinceLastContact} dager.`);
  }

  if (includesAny(text, ['vurderer salg', 'selge', 'salg', 'selger', 'verdivurdering', 'verdiestimat', 'boligbytte'])) {
    score += 28;
    reasons.push('Har salgssignal i status eller notater.');
  } else if (includesAny(text, ['varm', 'lead', 'interessert', 'senere', 'følg opp', 'ring'])) {
    score += 18;
    reasons.push('Har oppfølgingssignal i kontaktdata.');
  }

  if (classification) {
    if (classification.warmth_score >= 8) {
      score += 30;
      reasons.push(`Klassifisert som ${classification.category}.`);
    } else if (classification.warmth_score >= 6) {
      score += 18;
      reasons.push(`Moderat varm klassifisering: ${classification.category}.`);
    }
  }

  if (hasUnsentDraft) {
    score += 10;
    reasons.push('Har meldingsutkast som ikke er markert sendt.');
  }

  if (linkedCaseCount > 0) {
    score += 8;
    reasons.push('Koblet til sak/adresse.');
  }

  const isEligible = score >= 35 || Boolean(openFollowUp?.due_date && openFollowUp.due_date <= todayInput);
  if (!isEligible) return null;

  const { priority, priorityLabel } = getPriority(score);
  const suggestedDueDate = openFollowUp?.due_date && openFollowUp.due_date >= todayInput ? openFollowUp.due_date : toDateInput(addDays(today, 2));

  return {
    contact,
    score,
    priority,
    priorityLabel,
    reasons: reasons.slice(0, 4),
    recommendedAction: getRecommendedAction(text, classification, openFollowUp),
    suggestedFollowUpTitle: openFollowUp?.title ?? getSuggestedTitle(contact, text, classification),
    suggestedDueDate,
    daysSinceLastContact,
    latestClassification: classification
      ? {
          category: classification.category,
          warmth_score: classification.warmth_score,
          reasoning: classification.reasoning,
        }
      : null,
    openFollowUp: openFollowUp ? { id: openFollowUp.id, title: openFollowUp.title, due_date: openFollowUp.due_date } : null,
    hasUnsentDraft,
    linkedCaseCount,
  };
}

export async function getRecallQueue(limit = 30): Promise<RecallQueueItem[]> {
  const user = await getAuthenticatedUser();
  if (!user) return [];

  try {
    const supabase = createServiceRoleSupabaseClient();
    const today = new Date();
    const todayInput = toDateInput(today);

    const [contactsResult, classificationsResult, followUpsResult, draftsResult, caseContactsResult] = await Promise.all([
      supabase.from('contacts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase
        .from('contact_classifications')
        .select('contact_id, category, warmth_score, reasoning, created_at, contacts!inner(user_id)')
        .eq('contacts.user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('follow_ups').select('id, contact_id, title, due_date, status, created_at').eq('user_id', user.id).neq('status', 'completed'),
      supabase.from('message_drafts').select('contact_id, sent, approved, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('case_contacts').select('contact_id').eq('user_id', user.id),
    ]);

    if (contactsResult.error) throw contactsResult.error;
    if (classificationsResult.error) throw classificationsResult.error;
    if (followUpsResult.error) throw followUpsResult.error;
    if (draftsResult.error) throw draftsResult.error;
    if (caseContactsResult.error) throw caseContactsResult.error;

    const latestClassificationByContact = new Map<string, ClassificationRow>();
    ((classificationsResult.data ?? []) as ClassificationRow[]).forEach((row) => {
      if (!latestClassificationByContact.has(row.contact_id)) latestClassificationByContact.set(row.contact_id, row);
    });

    const followUpsByContact = new Map<string, FollowUpRow[]>();
    ((followUpsResult.data ?? []) as FollowUpRow[]).forEach((row) => {
      const group = followUpsByContact.get(row.contact_id) ?? [];
      group.push(row);
      followUpsByContact.set(row.contact_id, group);
    });

    const draftByContact = new Map<string, DraftRow>();
    ((draftsResult.data ?? []) as DraftRow[]).forEach((row) => {
      if (!draftByContact.has(row.contact_id)) draftByContact.set(row.contact_id, row);
    });

    const caseCountByContact = new Map<string, number>();
    ((caseContactsResult.data ?? []) as CaseContactRow[]).forEach((row) => {
      caseCountByContact.set(row.contact_id, (caseCountByContact.get(row.contact_id) ?? 0) + 1);
    });

    return ((contactsResult.data ?? []) as Contact[])
      .map((contact) =>
        buildRecallItem({
          contact,
          classification: latestClassificationByContact.get(contact.id) ?? null,
          openFollowUps: followUpsByContact.get(contact.id) ?? [],
          hasUnsentDraft: Boolean(draftByContact.get(contact.id) && !draftByContact.get(contact.id)?.sent),
          linkedCaseCount: caseCountByContact.get(contact.id) ?? 0,
          today,
          todayInput,
        }),
      )
      .filter((item): item is RecallQueueItem => Boolean(item))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch {
    return [];
  }
}
