with latest as (
  select max(id) as run_id from runs
),
file_errors as (
  select
    coalesce(failure_class, 'file_error') as failure_class,
    trim(
      substr(
        coalesce(failure_detail, stderr, ''),
        1,
        instr(coalesce(failure_detail, stderr, '') || char(10), char(10)) - 1
      )
    ) as first_line,
    path
  from files
  where
    run_id = (select run_id from latest)
    and status = 'error'
    and failed_blocks > 0
)
select
  failure_class,
  first_line,
  count(*) as files,
  group_concat(path, char(10)) as paths
from file_errors
group by failure_class, first_line
order by files desc, failure_class, first_line;
