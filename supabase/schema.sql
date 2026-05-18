-- Senlo Supabase schema
-- Run this in the Supabase SQL editor before enabling cloud sync in the app.
-- The client uses the public anon key plus Supabase Auth session; RLS is required.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.interviews (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text,
  position_name text,
  job_description text,
  base_location text,
  contact_name text,
  intention_level text,
  overall_progress text,
  status text,
  current_round integer,
  rounds_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.interview_rounds (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_id text not null references public.interviews(id) on delete cascade,
  round_index integer not null check (round_index between 0 and 3),
  interview_time timestamptz,
  method_or_location text,
  result text,
  note text,
  uploaded_file_id text,
  transcript_id text,
  summary_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.uploaded_files (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_id text references public.interviews(id) on delete set null,
  round_index integer,
  file_name text,
  file_type text,
  file_size bigint,
  duration numeric,
  storage_path text,
  public_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transcripts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_id text references public.interviews(id) on delete set null,
  round_index integer,
  source_type text,
  text text,
  segments_json jsonb not null default '[]'::jsonb,
  speaker_count integer,
  duration numeric,
  audio_file_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_summaries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_id text references public.interviews(id) on delete set null,
  round_index integer,
  transcript_id text,
  model_provider text,
  model_id text,
  report_json jsonb not null default '{}'::jsonb,
  report_markdown text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.history_records (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_id text references public.interviews(id) on delete set null,
  round_index integer,
  transcript_id text,
  summary_id text,
  title text,
  company_name text,
  position_name text,
  source_text text,
  source_by_mode_json jsonb not null default '{}'::jsonb,
  input_mode text,
  output_type text,
  mode text,
  model_used text,
  report_json jsonb not null default '{}'::jsonb,
  generated_at timestamptz,
  generated_source_hash text,
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  text_model_provider text,
  text_model_id text,
  text_model_base_url text,
  asr_provider text,
  asr_model_id text,
  asr_base_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.interviews enable row level security;
alter table public.interview_rounds enable row level security;
alter table public.uploaded_files enable row level security;
alter table public.transcripts enable row level security;
alter table public.ai_summaries enable row level security;
alter table public.history_records enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "interviews_owner_all" on public.interviews;
drop policy if exists "interview_rounds_owner_all" on public.interview_rounds;
drop policy if exists "uploaded_files_owner_all" on public.uploaded_files;
drop policy if exists "transcripts_owner_all" on public.transcripts;
drop policy if exists "ai_summaries_owner_all" on public.ai_summaries;
drop policy if exists "history_records_owner_all" on public.history_records;
drop policy if exists "user_settings_owner_all" on public.user_settings;

create policy "interviews_owner_all" on public.interviews for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "interview_rounds_owner_all" on public.interview_rounds for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "uploaded_files_owner_all" on public.uploaded_files for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "transcripts_owner_all" on public.transcripts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ai_summaries_owner_all" on public.ai_summaries for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "history_records_owner_all" on public.history_records for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_settings_owner_all" on public.user_settings for all using (user_id = auth.uid()) with check (user_id = auth.uid() and id = auth.uid());

create index if not exists interviews_user_next_idx on public.interviews (user_id, updated_at desc);
create index if not exists history_user_created_idx on public.history_records (user_id, created_at desc);
create index if not exists transcripts_user_created_idx on public.transcripts (user_id, created_at desc);
create index if not exists summaries_user_created_idx on public.ai_summaries (user_id, created_at desc);
create index if not exists files_user_created_idx on public.uploaded_files (user_id, created_at desc);

-- Optional future storage bucket for full audio cross-device sync.
-- The current prototype syncs uploaded file metadata, transcripts and reports.
insert into storage.buckets (id, name, public)
values ('audio-files', 'audio-files', false)
on conflict (id) do nothing;

drop policy if exists "audio_files_owner_select" on storage.objects;
drop policy if exists "audio_files_owner_insert" on storage.objects;
drop policy if exists "audio_files_owner_update" on storage.objects;
drop policy if exists "audio_files_owner_delete" on storage.objects;
create policy "audio_files_owner_select" on storage.objects for select
  using (bucket_id = 'audio-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "audio_files_owner_insert" on storage.objects for insert
  with check (bucket_id = 'audio-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "audio_files_owner_update" on storage.objects for update
  using (bucket_id = 'audio-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'audio-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "audio_files_owner_delete" on storage.objects for delete
  using (bucket_id = 'audio-files' and (storage.foldername(name))[1] = auth.uid()::text);
