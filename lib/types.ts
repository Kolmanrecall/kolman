export type Contact = {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  notes: string | null;
  source: string | null;
  status_raw: string | null;
  last_contacted_at: string | null;
  created_at: string;
};

export type ContactActivity = {
  id: string;
  user_id: string;
  contact_id: string;
  activity_type: string;
  body: string;
  created_at: string;
};

export type FollowUp = {
  id: string;
  user_id: string;
  contact_id: string;
  title: string;
  note: string | null;
  due_date: string | null;
  status: 'open' | 'completed' | 'postponed';
  created_at: string;
  completed_at: string | null;
  contact?: {
    id: string;
    full_name: string;
    city: string | null;
  } | null;
};

export type PropertyCaseStatus = 'lead' | 'valuation' | 'befaring' | 'assignment' | 'sold' | 'lost' | 'archived';

export type PropertyCaseContact = {
  id: string;
  user_id: string;
  case_id: string;
  contact_id: string;
  role: string | null;
  note: string | null;
  created_at: string;
  contact?: {
    id: string;
    full_name: string;
    city: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

export type PropertyCase = {
  id: string;
  user_id: string;
  title: string;
  address: string | null;
  city: string | null;
  status: PropertyCaseStatus;
  next_step: string | null;
  next_step_due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  contacts?: PropertyCaseContact[];
};

export type ContactClassification = {
  category: string;
  warmthScore: number;
  recommendedFlow: string;
  reasoning: string;
};

export type MessageGeneration = {
  messageText: string;
  intent: string;
  explanation: string;
};

export type ReplyAnalysis = {
  replyCategory: string;
  nextStep: string;
  suggestedResponse: string;
};
