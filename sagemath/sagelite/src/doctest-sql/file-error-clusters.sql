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
),
anchored_file_errors as (
  select
    failure_class,
    detail,
    case
      when instr(detail, 'RuntimeError: function signature mismatch') > 0 then
        instr(detail, 'RuntimeError: function signature mismatch')
      when instr(detail, 'RuntimeError:') > 0 then
        instr(detail, 'RuntimeError:')
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
diagnostics_with_stack as (
  select
    failure_class,
    context,
    diagnostic,
    path,
    trim(
      substr(
        diagnostic,
        1,
        instr(diagnostic || char(10), char(10)) - 1
      )
    ) as diagnostic_line,
    case
      when instr(diagnostic, char(10)) > 0 then
        trim(
          substr(
            substr(diagnostic, instr(diagnostic, char(10)) + 1),
            1,
            instr(
              substr(diagnostic, instr(diagnostic, char(10)) + 1)
                || char(10),
              char(10)
            ) - 1
          )
        )
      else ''
    end as raw_top_stack_frame
  from normalized_diagnostics
),
diagnostics as (
  select
    failure_class,
    context,
    diagnostic_line,
    case
      when instr(raw_top_stack_frame, 'wasm-function[') > 0
        and instr(raw_top_stack_frame, ' (wasm://') > 0 then
        trim(
          substr(
            raw_top_stack_frame,
            case
              when substr(raw_top_stack_frame, 1, 3) = 'at ' then 4
              else 1
            end,
            instr(raw_top_stack_frame, ' (wasm://')
              - case
                  when substr(raw_top_stack_frame, 1, 3) = 'at ' then 4
                  else 1
                end
          )
        )
        || ' '
        || substr(raw_top_stack_frame, instr(raw_top_stack_frame, 'wasm-function['))
      when instr(raw_top_stack_frame, 'wasm-function[') > 0 then
        substr(raw_top_stack_frame, instr(raw_top_stack_frame, 'wasm-function['))
      else raw_top_stack_frame
    end as top_stack_frame,
    path
  from diagnostics_with_stack
)
select
  failure_class,
  diagnostic_line,
  top_stack_frame,
  count(*) as files,
  group_concat(context, char(10) || char(10)) as contexts,
  group_concat(path, char(10)) as paths
from diagnostics
group by failure_class, diagnostic_line, top_stack_frame
order by files desc, failure_class, diagnostic_line, top_stack_frame;
