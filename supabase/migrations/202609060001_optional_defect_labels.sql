-- A surveyor may record condition and priority even when no defect is present.
alter table public.defect_findings
  alter column defect_type_label drop not null;

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
    select count(*) from public.media m
    where m.finding_id = df.id or (m.finding_id is null and m.survey_element_id = se.id)
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
