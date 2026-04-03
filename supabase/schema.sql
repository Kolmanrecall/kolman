create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  company_name text,
  created_at timestamptz default now()
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  city text,
  notes text,
  source text,
  status_raw text,
  last_contacted_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists contact_classifications (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  category text not null,
  warmth_score int not null,
  recommended_flow text not null,
  reasoning text not null,
  created_at timestamptz default now()
);

create table if not exists message_drafts (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  message_text text not null,
  channel text not null,
  intent text not null,
  generated_by_model text not null,
  approved boolean default false,
  sent boolean default false,
  created_at timestamptz default now()
);

create table if not exists contact_replies (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  message_draft_id uuid references message_drafts(id) on delete set null,
  reply_text text not null,
  reply_category text not null,
  next_step text not null,
  suggested_response text,
  created_at timestamptz default now()
);

insert into users (id, name, email, company_name)
values ('00000000-0000-0000-0000-000000000001', 'Demo User', 'demo@kolman.no', 'Kolman')
on conflict (email) do nothing;
