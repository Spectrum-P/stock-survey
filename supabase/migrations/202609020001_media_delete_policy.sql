do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'media_delete') then
    create policy media_delete on storage.objects
      for delete to authenticated
      using (bucket_id = 'survey-media' and (storage.foldername(name))[1] = public.current_organization_id()::text);
  end if;
end $$;
