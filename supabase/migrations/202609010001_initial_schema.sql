create extension if not exists pgcrypto;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Keep the seeded MVP organization available before the Auth profile trigger
-- can provision a newly confirmed user. The seed script repeats this insert
-- idempotently and also backfills users that already existed.
insert into public.organizations (id,name)
values ('00000000-0000-4000-8000-000000000001','Stock Condition Survey MVP')
on conflict (id) do nothing;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id),
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  name text not null, reference text, address_line_1 text not null, address_line_2 text, town text not null, postcode text not null,
  construction_year integer check (construction_year between 1600 and 2200), archived boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1
);

create table public.units (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), property_id uuid not null references public.properties(id) on delete cascade,
  name text not null, reference text, floor text, archived boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
  unique(property_id, name)
);

create table public.surveys (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), property_id uuid not null references public.properties(id), unit_id uuid not null references public.units(id),
  inspection_date date not null, surveyor_id uuid references public.profiles(id), status text not null default 'draft' check (status in ('draft','in_progress','completed','archived')),
  completion_acknowledged_incomplete boolean not null default false, completed_at timestamptz, completed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1
);

create table public.component_categories (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), name text not null, sort_order integer not null default 0, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,name)
);
create table public.elements (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), category_id uuid not null references public.component_categories(id), name text not null, sort_order integer not null default 0, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,category_id,name)
);
create table public.construction_types (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), element_id uuid not null references public.elements(id) on delete cascade, name text not null, active boolean not null default true, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(element_id,name)
);
create table public.defect_types (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), element_id uuid not null references public.elements(id) on delete cascade, name text not null, active boolean not null default true, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(element_id,name)
);
create table public.lifecycle_references (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), element_id uuid not null references public.elements(id) on delete cascade,
  typical_life_years integer not null check (typical_life_years > 0), minimum_life_years integer, maximum_life_years integer, source_label text not null, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(element_id)
);

create table public.survey_elements (
  id uuid primary key, organization_id uuid not null references public.organizations(id), survey_id uuid not null references public.surveys(id) on delete cascade,
  category_id uuid references public.component_categories(id), element_id uuid references public.elements(id), custom_component_name text, custom_element_name text,
  accessibility text not null default 'inspection_required' check (accessibility in ('inspection_required','not_applicable','inaccessible')),
  accessibility_reason text, construction_type text, construction_notes text, installation_year integer, typical_life_years integer, life_reference text,
  remaining_life integer, replacement_year integer, planning_horizon text check (planning_horizon in ('Overdue','1-10 years','11-20 years','21-30 years','Beyond 30 years')),
  planning_override_reason text, recommended_works text, general_notes text, access_limitations text, further_investigation boolean not null default false,
  status text not null default 'not_started' check (status in ('not_started','partial','completed','not_applicable','inaccessible')),
  updated_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
  check ((element_id is not null or nullif(trim(custom_element_name), '') is not null) and (category_id is not null or nullif(trim(custom_component_name), '') is not null))
);
create unique index survey_elements_standard_unique on public.survey_elements(survey_id, element_id) where element_id is not null;

create table public.defect_findings (
  id uuid primary key, organization_id uuid not null references public.organizations(id), survey_element_id uuid not null references public.survey_elements(id) on delete cascade,
  defect_type_id uuid references public.defect_types(id), defect_type_label text not null, cause text, condition text not null check (condition in ('A','B','C','D')),
  priority text not null check (priority in ('1','2','3','4')), notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1
);

create table public.media (
  id uuid primary key, organization_id uuid not null references public.organizations(id), survey_id uuid not null references public.surveys(id) on delete cascade,
  survey_element_id uuid not null references public.survey_elements(id) on delete cascade, finding_id uuid references public.defect_findings(id) on delete set null,
  storage_path text not null unique, filename text not null, content_type text not null, size_bytes bigint not null, caption text, uploaded_by uuid references public.profiles(id), created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), survey_id uuid not null references public.surveys(id) on delete cascade,
  status text not null default 'generating' check (status in ('generating','draft','approved','failed')), version integer not null default 1,
  prompt_input_snapshot jsonb not null default '{}'::jsonb, model_response jsonb, draft_content text, editor_changes jsonb not null default '{}'::jsonb,
  error_message text, created_by uuid references public.profiles(id), approved_by uuid references public.profiles(id), approved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), actor_id uuid references public.profiles(id),
  entity_type text not null, entity_id uuid not null, action text not null, mutation_id uuid unique, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index on public.units(property_id);
create index on public.surveys(unit_id, inspection_date desc);
create index on public.survey_elements(survey_id, status);
create index on public.defect_findings(survey_element_id, condition, priority);
create index on public.media(survey_element_id);
create index on public.audit_events(organization_id, created_at desc);

create or replace function public.current_organization_id() returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.profiles where id = auth.uid()
$$;
revoke all on function public.current_organization_id() from public;
grant execute on function public.current_organization_id() to authenticated;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id,organization_id,full_name)
  values (new.id,'00000000-0000-4000-8000-000000000001',coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
do $$ declare table_name text; begin foreach table_name in array array['profiles','properties','units','surveys','component_categories','elements','construction_types','defect_types','lifecycle_references','survey_elements','defect_findings','reports'] loop execute format('create trigger touch_%I before update on public.%I for each row execute function public.touch_updated_at()', table_name, table_name); end loop; end $$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
do $$ declare table_name text; begin foreach table_name in array array['properties','units','surveys','component_categories','elements','construction_types','defect_types','lifecycle_references','survey_elements','defect_findings','media','reports','audit_events'] loop execute format('alter table public.%I enable row level security', table_name); execute format('create policy org_isolation on public.%I for all to authenticated using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id())', table_name); end loop; end $$;
create policy organization_member_read on public.organizations for select to authenticated using (id = public.current_organization_id());
create policy own_profile on public.profiles for select to authenticated using (id = auth.uid());
create policy own_profile_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and organization_id = public.current_organization_id());

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('survey-media','survey-media',false,15728640,array['image/jpeg','image/png','image/webp','image/heic']) on conflict (id) do nothing;
create policy media_select on storage.objects for select to authenticated using (bucket_id = 'survey-media' and (storage.foldername(name))[1] = public.current_organization_id()::text);
create policy media_insert on storage.objects for insert to authenticated with check (bucket_id = 'survey-media' and (storage.foldername(name))[1] = public.current_organization_id()::text);
create policy media_update on storage.objects for update to authenticated using (bucket_id = 'survey-media' and (storage.foldername(name))[1] = public.current_organization_id()::text);
create policy media_delete on storage.objects for delete to authenticated using (bucket_id = 'survey-media' and (storage.foldername(name))[1] = public.current_organization_id()::text);

create or replace view public.records_view with (security_invoker = true) as
select df.id as finding_id, s.id as survey_id, s.property_id, s.inspection_date as survey_date, p.name as property_name, u.name as unit_name,
  coalesce(cc.name, se.custom_component_name, 'Custom component') as category_name, coalesce(e.name, se.custom_element_name, 'Custom element') as element_name,
  se.construction_type, df.defect_type_label as defect_type, df.condition, df.priority,
  se.planning_horizon, se.remaining_life, se.replacement_year, s.status as survey_status, coalesce(pr.full_name,'Unassigned') as surveyor_name,
  (select count(*) from public.media m where m.finding_id = df.id or (m.finding_id is null and m.survey_element_id = se.id)) as photo_count
from public.defect_findings df join public.survey_elements se on se.id = df.survey_element_id join public.surveys s on s.id = se.survey_id
join public.properties p on p.id = s.property_id join public.units u on u.id = s.unit_id left join public.component_categories cc on cc.id = se.category_id
left join public.elements e on e.id = se.element_id left join public.profiles pr on pr.id = s.surveyor_id;

grant select on public.records_view to authenticated;

create or replace function public.seed_survey_elements() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.survey_elements (id,organization_id,survey_id,category_id,element_id,status,version)
  select gen_random_uuid(),new.organization_id,new.id,e.category_id,e.id,'not_started',1 from public.elements e where e.organization_id = new.organization_id and e.active;
  return new;
end $$;
create trigger survey_element_catalog after insert on public.surveys for each row execute function public.seed_survey_elements();
