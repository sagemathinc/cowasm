with latest as (
  select max(id) as run_id from runs
),
raw_file_errors as (
  select
    coalesce(failure_class, 'file_error') as failure_class,
    coalesce(failure_detail, stderr, '') as detail,
    path
  from files
  where
    run_id = (select run_id from latest)
    and status = 'error'
    and failed_blocks > 0
),
file_errors as (
  select
    failure_class,
    case
      when detail like 'doctest state:%' || char(10) || '%' then
        trim(substr(detail, 1, instr(detail || char(10), char(10)) - 1))
      else null
    end as doctest_state,
    case
      when detail like 'doctest state:%' || char(10) || '%' then
        substr(detail, instr(detail || char(10), char(10)) + 1)
      else detail
    end as diagnostic,
    path
  from raw_file_errors
),
diagnostics as (
  select
    failure_class,
    doctest_state,
    trim(
      substr(
        diagnostic,
        1,
        instr(diagnostic || char(10), char(10)) - 1
      )
    ) as diagnostic_line,
    path
  from file_errors
)
select
  failure_class,
  diagnostic_line,
  count(*) as files,
  group_concat(coalesce(doctest_state, path), char(10)) as contexts,
  group_concat(path, char(10)) as paths
from diagnostics
group by failure_class, diagnostic_line
order by files desc, failure_class, diagnostic_line;
