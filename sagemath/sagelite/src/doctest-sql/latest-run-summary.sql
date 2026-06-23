select
  id,
  started_at,
  git_commit,
  coalesce(sagelite_package_commit, sagelite_source_commit) as sagelite_package_commit,
  run_profile,
  runner_version,
  status,
  total_blocks,
  passed_blocks,
  failed_blocks,
  skipped_blocks,
  round(
    100.0 * passed_blocks / nullif(total_blocks - skipped_blocks, 0),
    2
  ) as pass_percent_non_skipped,
  duration_ms
from runs
order by id desc
limit 20;
