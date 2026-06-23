with latest as (
  select max(id) as run_id from runs
)
select
  path,
  status,
  total_blocks,
  passed_blocks,
  failed_blocks,
  skipped_blocks,
  failure_class,
  round(
    100.0 * passed_blocks / nullif(total_blocks - skipped_blocks, 0),
    2
  ) as pass_percent_non_skipped,
  duration_ms
from files
where run_id = (select run_id from latest)
order by failed_blocks desc, path;
