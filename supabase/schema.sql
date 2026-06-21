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

create table if not exists contact_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  activity_type text not null default 'note',
  body text not null,
  created_at timestamptz default now()
);

create index if not exists contact_activities_user_id_created_at_idx on contact_activities(user_id, created_at desc);
create index if not exists contact_activities_contact_id_created_at_idx on contact_activities(contact_id, created_at desc);

alter table users enable row level security;
alter table contacts enable row level security;
alter table contact_classifications enable row level security;
alter table message_drafts enable row level security;
alter table contact_replies enable row level security;
alter table contact_activities enable row level security;

drop policy if exists "Users can read own profile" on users;
drop policy if exists "Users can update own profile" on users;
drop policy if exists "Users can read own contacts" on contacts;
drop policy if exists "Users can insert own contacts" on contacts;
drop policy if exists "Users can update own contacts" on contacts;
drop policy if exists "Users can delete own contacts" on contacts;
drop policy if exists "Users can read own classifications" on contact_classifications;
drop policy if exists "Users can insert own classifications" on contact_classifications;
drop policy if exists "Users can read own drafts" on message_drafts;
drop policy if exists "Users can insert own drafts" on message_drafts;
drop policy if exists "Users can update own drafts" on message_drafts;
drop policy if exists "Users can read own replies" on contact_replies;
drop policy if exists "Users can insert own replies" on contact_replies;
drop policy if exists "Users can read own activities" on contact_activities;
drop policy if exists "Users can insert own activities" on contact_activities;
drop policy if exists "Users can update own activities" on contact_activities;
drop policy if exists "Users can delete own activities" on contact_activities;

create policy "Users can read own profile"
on users for select
to authenticated
using (id = auth.uid());

create policy "Users can update own profile"
on users for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Users can read own contacts"
on contacts for select
to authenticated
using (user_id = auth.uid());

create policy "Users can insert own contacts"
on contacts for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update own contacts"
on contacts for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete own contacts"
on contacts for delete
to authenticated
using (user_id = auth.uid());

create policy "Users can read own classifications"
on contact_classifications for select
to authenticated
using (
  exists (
    select 1 from contacts
    where contacts.id = contact_classifications.contact_id
      and contacts.user_id = auth.uid()
  )
);

create policy "Users can insert own classifications"
on contact_classifications for insert
to authenticated
with check (
  exists (
    select 1 from contacts
    where contacts.id = contact_classifications.contact_id
      and contacts.user_id = auth.uid()
  )
);

create policy "Users can read own drafts"
on message_drafts for select
to authenticated
using (user_id = auth.uid());

create policy "Users can insert own drafts"
on message_drafts for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update own drafts"
on message_drafts for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can read own replies"
on contact_replies for select
to authenticated
using (
  exists (
    select 1 from contacts
    where contacts.id = contact_replies.contact_id
      and contacts.user_id = auth.uid()
  )
);

create policy "Users can insert own replies"
on contact_replies for insert
to authenticated
with check (
  exists (
    select 1 from contacts
    where contacts.id = contact_replies.contact_id
      and contacts.user_id = auth.uid()
  )
);


create policy "Users can read own activities"
on contact_activities for select
to authenticated
using (user_id = auth.uid());

create policy "Users can insert own activities"
on contact_activities for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from contacts
    where contacts.id = contact_activities.contact_id
      and contacts.user_id = auth.uid()
  )
);

create policy "Users can update own activities"
on contact_activities for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete own activities"
on contact_activities for delete
to authenticated
using (user_id = auth.uid());
