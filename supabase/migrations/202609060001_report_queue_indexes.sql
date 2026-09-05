-- Support organisation-scoped report and queue pagination/dispatch.
create index if not exists reports_org_updated_idx
  on public.reports(organization_id, updated_at desc);

create index if not exists report_jobs_org_status_created_idx
  on public.report_generation_jobs(organization_id, status, created_at desc);

create index if not exists report_jobs_org_ready_idx
  on public.report_generation_jobs(organization_id, status, available_at)
  where status = 'queued';
