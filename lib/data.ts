import { createServiceRoleSupabaseClient, getAuthenticatedUser } from '@/lib/supabase-server';
import type { Contact, ContactActivity, FollowUp } from '@/lib/types';

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
  } catch {
    return [];
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
  } catch {
    return null;
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
  } catch {
    return null;
  }
}

export async function getDashboardStats() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { totalContacts: 0, warmOpportunities: 0, draftsCreated: 0, openFollowUps: 0 };
  }

  try {
    const supabase = createServiceRoleSupabaseClient();

    const [contactsResult, classificationsResult, draftsResult, followUpsResult] = await Promise.all([
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
    ]);

    const dbContacts = contactsResult.count ?? 0;
    const dbWarm = (classificationsResult.data ?? []).filter((item: { warmth_score?: number | null }) => (item.warmth_score ?? 0) >= 7).length;
    const dbDrafts = draftsResult.count ?? 0;
    const dbFollowUps = followUpsResult.count ?? 0;

    return {
      totalContacts: dbContacts,
      warmOpportunities: dbWarm,
      draftsCreated: dbDrafts,
      openFollowUps: dbFollowUps,
    };
  } catch {
    return { totalContacts: 0, warmOpportunities: 0, draftsCreated: 0, openFollowUps: 0 };
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
  } catch {
    return null;
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
  } catch {
    return null;
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
  } catch {
    return [];
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
  } catch {
    return [];
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
  } catch {
    return [];
  }
}
