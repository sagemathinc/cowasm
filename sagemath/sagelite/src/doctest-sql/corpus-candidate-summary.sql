with latest as (
  select max(id) as run_id from runs
),
file_coverage as (
  select
    status,
    total_blocks,
    passed_blocks,
    failed_blocks,
    skipped_blocks,
    total_blocks - skipped_blocks as runnable_blocks,
    duration_ms,
    case
      when status = 'error' then 'file_error'
      when failed_blocks > 0 then 'needs_triage'
      when total_blocks = 0 then 'no_doctest_blocks'
      when total_blocks = skipped_blocks then 'skipped_only'
      else 'promote_candidate'
    end as candidate_status
  from files
  where run_id = (select run_id from latest)
)
select
  candidate_status,
  count(*) as files,
  sum(total_blocks) as total_blocks,
  sum(passed_blocks) as passed_blocks,
  sum(failed_blocks) as failed_blocks,
  sum(skipped_blocks) as skipped_blocks,
  sum(runnable_blocks) as runnable_blocks,
  sum(duration_ms) as duration_ms
from file_coverage
group by candidate_status
order by
  case candidate_status
    when 'promote_candidate' then 0
    when 'needs_triage' then 1
    when 'file_error' then 2
    when 'skipped_only' then 3
    else 4
  end;
