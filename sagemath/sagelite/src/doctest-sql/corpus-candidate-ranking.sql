with latest as (
  select max(id) as run_id from runs
),
file_coverage as (
  select
    path,
    status,
    total_blocks,
    passed_blocks,
    failed_blocks,
    skipped_blocks,
    total_blocks - skipped_blocks as runnable_blocks,
    failure_class,
    duration_ms,
    round(
      100.0 * passed_blocks / nullif(total_blocks - skipped_blocks, 0),
      2
    ) as pass_percent_non_skipped,
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
  path,
  total_blocks,
  passed_blocks,
  failed_blocks,
  skipped_blocks,
  runnable_blocks,
  pass_percent_non_skipped,
  failure_class,
  duration_ms
from file_coverage
order by
  case candidate_status
    when 'promote_candidate' then 0
    when 'needs_triage' then 1
    when 'file_error' then 2
    when 'skipped_only' then 3
    else 4
  end,
  case candidate_status
    when 'promote_candidate' then -passed_blocks
    when 'needs_triage' then failed_blocks
    when 'file_error' then 0
    else skipped_blocks
  end,
  duration_ms,
  path;
