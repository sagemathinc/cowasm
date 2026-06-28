with latest as (
  select max(id) as run_id from runs
),
file_coverage as (
  select
    total_blocks,
    passed_blocks,
    failed_blocks,
    skipped_blocks,
    total_blocks - skipped_blocks as runnable_blocks,
    duration_ms,
    case
      when status = 'error' then 'file_error'
      when total_blocks = 0 then 'no_doctest_blocks'
      when total_blocks = skipped_blocks then 'skipped_only'
      when failed_blocks > 0 then 'has_failures'
      else 'clean_runnable_coverage'
    end as coverage_shape
  from files
  where run_id = (select run_id from latest)
)
select
  coverage_shape,
  count(*) as files,
  sum(total_blocks) as total_blocks,
  sum(passed_blocks) as passed_blocks,
  sum(failed_blocks) as failed_blocks,
  sum(skipped_blocks) as skipped_blocks,
  sum(runnable_blocks) as runnable_blocks,
  sum(duration_ms) as duration_ms
from file_coverage
group by coverage_shape
order by
  case coverage_shape
    when 'file_error' then 0
    when 'has_failures' then 1
    when 'skipped_only' then 2
    when 'no_doctest_blocks' then 3
    else 4
  end;
