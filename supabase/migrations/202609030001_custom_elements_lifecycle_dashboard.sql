alter table public.survey_elements
  alter column category_id drop not null,
  alter column element_id drop not null,
  add column if not exists custom_component_name text,
  add column if not exists custom_element_name text;

alter table public.survey_elements drop constraint if exists survey_elements_survey_id_element_id_key;
create unique index if not exists survey_elements_standard_unique on public.survey_elements(survey_id, element_id) where element_id is not null;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'survey_elements_reference_check') then
    alter table public.survey_elements add constraint survey_elements_reference_check check ((element_id is not null or nullif(trim(custom_element_name), '') is not null) and (category_id is not null or nullif(trim(custom_component_name), '') is not null));
  end if;
end $$;

alter table public.lifecycle_references
  add column if not exists minimum_life_years integer,
  add column if not exists maximum_life_years integer;

update public.lifecycle_references
set minimum_life_years = coalesce(minimum_life_years, typical_life_years),
    maximum_life_years = coalesce(maximum_life_years, typical_life_years)
where minimum_life_years is null or maximum_life_years is null;

update public.lifecycle_references
set minimum_life_years = coalesce((regexp_match(source_label, '^([0-9]+)-'))[1]::integer, minimum_life_years),
    maximum_life_years = coalesce((regexp_match(source_label, '^[0-9]+-([0-9]+)'))[1]::integer, maximum_life_years);

drop view if exists public.records_view;
create view public.records_view with (security_invoker = true) as
select df.id as finding_id, s.id as survey_id, s.property_id, s.inspection_date as survey_date,
  p.name as property_name, u.name as unit_name,
  coalesce(cc.name, se.custom_component_name, 'Custom component') as category_name,
  coalesce(e.name, se.custom_element_name, 'Custom element') as element_name,
  se.construction_type, df.defect_type_label as defect_type, df.condition, df.priority,
  se.planning_horizon, se.remaining_life, se.replacement_year, s.status as survey_status,
  coalesce(pr.full_name,'Unassigned') as surveyor_name,
  (select count(*) from public.media m where m.finding_id = df.id or (m.finding_id is null and m.survey_element_id = se.id)) as photo_count
from public.defect_findings df
join public.survey_elements se on se.id = df.survey_element_id
join public.surveys s on s.id = se.survey_id
join public.properties p on p.id = s.property_id
join public.units u on u.id = s.unit_id
left join public.component_categories cc on cc.id = se.category_id
left join public.elements e on e.id = se.element_id
left join public.profiles pr on pr.id = s.surveyor_id;

grant select on public.records_view to authenticated;
