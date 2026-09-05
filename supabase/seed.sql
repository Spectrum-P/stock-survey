-- Fixed MVP organization. New users are attached to this organization by the profile trigger below.
insert into public.organizations (id,name) values ('00000000-0000-4000-8000-000000000001','Stock Condition Survey MVP') on conflict (id) do nothing;

-- Backfill profiles for users that existed before this schema was applied.
-- New users are provisioned automatically by public.handle_new_user().
insert into public.profiles(id,organization_id,full_name)
select u.id, '00000000-0000-4000-8000-000000000001', coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email,'@',1))
from auth.users u
on conflict (id) do update set organization_id = excluded.organization_id, full_name = coalesce(public.profiles.full_name, excluded.full_name);

insert into public.component_categories (id,organization_id,name,sort_order) values
('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','External Envelope',1),
('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','Internal Areas',2),
('10000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','Kitchen',3),
('10000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','Bathroom',4),
('10000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000001','Building Services',5)
on conflict (organization_id,name) do nothing;

with seed(category_name,element_name,life,label,sort_order) as (values
('External Envelope','Roof',60,'50-70 years',1),('External Envelope','Chimneys',65,'60+ years',2),('External Envelope','Brickwork',70,'40-100 years',3),('External Envelope','Render',30,'20-40 years',4),('External Envelope','Cladding',25,'20-30 years',5),('External Envelope','Windows',28,'20-35 years',6),('External Envelope','External Doors',30,'25-35 years',7),('External Envelope','Gutters',25,'20-30 years',8),('External Envelope','Downpipes',25,'20-30 years',9),
('Internal Areas','Walls',7,'5-10 years',1),('Internal Areas','Ceilings',7,'5-10 years',2),('Internal Areas','Floors',12,'10-15 years',3),('Internal Areas','Internal Doors',32,'25-40 years',4),('Internal Areas','Decorations',7,'5-10 years',5),
('Kitchen','Kitchen Units',20,'20 years',1),('Kitchen','Worktops',20,'20 years',2),('Kitchen','Sink',25,'20-30 years',3),('Kitchen','Appliances',12,'10-15 years',4),('Kitchen','Flooring',12,'10-15 years',5),('Kitchen','Wall Finishes',25,'20-30 years',6),
('Bathroom','Bath / Shower',30,'30 years',1),('Bathroom','WC',25,'20-30 years',2),('Bathroom','Wash Hand Basin',25,'20-30 years',3),('Bathroom','Floor Finishes',12,'10-15 years',4),('Bathroom','Extract Ventilation',12,'10-15 years',5),
('Building Services','Heating',13,'12-15 years',1),('Building Services','Hot Water',25,'20-30 years',2),('Building Services','Electrical Installation',35,'25-40 years',3),('Building Services','Lighting',17,'15-20 years',4),('Building Services','Fire Alarm',12,'10-15 years',5),('Building Services','Emergency Lighting',12,'10-15 years',6),('Building Services','Mechanical Ventilation',25,'20-30 years',7)
), inserted as (
  insert into public.elements(organization_id,category_id,name,sort_order)
  select '00000000-0000-4000-8000-000000000001',cc.id,seed.element_name,seed.sort_order from seed join public.component_categories cc on cc.name=seed.category_name and cc.organization_id='00000000-0000-4000-8000-000000000001'
  on conflict (organization_id,category_id,name) do update set sort_order=excluded.sort_order returning id,name
)
insert into public.lifecycle_references(organization_id,element_id,typical_life_years,minimum_life_years,maximum_life_years,source_label)
select '00000000-0000-4000-8000-000000000001',i.id,s.life,s.life,s.life,s.label from inserted i join seed s on s.element_name=i.name
on conflict (element_id) do update set typical_life_years=excluded.typical_life_years,minimum_life_years=excluded.minimum_life_years,maximum_life_years=excluded.maximum_life_years,source_label=excluded.source_label;

update public.lifecycle_references
set minimum_life_years = coalesce((regexp_match(source_label, '^([0-9]+)-'))[1]::integer, typical_life_years),
    maximum_life_years = coalesce((regexp_match(source_label, '^[0-9]+-([0-9]+)'))[1]::integer, typical_life_years)
where organization_id='00000000-0000-4000-8000-000000000001';

-- Universal escape hatches plus condition-specific choices are editable in Settings.
insert into public.construction_types(organization_id,element_id,name,sort_order)
select '00000000-0000-4000-8000-000000000001',id,'Other',999 from public.elements where organization_id='00000000-0000-4000-8000-000000000001' on conflict do nothing;
insert into public.defect_types(organization_id,element_id,name,sort_order)
select '00000000-0000-4000-8000-000000000001',e.id,options.label,options.sort_order
from public.elements e
cross join (values ('No defect observed',1),('Other defect',999)) as options(label,sort_order)
where e.organization_id='00000000-0000-4000-8000-000000000001'
on conflict do nothing;

-- Frequently used source options from the supplied prototype. The complete catalogue is mirrored in src/lib/catalog.ts.
insert into public.construction_types(organization_id,element_id,name,sort_order)
select '00000000-0000-4000-8000-000000000001',e.id,v.option,v.sort_order from public.elements e join (values
('Roof','Pitched concrete tile',1),('Roof','Pitched natural slate',2),('Roof','Flat felt or bitumen',3),('Windows','uPVC double glazed',1),('Windows','Aluminium double glazed',2),('Windows','Timber double glazed',3),('Walls','Painted plaster',1),('Floors','Carpet',1),('Floors','Vinyl',2),('Kitchen Units','Laminate standard',1),('Worktops','Laminate',1),('Bath / Shower','Panel bath',1),('Bath / Shower','Walk-in shower',2),('Extract Ventilation','Humidistat fan',1),('Heating','Gas combi boiler',1),('Heating','Air source heat pump',2),('Electrical Installation','MCB and RCD',1),('Fire Alarm','LD2 interlinked',1)
) v(element_name,option,sort_order) on v.element_name=e.name where e.organization_id='00000000-0000-4000-8000-000000000001' on conflict do nothing;

insert into public.defect_types(organization_id,element_id,name,sort_order)
select '00000000-0000-4000-8000-000000000001',e.id,v.option,v.sort_order from public.elements e join (values
('Roof','Slipped or missing tiles',2),('Roof','Defective flashing',3),('Roof','Water ingress',4),('Windows','Failed sealed unit',2),('Windows','Frame deterioration',3),('Walls','Cracking',2),('Walls','Damp or mould',3),('Floors','Trip hazard',2),('Kitchen Units','Door damaged',2),('Worktops','Water damage',2),('Bath / Shower','Sealant deterioration',2),('Extract Ventilation','Fan inoperative',2),('Heating','No heat',2),('Heating','Pipework leaking',3),('Electrical Installation','EICR overdue',2),('Fire Alarm','Detector missing',2),('Fire Alarm','Service overdue',3)
) v(element_name,option,sort_order) on v.element_name=e.name where e.organization_id='00000000-0000-4000-8000-000000000001' on conflict do nothing;

-- Report-generation fixtures. These rows deliberately cover completed and
-- in-progress surveys, conditions A–D, priorities 1–4, lifecycle horizons,
-- access constraints, estimated costs, and a custom element. They do not need
-- an auth user, so they work in a fresh development database.
--
-- Useful report scopes after seeding:
--   Survey:   60000000-0000-4000-8000-000000000101
--   Property: 50000000-0000-4000-8000-000000000001 (Harbour View Court)
--   Portfolio: select the portfolio option in the report generator
insert into public.properties
  (id,organization_id,name,building_name,property_type,reference,address_line_1,town,postcode,construction_year)
values
  ('50000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Harbour View Court','Harbour View Court','General needs','HVC-001','14 Dockside Way','Liverpool','L3 4AB',1996),
  ('50000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','Willow Bank House','Willow Bank House','Supported housing','WBH-002','8 Willow Bank','Manchester','M15 6CD',2008)
on conflict (id) do update set
  name = excluded.name, building_name = excluded.building_name, property_type = excluded.property_type,
  reference = excluded.reference, address_line_1 = excluded.address_line_1, town = excluded.town,
  postcode = excluded.postcode, construction_year = excluded.construction_year;

insert into public.units (id,organization_id,property_id,name,reference,flat_type,floor)
values ('51000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','Flat 01','HVC-01','One-bedroom','Ground floor')
on conflict (id) do update set name = excluded.name, reference = excluded.reference, flat_type = excluded.flat_type, floor = excluded.floor;

insert into public.units (id,organization_id,property_id,name,reference,flat_type,floor)
values ('51000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','Flat 02','HVC-02','Two-bedroom','First floor')
on conflict (id) do update set name = excluded.name, reference = excluded.reference, flat_type = excluded.flat_type, floor = excluded.floor;

insert into public.units (id,organization_id,property_id,name,reference,flat_type,floor)
values ('51000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002','Flat 03','WBH-03','Accessible one-bedroom','Ground floor')
on conflict (id) do update set name = excluded.name, reference = excluded.reference, flat_type = excluded.flat_type, floor = excluded.floor;

insert into public.units (id,organization_id,property_id,name,reference,flat_type,floor)
values ('51000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002','Flat 04','WBH-04','Studio','Second floor')
on conflict (id) do update set name = excluded.name, reference = excluded.reference, flat_type = excluded.flat_type, floor = excluded.floor;

-- The catalog trigger creates standard survey elements when each fixture is
-- first inserted. The WHERE clause makes this safe to run repeatedly.
insert into public.surveys (id,organization_id,property_id,unit_id,inspection_date,status,completion_acknowledged_incomplete,completed_at)
select fixtures.id, '00000000-0000-4000-8000-000000000001', fixtures.property_id, fixtures.unit_id,
       fixtures.inspection_date, fixtures.status, fixtures.acknowledged, fixtures.completed_at
from (values
  ('60000000-0000-4000-8000-000000000101'::uuid,'50000000-0000-4000-8000-000000000001'::uuid,'51000000-0000-4000-8000-000000000001'::uuid,'2026-08-18'::date,'completed','false'::boolean,'2026-08-18T16:30:00Z'::timestamptz),
  ('60000000-0000-4000-8000-000000000102'::uuid,'50000000-0000-4000-8000-000000000001'::uuid,'51000000-0000-4000-8000-000000000002'::uuid,'2026-08-20'::date,'in_progress','false'::boolean,null::timestamptz),
  ('60000000-0000-4000-8000-000000000103'::uuid,'50000000-0000-4000-8000-000000000002'::uuid,'51000000-0000-4000-8000-000000000003'::uuid,'2026-08-22'::date,'completed','true'::boolean,'2026-08-22T15:15:00Z'::timestamptz),
  ('60000000-0000-4000-8000-000000000104'::uuid,'50000000-0000-4000-8000-000000000002'::uuid,'51000000-0000-4000-8000-000000000004'::uuid,'2026-08-25'::date,'draft','false'::boolean,null::timestamptz)
) as fixtures(id,property_id,unit_id,inspection_date,status,acknowledged,completed_at)
where not exists (select 1 from public.surveys existing where existing.id = fixtures.id);

with assessments(survey_id,element_name,accessibility,accessibility_reason,construction_type,construction_notes,installation_year,typical_life_years,life_reference,remaining_life,replacement_year,planning_horizon,recommended_works,general_notes,access_limitations,further_investigation,status,estimated_cost,cost_basis) as (values
  ('60000000-0000-4000-8000-000000000101'::uuid,'Roof','inspection_required',null,'Pitched concrete tile','Original roof covering; local patch repairs visible.',1996,60,'50-70 years',6,2032,'1-10 years','Repair defective flashings and replace slipped tiles; monitor after severe weather.','Moderate localised deterioration to the rear roof slope.',null,false,'completed',8400.00,'Budget estimate'),
  ('60000000-0000-4000-8000-000000000101'::uuid,'Windows','inspection_required',null,'uPVC double glazed','Mixed-age replacement units.',2012,28,'20-35 years',4,2030,'1-10 years','Replace failed sealed units and adjust affected opening lights.','Condensation between panes at two windows.',null,false,'completed',4200.00,'Budget estimate'),
  ('60000000-0000-4000-8000-000000000101'::uuid,'Walls','inspection_required',null,'Painted plaster','Solid internal partitions.',2018,7,'5-10 years',2,2028,'1-10 years','Treat localised mould and redecorate after the moisture source is addressed.','Mould is concentrated behind furniture on the external wall.',null,true,'completed',1800.00,'Budget estimate'),
  ('60000000-0000-4000-8000-000000000101'::uuid,'Kitchen Units','inspection_required',null,'Laminate standard','Original fitted kitchen.',2007,20,'20 years',1,2027,'1-10 years','Repair damaged doors and plan full kitchen renewal.','Several hinges are loose and one base unit is swollen.',null,false,'completed',6700.00,'Budget estimate'),
  ('60000000-0000-4000-8000-000000000101'::uuid,'Bath / Shower','inspection_required',null,'Panel bath','Original bathroom suite.',1996,30,'30 years',-1,2026,'Overdue','Replace deteriorated bath sealant immediately and programme bathroom renewal.','Water staining is present to the adjacent ceiling below.',null,true,'completed',5200.00,'Budget estimate'),
  ('60000000-0000-4000-8000-000000000101'::uuid,'Heating','inspection_required',null,'Gas combi boiler','Boiler service label dated 2024.',2012,13,'12-15 years',0,2026,'Overdue','Arrange an urgent Gas Safe inspection and replace the boiler if repair is uneconomic.','Intermittent loss of heating was reported by the resident.',null,true,'completed',3100.00,'Budget estimate'),
  ('60000000-0000-4000-8000-000000000101'::uuid,'Electrical Installation','inspection_required',null,'MCB and RCD','Consumer unit appears modern.',2016,35,'25-40 years',15,2041,'11-20 years','Obtain and retain a current EICR; no replacement allowed for at this stage.','No visible defects observed at the consumer unit.',null,false,'completed',450.00,'Inspection allowance'),
  ('60000000-0000-4000-8000-000000000101'::uuid,'Fire Alarm','inspection_required',null,'LD2 interlinked','Mains-powered alarms fitted.',2021,12,'10-15 years',8,2034,'1-10 years','Test alarms and include in the annual servicing programme.','No defect observed during the visual inspection.',null,false,'completed',180.00,'Service allowance'),
  ('60000000-0000-4000-8000-000000000101'::uuid,'Chimneys','inaccessible','Roof-level chimney was not safely accessible from the inspection position.',null,null,null,65,'60+ years',null,null,null,null,'No close inspection undertaken.','Viewed from ground level only.',true,'inaccessible',null,null),
  ('60000000-0000-4000-8000-000000000101'::uuid,'Cladding','not_applicable','No cladding is present to this property.',null,null,null,25,'20-30 years',null,null,null,null,null,null,false,'not_applicable',null,null),
  ('60000000-0000-4000-8000-000000000102'::uuid,'Floors','inspection_required',null,'Carpet','Carpeted finishes throughout.',2015,12,'10-15 years',1,2027,'1-10 years','Replace worn carpet and make safe the lifted threshold strip.','Wear is greatest at the entrance lobby.',null,false,'partial',2100.00,'Budget estimate'),
  ('60000000-0000-4000-8000-000000000102'::uuid,'Extract Ventilation','inspection_required',null,'Humidistat fan','Fan did not run when switched.',2013,12,'10-15 years',-2,2024,'Overdue','Replace the inoperative fan and verify adequate background ventilation.','Bathroom humidity is elevated after shower use.',null,false,'partial',850.00,'Budget estimate'),
  ('60000000-0000-4000-8000-000000000103'::uuid,'Roof','inspection_required',null,'Pitched natural slate','Slate roof viewed from ground level and upper windows.',2008,60,'50-70 years',22,2048,'21-30 years','Continue routine inspection and clear gutters annually.','No slipped slates observed from accessible viewpoints.','Roof covering not accessed directly.',false,'completed',900.00,'Planned maintenance allowance'),
  ('60000000-0000-4000-8000-000000000103'::uuid,'Windows','inspection_required',null,'Timber double glazed','Painted timber frames.',2008,28,'20-35 years',10,2036,'1-10 years','Prepare and redecorate external timber; renew isolated failed seals.','Minor paint breakdown to south elevation.',null,false,'completed',3600.00,'Budget estimate'),
  ('60000000-0000-4000-8000-000000000103'::uuid,'Kitchen Units','inspection_required',null,'Laminate standard','Fitted kitchen in serviceable condition.',2022,20,'20 years',16,2042,'11-20 years','Continue planned maintenance only.','No defect observed.',null,false,'completed',0.00,'No current allowance'),
  ('60000000-0000-4000-8000-000000000103'::uuid,'Fire Alarm','inspection_required',null,'LD2 interlinked','Interlinked alarms fitted.',2022,12,'10-15 years',8,2034,'1-10 years','Replace the missing detector and test the complete system.','Heat detector absent from the kitchen.',null,false,'completed',220.00,'Budget estimate'),
  ('60000000-0000-4000-8000-000000000104'::uuid,'Lighting','inspection_required',null,'LED fittings','Common fittings sampled.',2025,17,'15-20 years',16,2042,'11-20 years','No immediate works required.','No defect observed.',null,false,'partial',0.00,'No current allowance')
)
update public.survey_elements se
set accessibility = assessments.accessibility,
    accessibility_reason = assessments.accessibility_reason,
    construction_type = assessments.construction_type,
    construction_notes = assessments.construction_notes,
    installation_year = assessments.installation_year,
    typical_life_years = assessments.typical_life_years,
    life_reference = assessments.life_reference,
    remaining_life = assessments.remaining_life,
    replacement_year = assessments.replacement_year,
    planning_horizon = assessments.planning_horizon,
    recommended_works = assessments.recommended_works,
    general_notes = assessments.general_notes,
    access_limitations = assessments.access_limitations,
    further_investigation = assessments.further_investigation,
    status = assessments.status,
    estimated_cost = assessments.estimated_cost,
    cost_basis = assessments.cost_basis
from assessments join public.elements e on e.name = assessments.element_name
where se.survey_id = assessments.survey_id and se.element_id = e.id;

-- A custom item checks the report's fallback handling for elements outside the
-- managed catalogue.
insert into public.survey_elements
  (id,organization_id,survey_id,custom_component_name,custom_element_name,accessibility,construction_type,construction_notes,installation_year,typical_life_years,life_reference,remaining_life,replacement_year,planning_horizon,recommended_works,general_notes,status,estimated_cost,cost_basis)
values
  ('62000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000103','External Works','Communal entrance canopy','inspection_required','Powder-coated steel','Canopy over communal entrance.',2010,25,'Project allowance',3,2029,'1-10 years','Treat corrosion and renew failed fixings.','Corrosion is visible at two support brackets.','completed',2400.00,'Budget estimate')
on conflict (id) do update set
  construction_notes = excluded.construction_notes, remaining_life = excluded.remaining_life,
  replacement_year = excluded.replacement_year, planning_horizon = excluded.planning_horizon,
  recommended_works = excluded.recommended_works, general_notes = excluded.general_notes,
  estimated_cost = excluded.estimated_cost, cost_basis = excluded.cost_basis;

insert into public.defect_findings (id,organization_id,survey_element_id,defect_type_label,cause,condition,priority,notes)
select fixtures.id, '00000000-0000-4000-8000-000000000001', coalesce(standard_element.id, se.id), fixtures.defect_type, fixtures.cause, fixtures.condition, fixtures.priority, fixtures.notes
from (values
  ('63000000-0000-4000-8000-000000000001'::uuid,'60000000-0000-4000-8000-000000000101'::uuid,'Roof','Defective flashing','Ageing mortar fillets and weather exposure.','C','2','Lead flashing is split at the rear abutment.'),
  ('63000000-0000-4000-8000-000000000002'::uuid,'60000000-0000-4000-8000-000000000101'::uuid,'Roof','Slipped or missing tiles','Wind exposure.','C','2','Two slipped tiles were noted to the rear slope.'),
  ('63000000-0000-4000-8000-000000000003'::uuid,'60000000-0000-4000-8000-000000000101'::uuid,'Windows','Failed sealed unit','Seal failure.','C','2','Misting is visible between panes to two living-room units.'),
  ('63000000-0000-4000-8000-000000000004'::uuid,'60000000-0000-4000-8000-000000000101'::uuid,'Walls','Damp or mould','Likely condensation; investigate moisture source.','C','2','Localised mould growth is present behind furniture.'),
  ('63000000-0000-4000-8000-000000000005'::uuid,'60000000-0000-4000-8000-000000000101'::uuid,'Kitchen Units','Door damaged','Wear to hinges and moisture exposure.','B','3','One base-unit door is swollen and two hinges are loose.'),
  ('63000000-0000-4000-8000-000000000006'::uuid,'60000000-0000-4000-8000-000000000101'::uuid,'Bath / Shower','Sealant deterioration','End-of-life sealant.','D','1','Failed sealant has allowed water to track behind the bath.'),
  ('63000000-0000-4000-8000-000000000007'::uuid,'60000000-0000-4000-8000-000000000101'::uuid,'Heating','No heat','Intermittent boiler fault reported by resident.','D','1','Heating was not operating at the start of the inspection.'),
  ('63000000-0000-4000-8000-000000000008'::uuid,'60000000-0000-4000-8000-000000000101'::uuid,'Electrical Installation','EICR overdue','Certification record was not available.','B','2','Request a current EICR from the maintenance records.'),
  ('63000000-0000-4000-8000-000000000009'::uuid,'60000000-0000-4000-8000-000000000101'::uuid,'Fire Alarm','No defect observed','','A','4','Visual test indication was satisfactory.'),
  ('63000000-0000-4000-8000-000000000010'::uuid,'60000000-0000-4000-8000-000000000102'::uuid,'Floors','Trip hazard','Lifted threshold strip.','C','2','Threshold strip is loose at the bedroom doorway.'),
  ('63000000-0000-4000-8000-000000000011'::uuid,'60000000-0000-4000-8000-000000000102'::uuid,'Extract Ventilation','Fan inoperative','Motor failure suspected.','D','1','Fan did not operate during the inspection.'),
  ('63000000-0000-4000-8000-000000000012'::uuid,'60000000-0000-4000-8000-000000000103'::uuid,'Roof','No defect observed','','A','4','No defects observed from accessible viewpoints.'),
  ('63000000-0000-4000-8000-000000000013'::uuid,'60000000-0000-4000-8000-000000000103'::uuid,'Windows','Frame deterioration','Coating breakdown from weather exposure.','B','3','Minor localised paint failure to timber frames.'),
  ('63000000-0000-4000-8000-000000000014'::uuid,'60000000-0000-4000-8000-000000000103'::uuid,'Kitchen Units','No defect observed','','A','4','Kitchen units were serviceable at inspection.'),
  ('63000000-0000-4000-8000-000000000015'::uuid,'60000000-0000-4000-8000-000000000103'::uuid,'Fire Alarm','Detector missing','Detector not installed.','C','1','Kitchen heat detector was missing.'),
  ('63000000-0000-4000-8000-000000000016'::uuid,'62000000-0000-4000-8000-000000000001'::uuid,null,'Corrosion to support brackets','Coating failure at fixings.','C','2','Surface corrosion and two failed fixings noted.')
) as fixtures(id,survey_id,element_name,defect_type,cause,condition,priority,notes)
left join public.survey_elements se on se.id = fixtures.survey_id
left join public.elements e on e.name = fixtures.element_name
left join public.survey_elements standard_element on standard_element.survey_id = fixtures.survey_id and standard_element.element_id = e.id
where not exists (select 1 from public.defect_findings existing where existing.id = fixtures.id)
  and coalesce(standard_element.id, se.id) is not null
on conflict (id) do update set
  defect_type_label = excluded.defect_type_label, cause = excluded.cause, condition = excluded.condition,
  priority = excluded.priority, notes = excluded.notes;
