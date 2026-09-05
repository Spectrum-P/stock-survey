-- Managed, versioned report generation and review.
-- Existing reports remain readable through draft_content while new reports use
-- structured document content and durable generation jobs.

alter table public.reports
  add column if not exists title text,
  add column if not exists generation_status text not null default 'ready',
  add column if not exists review_status text not null default 'draft',
  add column if not exists progress integer not null default 100,
  add column if not exists current_step text,
  add column if not exists source_hash text,
  add column if not exists template_version text not null default 'stock-condition-a4-v1',
  add column if not exists model text,
  add column if not exists generation_started_at timestamptz,
  add column if not exists generation_completed_at timestamptz,
  add column if not exists structured_content jsonb not null default '{}'::jsonb;

alter table public.reports
  drop constraint if exists reports_generation_status_check;
alter table public.reports
  add constraint reports_generation_status_check check (generation_status in ('queued','preparing','generating','assembling','ready','failed'));
alter table public.reports
  drop constraint if exists reports_review_status_check;
alter table public.reports
  add constraint reports_review_status_check check (review_status in ('draft','in_review','approved'));
alter table public.reports
  drop constraint if exists reports_progress_check;
alter table public.reports
  add constraint reports_progress_check check (progress between 0 and 100);

update public.reports
set generation_status = case when status = 'generating' then 'generating' when status = 'failed' then 'failed' else 'ready' end,
    review_status = case when status = 'approved' then 'approved' else 'draft' end,
    progress = case when status in ('draft','approved') then 100 else 0 end,
    title = coalesce(title, case when scope_type = 'portfolio' then 'Portfolio stock condition report' when scope_type = 'property' then 'Property stock condition report' else 'Stock condition report' end)
where title is null or generation_status is null;

create table if not exists public.report_sections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_id uuid not null references public.reports(id) on delete cascade,
  section_key text not null,
  title text not null,
  display_order integer not null,
  ai_content jsonb not null default '{}'::jsonb,
  edited_content jsonb,
  included boolean not null default true,
  generation_status text not null default 'queued' check (generation_status in ('queued','generating','ready','failed')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(report_id, section_key)
);

create table if not exists public.report_photos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_id uuid not null references public.reports(id) on delete cascade,
  media_id uuid not null references public.media(id) on delete cascade,
  survey_element_id uuid not null references public.survey_elements(id) on delete cascade,
  section_key text not null default 'photo_schedule',
  caption text,
  display_order integer not null default 0,
  included boolean not null default true,
  created_at timestamptz not null default now(),
  unique(report_id, media_id)
);

create table if not exists public.report_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_id uuid not null references public.reports(id) on delete cascade,
  version integer not null,
  document jsonb not null,
  status text not null check (status in ('draft','approved')),
  created_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique(report_id, version)
);

create table if not exists public.report_generation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_id uuid not null references public.reports(id) on delete cascade,
  request_id uuid not null,
  status text not null default 'queued' check (status in ('queued','running','completed','failed')),
  attempt integer not null default 0,
  total_steps integer not null default 1,
  completed_steps integer not null default 0,
  current_step text,
  provider_request_ids jsonb not null default '[]'::jsonb,
  token_usage jsonb not null default '{}'::jsonb,
  events jsonb not null default '[]'::jsonb,
  error jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(report_id, request_id)
);

create table if not exists public.report_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_id uuid not null references public.reports(id) on delete cascade,
  run_id uuid not null references public.report_generation_runs(id) on delete cascade,
  scope jsonb not null,
  status text not null default 'queued' check (status in ('queued','processing','completed','failed')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(run_id)
);

create index if not exists report_jobs_ready_idx on public.report_generation_jobs(status, available_at);
create index if not exists report_sections_report_idx on public.report_sections(report_id, display_order);
create index if not exists report_versions_report_idx on public.report_versions(report_id, version desc);
create index if not exists report_runs_report_idx on public.report_generation_runs(report_id, created_at desc);

alter table public.report_sections enable row level security;
alter table public.report_photos enable row level security;
alter table public.report_versions enable row level security;
alter table public.report_generation_runs enable row level security;
alter table public.report_generation_jobs enable row level security;

do $$ declare table_name text; begin foreach table_name in array array['report_sections','report_photos','report_versions','report_generation_runs','report_generation_jobs'] loop execute format('drop policy if exists org_isolation on public.%I', table_name); execute format('create policy org_isolation on public.%I for all to authenticated using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id())', table_name); end loop; end $$;

grant select, insert, update on public.report_sections, public.report_photos, public.report_versions, public.report_generation_runs, public.report_generation_jobs to authenticated;
