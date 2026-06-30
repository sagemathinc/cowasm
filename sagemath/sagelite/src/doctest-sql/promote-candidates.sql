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
    duration_ms
  from files
  where run_id = (select run_id from latest)
)
select
  path,
  total_blocks,
  passed_blocks,
  skipped_blocks,
  runnable_blocks,
  duration_ms
from file_coverage
where status = 'passed'
  and failed_blocks = 0
  and passed_blocks > 0
  and runnable_blocks > 0
order by
  passed_blocks desc,
  skipped_blocks,
  duration_ms,
  path;
