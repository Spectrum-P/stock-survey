-- Remove retry errors that were historically retained after a successful run.
-- Failed and queued jobs keep their diagnostic history.
update public.report_generation_jobs
set last_error = null
where status = 'completed' and last_error is not null;

update public.report_generation_runs
set error = null
where status = 'completed' and error is not null;

update public.reports
set error_message = null
where generation_status = 'ready' and error_message is not null;
