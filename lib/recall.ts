import { createServiceRoleSupabaseClient, getAuthenticatedUser } from '@/lib/supabase-server';
import { isOpenCaseStatus } from '@/lib/case-status';
import type { Contact, PropertyCaseStatus } from '@/lib/types';

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
  latestNote: string | null;
  latestAttempt: {
    type: string;
    label: string;
    created_at: string;
  } | null;
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
  caseSignal: {
    title: string;
    label: string;
    due_date: string | null;
  } | null;
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
  case?: {
    id: string;
    title: string;
    status: PropertyCaseStatus | string | null;
    next_step: string | null;
    next_step_due_date: string | null;
  } | null;
};

type ReplyRow = {
  contact_id: string;
  reply_category: string;
  next_step: string;
  reply_text: string;
  created_at: string;
};

type ActivityRow = {
  contact_id: string;
  activity_type: string;
  body: string;
  created_at: string;
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

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function includesAny(value: string, words: string[]) {
  const normalized = value.toLowerCase();
  return words.some((word) => {
    const normalizedWord = word.toLowerCase().trim();
    if (!normalizedWord) return false;
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegex(normalizedWord)}($|[^\\p{L}\\p{N}])`, 'iu');
    return pattern.test(normalized);
  });
}

const stoppingReplyCategories = ['ikke interessert', 'avmeldt', 'stopp'];
const stoppingReplyNextSteps = ['stopp oppfølging', 'ikke kontakt', 'ikke ring', 'fjern meg'];
const saleSignalWords = ['vurderer salg', 'selge', 'salg', 'selger', 'verdivurdering', 'verdiestimat', 'boligbytte'];
const followUpSignalWords = ['varm', 'lead', 'interessert', 'senere', 'følg opp', 'ring', 'tidligere', 'kunde', 'kjøper'];

function hasStructuredStopSignal(reply: ReplyRow | null) {
  if (!reply) return false;
  return includesAny(reply.reply_category ?? '', stoppingReplyCategories) || includesAny(reply.next_step ?? '', stoppingReplyNextSteps);
}

function throwRecallError(scope: string, error: unknown): never {
  console.error(`[Kolman recall] ${scope}`, error);
  throw new Error('Vi får ikke hentet oppfølgingskøen akkurat nå. Prøv igjen om litt.');
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function getPriority(score: number, hasConfirmedHumanSignal: boolean): { priority: RecallPriority; priorityLabel: string } {
  if (score >= 80 && hasConfirmedHumanSignal) return { priority: 'high', priorityLabel: 'Høy' };
  if (score >= 50) return { priority: 'medium', priorityLabel: 'Medium' };
  return { priority: 'low', priorityLabel: 'Lav' };
}

function getDaysUntilDate(date: string | null | undefined, todayInput: string) {
  if (!date) return 9_999;
  if (date <= todayInput) return -1;
  const today = new Date(`${todayInput}T00:00:00`);
  const due = new Date(`${date}T00:00:00`);
  if (Number.isNaN(today.getTime()) || Number.isNaN(due.getTime())) return 9_999;
  return Math.floor((due.getTime() - today.getTime()) / 86_400_000);
}

function getDueRank(followUp: FollowUpRow | null, todayInput: string) {
  return getDaysUntilDate(followUp?.due_date, todayInput);
}

function chooseOpenFollowUp(rows: FollowUpRow[], todayInput: string) {
  if (!rows.length) return null;
  return [...rows].sort((a, b) => getDueRank(a, todayInput) - getDueRank(b, todayInput))[0] ?? null;
}

function getLatestNoteSnippet(notes: string | null | undefined) {
  if (!notes?.trim()) return null;
  const blocks = notes
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);
  const latest = blocks.at(-1) ?? notes.trim();
  return latest.replace(/^\[[^\]]+\]\s*/, '').slice(0, 320);
}

function getAttemptLabel(activityType: string) {
  if (activityType === 'contacted_spoke' || activityType === 'contacted') return 'Snakket med';
  if (activityType === 'contacted_left_message') return 'La igjen beskjed';
  if (activityType === 'contacted_no_answer') return 'Ikke svar';
  return 'Kontaktforsøk';
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
  linkedCases: CaseContactRow[];
  latestReply: ReplyRow | null;
  latestAttempt: ActivityRow | null;
  today: Date;
  todayInput: string;
}): RecallQueueItem | null {
  const { contact, classification, openFollowUps, hasUnsentDraft, linkedCases, latestReply, latestAttempt, today, todayInput } = input;
  const linkedCaseCount = linkedCases.length;
  const reasons: { text: string; weight: number }[] = [];
  const text = `${contact.status_raw ?? ''} ${contact.notes ?? ''}`;

  if (contact.snoozed_until && contact.snoozed_until >= todayInput) {
    return null;
  }

  if (hasStructuredStopSignal(latestReply)) {
    return null;
  }

  let score = 0;
  let hasConfirmedHumanSignal = false;

  const openFollowUp = chooseOpenFollowUp(openFollowUps, todayInput);
  if (openFollowUp?.due_date && openFollowUp.due_date <= todayInput) {
    score += 45;
    hasConfirmedHumanSignal = true;
    reasons.push({ text: 'Har oppfølging som er forfalt eller skal tas i dag.', weight: 45 });
  } else if (openFollowUp?.due_date) {
    const daysUntil = getDueRank(openFollowUp, todayInput);
    if (daysUntil <= 7) {
      score += 25;
      reasons.push({ text: 'Har oppfølging denne uken.', weight: 25 });
    } else {
      score -= 10;
      reasons.push({ text: 'Har allerede en planlagt oppfølging.', weight: -10 });
    }
  } else if (openFollowUp) {
    score += 6;
    reasons.push({ text: 'Har åpen oppfølging uten dato.', weight: 6 });
  } else {
    score += 16;
    reasons.push({ text: 'Ingen åpen oppfølging ligger klar.', weight: 16 });
  }

  const daysSinceLastContact = diffDays(contact.last_contacted_at, today);
  if (daysSinceLastContact === null) {
    score += 18;
    reasons.push({ text: 'Ingen registrert siste kontakt.', weight: 18 });
  } else if (daysSinceLastContact >= 180) {
    score += 38;
    reasons.push({ text: `Ikke fulgt opp på ${daysSinceLastContact} dager.`, weight: 38 });
  } else if (daysSinceLastContact >= 90) {
    score += 28;
    reasons.push({ text: `Ikke fulgt opp på ${daysSinceLastContact} dager.`, weight: 28 });
  } else if (daysSinceLastContact >= 45) {
    score += 16;
    reasons.push({ text: `Ikke fulgt opp på ${daysSinceLastContact} dager.`, weight: 16 });
  }

  if (latestReply) {
    hasConfirmedHumanSignal = true;
  }

  if (includesAny(text, saleSignalWords)) {
    score += 28;
    reasons.push({ text: 'Har salgssignal i status eller notater.', weight: 28 });
  } else if (includesAny(text, followUpSignalWords)) {
    score += 18;
    reasons.push({ text: 'Har oppfølgingssignal i kontaktdata.', weight: 18 });
  }

  if (classification) {
    if (classification.warmth_score >= 8) {
      score += 30;
      hasConfirmedHumanSignal = true;
      reasons.push({ text: `Klassifisert som ${classification.category}.`, weight: 30 });
    } else if (classification.warmth_score >= 6) {
      score += 18;
      reasons.push({ text: `Moderat varm klassifisering: ${classification.category}.`, weight: 18 });
    }
  }

  if (hasUnsentDraft) {
    score += 10;
    reasons.push({ text: 'Har meldingsutkast som ikke er markert sendt.', weight: 10 });
  }

  const openLinkedCases = linkedCases
    .map((link) => link.case)
    .filter((propertyCase): propertyCase is NonNullable<CaseContactRow['case']> => Boolean(propertyCase && isOpenCaseStatus(propertyCase.status)));
  const mostUrgentCase = openLinkedCases
    .filter((propertyCase) => propertyCase.next_step_due_date)
    .sort((a, b) => getDaysUntilDate(a.next_step_due_date, todayInput) - getDaysUntilDate(b.next_step_due_date, todayInput))[0] ?? null;
  let caseSignal: RecallQueueItem['caseSignal'] = null;

  if (mostUrgentCase) {
    const daysUntilCaseStep = getDaysUntilDate(mostUrgentCase.next_step_due_date, todayInput);
    const caseTitle = mostUrgentCase.title || 'Sak';
    if (daysUntilCaseStep <= 0) {
      score += 42;
      hasConfirmedHumanSignal = true;
      caseSignal = { title: caseTitle, label: 'Forfalt neste steg', due_date: mostUrgentCase.next_step_due_date };
      reasons.push({ text: `Sak har forfalt neste steg: ${mostUrgentCase.next_step || caseTitle}.`, weight: 42 });
    } else if (daysUntilCaseStep <= 7) {
      score += 24;
      hasConfirmedHumanSignal = true;
      caseSignal = { title: caseTitle, label: 'Neste steg denne uken', due_date: mostUrgentCase.next_step_due_date };
      reasons.push({ text: `Sak har neste steg denne uken: ${mostUrgentCase.next_step || caseTitle}.`, weight: 24 });
    }
  }

  if (!caseSignal && openLinkedCases.length > 0) {
    score += 10;
    caseSignal = { title: openLinkedCases[0]?.title ?? 'Sak', label: 'Aktiv sak/adresse', due_date: openLinkedCases[0]?.next_step_due_date ?? null };
    reasons.push({ text: 'Koblet til aktiv sak/adresse.', weight: 10 });
  } else if (!caseSignal && linkedCaseCount > 0) {
    score += 4;
    reasons.push({ text: 'Koblet til arkivert sak/adresse.', weight: 4 });
  }

  if (latestAttempt && diffDays(latestAttempt.created_at, today) === 0) {
    reasons.push({ text: `${getAttemptLabel(latestAttempt.activity_type)} i dag.`, weight: 22 });
  }

  const isEligible = score >= 35 || Boolean(openFollowUp?.due_date && openFollowUp.due_date <= todayInput);
  if (!isEligible) return null;

  const { priority, priorityLabel } = getPriority(score, hasConfirmedHumanSignal);
  const suggestedDueDate = openFollowUp?.due_date && openFollowUp.due_date >= todayInput ? openFollowUp.due_date : toDateInput(addDays(today, 7));

  return {
    contact,
    score,
    priority,
    priorityLabel,
    reasons: reasons
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 4)
      .map((reason) => reason.text),
    recommendedAction: getRecommendedAction(text, classification, openFollowUp),
    suggestedFollowUpTitle: openFollowUp?.title ?? getSuggestedTitle(contact, text, classification),
    suggestedDueDate,
    daysSinceLastContact,
    latestNote: getLatestNoteSnippet(contact.notes),
    latestAttempt: latestAttempt
      ? {
          type: latestAttempt.activity_type,
          label: getAttemptLabel(latestAttempt.activity_type),
          created_at: latestAttempt.created_at,
        }
      : null,
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
    caseSignal,
  };
}

export async function getRecallSnoozedCount(): Promise<number> {
  const user = await getAuthenticatedUser();
  if (!user) return 0;

  try {
    const supabase = createServiceRoleSupabaseClient();
    const todayInput = toDateInput(new Date());
    const { count, error } = await supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('snoozed_until', todayInput);

    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    throwRecallError('getRecallSnoozedCount', error);
  }
}

export async function getRecallQueue(limit = 30): Promise<RecallQueueItem[]> {
  const user = await getAuthenticatedUser();
  if (!user) return [];

  try {
    const supabase = createServiceRoleSupabaseClient();
    const today = new Date();
    const todayInput = toDateInput(today);

    const [contactsResult, classificationsResult, followUpsResult, draftsResult, caseContactsResult, repliesResult, activitiesResult] = await Promise.all([
      supabase.from('contacts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase
        .from('contact_classifications')
        .select('contact_id, category, warmth_score, reasoning, created_at, contacts!inner(user_id)')
        .eq('contacts.user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('follow_ups').select('id, contact_id, title, due_date, status, created_at').eq('user_id', user.id).neq('status', 'completed'),
      supabase.from('message_drafts').select('contact_id, sent, approved, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase
        .from('case_contacts')
        .select('contact_id, case:property_cases(id, title, status, next_step, next_step_due_date)')
        .eq('user_id', user.id),
      supabase
        .from('contact_replies')
        .select('contact_id, reply_category, next_step, reply_text, created_at, contacts!inner(user_id)')
        .eq('contacts.user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('contact_activities')
        .select('contact_id, activity_type, body, created_at')
        .eq('user_id', user.id)
        .in('activity_type', ['contacted', 'contacted_spoke', 'contacted_left_message', 'contacted_no_answer'])
        .order('created_at', { ascending: false }),
    ]);

    if (contactsResult.error) throw contactsResult.error;
    if (classificationsResult.error) throw classificationsResult.error;
    if (followUpsResult.error) throw followUpsResult.error;
    if (draftsResult.error) throw draftsResult.error;
    if (caseContactsResult.error) throw caseContactsResult.error;
    if (repliesResult.error) throw repliesResult.error;
    if (activitiesResult.error) throw activitiesResult.error;

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

    const linkedCasesByContact = new Map<string, CaseContactRow[]>();
    ((caseContactsResult.data ?? []) as CaseContactRow[]).forEach((row) => {
      const group = linkedCasesByContact.get(row.contact_id) ?? [];
      group.push(row);
      linkedCasesByContact.set(row.contact_id, group);
    });

    const latestReplyByContact = new Map<string, ReplyRow>();
    ((repliesResult.data ?? []) as ReplyRow[]).forEach((row) => {
      if (!latestReplyByContact.has(row.contact_id)) latestReplyByContact.set(row.contact_id, row);
    });

    const latestAttemptByContact = new Map<string, ActivityRow>();
    ((activitiesResult.data ?? []) as ActivityRow[]).forEach((row) => {
      if (!latestAttemptByContact.has(row.contact_id)) latestAttemptByContact.set(row.contact_id, row);
    });

    return ((contactsResult.data ?? []) as Contact[])
      .map((contact) =>
        buildRecallItem({
          contact,
          classification: latestClassificationByContact.get(contact.id) ?? null,
          openFollowUps: followUpsByContact.get(contact.id) ?? [],
          hasUnsentDraft: Boolean(draftByContact.get(contact.id) && !draftByContact.get(contact.id)?.sent),
          linkedCases: linkedCasesByContact.get(contact.id) ?? [],
          latestReply: latestReplyByContact.get(contact.id) ?? null,
          latestAttempt: latestAttemptByContact.get(contact.id) ?? null,
          today,
          todayInput,
        }),
      )
      .filter((item): item is RecallQueueItem => Boolean(item))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (error) {
    throwRecallError('getRecallQueue', error);
  }
}
