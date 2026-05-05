import { createServiceRoleSupabaseClient } from '@/lib/supabase-server';
import { getAuthenticatedUser } from '@/lib/auth-user';
import type { Contact } from '@/lib/types';

async function getCurrentUserId() {
  const user = await getAuthenticatedUser();
  return user?.id ?? null;
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
    return { totalContacts: 0, warmOpportunities: 0, draftsCreated: 0, repliesReceived: 0 };
  }

  try {
    const supabase = createServiceRoleSupabaseClient();

    const [contactsResult, classificationsResult, draftsResult, repliesResult] = await Promise.all([
      supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase
        .from('contact_classifications')
        .select('warmth_score, contacts!inner(user_id)')
        .eq('contacts.user_id', userId),
      supabase.from('message_drafts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase
        .from('contact_replies')
        .select('id, contacts!inner(user_id)', { count: 'exact', head: true })
        .eq('contacts.user_id', userId),
    ]);

    const dbContacts = contactsResult.count ?? 0;
    const dbWarm = (classificationsResult.data ?? []).filter((item: { warmth_score?: number | null }) => (item.warmth_score ?? 0) >= 7).length;
    const dbDrafts = draftsResult.count ?? 0;
    const dbReplies = repliesResult.count ?? 0;

    return {
      totalContacts: dbContacts,
      warmOpportunities: dbWarm,
      draftsCreated: dbDrafts,
      repliesReceived: dbReplies,
    };
  } catch {
    return { totalContacts: 0, warmOpportunities: 0, draftsCreated: 0, repliesReceived: 0 };
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
