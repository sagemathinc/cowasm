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
anchored_file_errors as (
  select
    failure_class,
    detail,
    case
      when instr(detail, 'RuntimeError: function signature mismatch') > 0 then
        instr(detail, 'RuntimeError: function signature mismatch')
      when instr(detail, 'LinkError:') > 0 then
        instr(detail, 'LinkError:')
      when instr(detail, char(10) || 'Traceback ') > 0 then
        instr(detail, char(10) || 'Traceback ') + 1
      else 0
    end as diagnostic_start,
    path
  from raw_file_errors
),
normalized_diagnostics as (
  select
    failure_class,
    case
      when detail like 'doctest state:%' || char(10) || '%' then
        trim(
          substr(
            detail,
            1,
            case
              when diagnostic_start > 1 then diagnostic_start - 1
              else instr(detail || char(10), char(10)) - 1
            end
          )
        )
      else path
    end as context,
    case
      when diagnostic_start > 0 then substr(detail, diagnostic_start)
      else detail
    end as diagnostic,
    path
  from anchored_file_errors
),
diagnostics as (
  select
    failure_class,
    context,
    trim(
      substr(
        diagnostic,
        1,
        instr(diagnostic || char(10), char(10)) - 1
      )
    ) as diagnostic_line,
    path
  from normalized_diagnostics
)
select
  failure_class,
  diagnostic_line,
  count(*) as files,
  group_concat(context, char(10) || char(10)) as contexts,
  group_concat(path, char(10)) as paths
from diagnostics
group by failure_class, diagnostic_line
order by files desc, failure_class, diagnostic_line;
