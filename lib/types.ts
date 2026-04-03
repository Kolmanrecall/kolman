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
