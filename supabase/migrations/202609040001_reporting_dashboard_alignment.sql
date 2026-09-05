-- Align the analytical read model with the one-row-per-defect workbooks and
-- add the metadata needed for the executive dashboard and scoped reports.

alter table public.properties
  add column if not exists building_name text,
  add column if not exists property_type text;

alter table public.units
  add column if not exists flat_type text;

alter table public.survey_elements
  add column if not exists estimated_cost numeric(14,2),
  add column if not exists cost_basis text;

alter table public.survey_elements
  drop constraint if exists survey_elements_estimated_cost_check;
alter table public.survey_elements
  add constraint survey_elements_estimated_cost_check check (estimated_cost is null or estimated_cost >= 0);

alter table public.reports
  alter column survey_id drop not null,
  add column if not exists property_id uuid references public.properties(id) on delete cascade,
  add column if not exists scope_type text not null default 'survey',
  add column if not exists prompt_version text;

update public.properties
set building_name = coalesce(nullif(trim(building_name), ''), name)
where building_name is null or nullif(trim(building_name), '') is null;

update public.reports r
set property_id = s.property_id
from public.surveys s
where r.survey_id = s.id and r.property_id is null;

alter table public.reports
  drop constraint if exists reports_scope_type_check;
alter table public.reports
  add constraint reports_scope_type_check check (
    (scope_type = 'survey' and survey_id is not null)
    or (scope_type = 'property' and property_id is not null)
    or scope_type = 'portfolio'
  );

create index if not exists reports_property_id_idx on public.reports(property_id);
create index if not exists survey_elements_cost_idx on public.survey_elements(estimated_cost) where estimated_cost is not null;

drop view if exists public.records_view;
create view public.records_view with (security_invoker = true) as
select
  df.id as finding_id,
  se.id as survey_element_id,
  s.id as survey_id,
  s.organization_id,
  s.property_id,
  s.inspection_date as survey_date,
  p.name as property_name,
  coalesce(nullif(trim(p.building_name), ''), p.name) as building_name,
  p.property_type,
  u.id as unit_id,
  u.name as unit_name,
  u.flat_type,
  u.floor,
  coalesce(cc.name, se.custom_component_name, 'Custom component') as category_name,
  coalesce(e.name, se.custom_element_name, 'Custom element') as element_name,
  se.construction_type,
  se.construction_notes,
  df.defect_type_label as defect_type,
  df.cause as defect_cause,
  df.notes as defect_notes,
  df.condition,
  df.priority,
  se.planning_horizon,
  se.typical_life_years,
  se.life_reference,
  se.installation_year,
  se.remaining_life,
  se.replacement_year,
  se.estimated_cost,
  se.cost_basis,
  se.recommended_works,
  se.general_notes,
  se.access_limitations,
  se.further_investigation,
  s.status as survey_status,
  coalesce(pr.full_name, 'Unassigned') as surveyor_name,
  (
    select count(*)
    from public.media m
    where m.finding_id = df.id
      or (m.finding_id is null and m.survey_element_id = se.id)
  ) as photo_count
from public.defect_findings df
join public.survey_elements se on se.id = df.survey_element_id
join public.surveys s on s.id = se.survey_id
join public.properties p on p.id = s.property_id
join public.units u on u.id = s.unit_id
left join public.component_categories cc on cc.id = se.category_id
left join public.elements e on e.id = se.element_id
left join public.profiles pr on pr.id = s.surveyor_id;

grant select on public.records_view to authenticated;
