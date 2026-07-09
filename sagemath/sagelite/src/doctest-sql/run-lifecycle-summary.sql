with file_counts as (
  select
    run_id,
    count(*) as files_recorded,
    sum(case when status = 'passed' then 1 else 0 end) as passed_files,
    sum(case when status = 'failed' then 1 else 0 end) as failed_files,
    sum(case when status = 'error' then 1 else 0 end) as error_files,
    sum(
      case
        when total_blocks > 0 and total_blocks = skipped_blocks then 1
        else 0
      end
    ) as skipped_only_files
  from files
  group by run_id
)
select
  runs.id,
  runs.started_at,
  runs.finished_at,
  case
    when runs.finished_at is null then 'open'
    else 'closed'
  end as lifecycle,
  runs.status,
  runs.run_profile,
  runs.runner_version,
  coalesce(file_counts.files_recorded, 0) as files_recorded,
  coalesce(file_counts.passed_files, 0) as passed_files,
  coalesce(file_counts.failed_files, 0) as failed_files,
  coalesce(file_counts.error_files, 0) as error_files,
  coalesce(file_counts.skipped_only_files, 0) as skipped_only_files,
  runs.total_blocks,
  runs.passed_blocks,
  runs.failed_blocks,
  runs.skipped_blocks,
  round(
    100.0 * runs.passed_blocks / nullif(runs.total_blocks - runs.skipped_blocks, 0),
    2
  ) as pass_percent_non_skipped,
  runs.duration_ms,
  runs.source_root,
  substr(runs.command, 1, 160) as command_prefix
from runs
left join file_counts on file_counts.run_id = runs.id
order by runs.id desc
limit 50;
