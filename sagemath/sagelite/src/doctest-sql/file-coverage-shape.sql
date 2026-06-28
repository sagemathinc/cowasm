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
  path,
  status,
  total_blocks,
  passed_blocks,
  failed_blocks,
  skipped_blocks,
  runnable_blocks,
  failure_class,
  duration_ms
from file_coverage
order by
  case coverage_shape
    when 'file_error' then 0
    when 'has_failures' then 1
    when 'skipped_only' then 2
    when 'no_doctest_blocks' then 3
    else 4
  end,
  failed_blocks desc,
  skipped_blocks desc,
  path;
