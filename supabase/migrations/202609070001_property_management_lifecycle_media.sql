alter table public.properties
  add column if not exists number_of_storeys integer;

alter table public.properties
  drop constraint if exists properties_number_of_storeys_check;

alter table public.properties
  add constraint properties_number_of_storeys_check
  check (number_of_storeys is null or number_of_storeys between 1 and 200);

alter table public.survey_elements
  add column if not exists replacement_year_provided boolean not null default false;

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id = 'survey-media';
