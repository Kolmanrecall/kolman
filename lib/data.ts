import { createServiceRoleSupabaseClient, getAuthenticatedUser } from '@/lib/supabase-server';
import type { Contact, ContactActivity, FollowUp, PropertyCase, PropertyCaseContact } from '@/lib/types';

type FollowUpRow = Omit<FollowUp, 'contact'> & {
  contacts?: {
    id: string;
    full_name: string;
    city: string | null;
  } | null;
};

async function getCurrentUserId() {
  const user = await getAuthenticatedUser();
  return user?.id ?? null;
}

function isMissingRow(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'PGRST116');
}

function throwDataError(scope: string, error: unknown): never {
  console.error(`[Kolman data] ${scope}`, error);
  throw new Error('Vi får ikke kontakt med dataene dine akkurat nå. Prøv igjen om litt.');
}

function monthStartIso(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0)).toISOString();
}


function normalizeFollowUps(rows: FollowUpRow[] | null | undefined): FollowUp[] {
  return (rows ?? []).map((row) => {
    const { contacts, ...followUp } = row;
    return {
      ...followUp,
      contact: contacts ? { id: contacts.id, full_name: contacts.full_name, city: contacts.city } : null,
    };
  });
}

export async function getContacts(): Promise<Contact[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Contact[];
  } catch (error) {
    throwDataError('getContacts', error);
  }
}

export async function getContactById(id: string): Promise<Contact | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data as Contact;
  } catch (error) {
    if (isMissingRow(error)) return null;
    throwDataError('getContactById', error);
  }
}

export async function getLatestClassification(contactId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data, error } = await supabase
      .from('contact_classifications')
      .select('*, contacts!inner(user_id)')
      .eq('contact_id', contactId)
      .eq('contacts.user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    throwDataError('getLatestClassification', error);
  }
}

export async function getDashboardStats() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return {
      totalContacts: 0,
      warmOpportunities: 0,
      draftsCreated: 0,
      openFollowUps: 0,
      activeCases: 0,
      spokenThisMonth: 0,
      completedFollowUpsThisMonth: 0,
      workedContactsThisMonth: 0,
      casesMovedThisMonth: 0,
    };
  }

  try {
    const supabase = createServiceRoleSupabaseClient();
    const monthStart = monthStartIso();

    const [contactsResult, classificationsResult, draftsResult, followUpsResult, casesResult, activityResult, completedFollowUpsResult, caseMovementResult] = await Promise.all([
      supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase
        .from('contact_classifications')
        .select('warmth_score, contacts!inner(user_id)')
        .eq('contacts.user_id', userId),
      supabase.from('message_drafts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase
        .from('follow_ups')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .neq('status', 'completed'),
      supabase
        .from('property_cases')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('status', 'in', '(sold,lost,archived,closed)'),
      supabase
        .from('contact_activities')
        .select('contact_id, activity_type')
        .eq('user_id', userId)
        .gte('created_at', monthStart)
        .in('activity_type', ['contacted_spoke', 'contacted_left_message', 'contacted_no_answer', 'contacted']),
      supabase
        .from('follow_ups')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('completed_at', monthStart),
      supabase.from('property_cases').select('id, status, created_at, updated_at').eq('user_id', userId),
    ]);

    if (contactsResult.error) throw contactsResult.error;
    if (classificationsResult.error) throw classificationsResult.error;
    if (draftsResult.error) throw draftsResult.error;
    if (followUpsResult.error) throw followUpsResult.error;
    if (casesResult.error) throw casesResult.error;
    if (activityResult.error) throw activityResult.error;
    if (completedFollowUpsResult.error) throw completedFollowUpsResult.error;
    if (caseMovementResult.error) throw caseMovementResult.error;

    const dbContacts = contactsResult.count ?? 0;
    const dbWarm = (classificationsResult.data ?? []).filter((item: { warmth_score?: number | null }) => (item.warmth_score ?? 0) >= 7).length;
    const dbDrafts = draftsResult.count ?? 0;
    const dbFollowUps = followUpsResult.count ?? 0;
    const dbCases = casesResult.count ?? 0;
    const activities = (activityResult.data ?? []) as Array<{ contact_id: string | null; activity_type: string | null }>;
    const workedContactIds = new Set(activities.map((activity) => activity.contact_id).filter(Boolean));
    const spokenThisMonth = activities.filter((activity) => activity.activity_type === 'contacted_spoke' || activity.activity_type === 'contacted').length;
    const movedCases = (caseMovementResult.data ?? []).filter((item: { status?: string | null; created_at?: string | null; updated_at?: string | null }) => {
      if (!['valuation', 'befaring', 'assignment', 'sold'].includes(item.status ?? '')) return false;
      const movedAt = item.updated_at || item.created_at || '';
      return movedAt >= monthStart;
    }).length;

    return {
      totalContacts: dbContacts,
      warmOpportunities: dbWarm,
      draftsCreated: dbDrafts,
      openFollowUps: dbFollowUps,
      activeCases: dbCases,
      spokenThisMonth,
      completedFollowUpsThisMonth: completedFollowUpsResult.count ?? 0,
      workedContactsThisMonth: workedContactIds.size,
      casesMovedThisMonth: movedCases,
    };
  } catch (error) {
    throwDataError('getDashboardStats', error);
  }
}

export async function getLatestMessageDraft(contactId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data, error } = await supabase
      .from('message_drafts')
      .select('*')
      .eq('contact_id', contactId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    throwDataError('getLatestMessageDraft', error);
  }
}

export async function getLatestReplyAnalysis(contactId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data, error } = await supabase
      .from('contact_replies')
      .select('*, contacts!inner(user_id)')
      .eq('contact_id', contactId)
      .eq('contacts.user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    throwDataError('getLatestReplyAnalysis', error);
  }
}

export async function getContactActivities(contactId: string): Promise<ContactActivity[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data, error } = await supabase
      .from('contact_activities')
      .select('*')
      .eq('contact_id', contactId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return (data ?? []) as ContactActivity[];
  } catch (error) {
    throwDataError('getContactActivities', error);
  }
}

export async function getUpcomingFollowUps(limit = 10): Promise<FollowUp[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data, error } = await supabase
      .from('follow_ups')
      .select('*, contacts!inner(id, full_name, city, user_id)')
      .eq('user_id', userId)
      .eq('contacts.user_id', userId)
      .neq('status', 'completed')
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return normalizeFollowUps(data as FollowUpRow[]);
  } catch (error) {
    throwDataError('getUpcomingFollowUps', error);
  }
}

export async function getContactFollowUps(contactId: string): Promise<FollowUp[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data, error } = await supabase
      .from('follow_ups')
      .select('*, contacts!inner(id, full_name, city, user_id)')
      .eq('user_id', userId)
      .eq('contact_id', contactId)
      .eq('contacts.user_id', userId)
      .neq('status', 'completed')
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return normalizeFollowUps(data as FollowUpRow[]);
  } catch (error) {
    throwDataError('getContactFollowUps', error);
  }
}


function normalizeCaseContacts(rows: PropertyCaseContact[] | null | undefined): PropertyCaseContact[] {
  return (rows ?? []).map((row) => ({
    ...row,
    contact: row.contact ?? null,
  }));
}

export async function getPropertyCases(): Promise<PropertyCase[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data: cases, error: casesError } = await supabase
      .from('property_cases')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (casesError) throw casesError;

    const caseRows = (cases ?? []) as PropertyCase[];
    const caseIds = caseRows.map((item) => item.id);

    if (!caseIds.length) return caseRows.map((item) => ({ ...item, contacts: [] }));

    const { data: links, error: linksError } = await supabase
      .from('case_contacts')
      .select('*, contact:contacts(id, full_name, city, email, phone)')
      .eq('user_id', userId)
      .in('case_id', caseIds)
      .order('created_at', { ascending: true });

    if (linksError) throw linksError;

    const linksByCase = new Map<string, PropertyCaseContact[]>();
    normalizeCaseContacts(links as PropertyCaseContact[]).forEach((link) => {
      const group = linksByCase.get(link.case_id) ?? [];
      group.push(link);
      linksByCase.set(link.case_id, group);
    });

    return caseRows.map((item) => ({ ...item, contacts: linksByCase.get(item.id) ?? [] }));
  } catch (error) {
    throwDataError('getPropertyCases', error);
  }
}

export async function getPropertyCaseById(id: string): Promise<PropertyCase | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data: propertyCase, error: caseError } = await supabase
      .from('property_cases')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (caseError || !propertyCase) throw caseError;

    const { data: links, error: linksError } = await supabase
      .from('case_contacts')
      .select('*, contact:contacts(id, full_name, city, email, phone)')
      .eq('case_id', id)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (linksError) throw linksError;

    return { ...(propertyCase as PropertyCase), contacts: normalizeCaseContacts(links as PropertyCaseContact[]) };
  } catch (error) {
    if (isMissingRow(error)) return null;
    throwDataError('getPropertyCaseById', error);
  }
}

export async function getCaseFollowUps(caseId: string): Promise<FollowUp[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data: links, error: linksError } = await supabase
      .from('case_contacts')
      .select('contact_id')
      .eq('case_id', caseId)
      .eq('user_id', userId);

    if (linksError) throw linksError;

    const contactIds = (links ?? []).map((link) => link.contact_id);
    if (!contactIds.length) return [];

    const { data, error } = await supabase
      .from('follow_ups')
      .select('*, contacts!inner(id, full_name, city, user_id)')
      .eq('user_id', userId)
      .eq('contacts.user_id', userId)
      .in('contact_id', contactIds)
      .neq('status', 'completed')
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return normalizeFollowUps(data as FollowUpRow[]);
  } catch (error) {
    throwDataError('getCaseFollowUps', error);
  }
}

export async function getContactPropertyCases(contactId: string): Promise<PropertyCase[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data: links, error: linksError } = await supabase
      .from('case_contacts')
      .select('*, case:property_cases(*)')
      .eq('user_id', userId)
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    if (linksError) throw linksError;

    return ((links ?? []) as Array<PropertyCaseContact & { case?: PropertyCase | null }>).flatMap((link) => {
      if (!link.case) return [];
      return [{ ...link.case, contacts: [link] }];
    });
  } catch (error) {
    throwDataError('getContactPropertyCases', error);
  }
}
