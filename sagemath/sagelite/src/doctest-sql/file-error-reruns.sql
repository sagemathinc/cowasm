with latest as (
  select max(id) as run_id from runs
),
file_errors as (
  select
    path,
    coalesce(failure_class, 'file_error') as failure_class,
    coalesce(failure_detail, stderr, '') as detail
  from files
  where
    run_id = (select run_id from latest)
    and status = 'error'
),
state_lines as (
  select
    path,
    failure_class,
    detail,
    instr(detail, 'line=') as line_start
  from file_errors
),
line_tokens as (
  select
    path,
    failure_class,
    detail,
    case
      when line_start > 0 then
        trim(
          substr(
            substr(detail, line_start + length('line=')),
            1,
            instr(substr(detail, line_start + length('line=')) || char(10), char(10)) - 1
          )
        )
      else null
    end as line_token
  from state_lines
),
reruns as (
  select
    path,
    failure_class,
    detail,
    case
      when line_token is not null and instr(line_token, ';') > 0 then
        trim(substr(line_token, 1, instr(line_token, ';') - 1))
      else line_token
    end as source_line
  from line_tokens
)
select
  failure_class,
  path,
  cast(source_line as integer) as source_line,
  'sage -t --line ' || cast(source_line as integer) || ' ' || path as command
from reruns
where
  source_line glob '[0-9]*'
  and cast(source_line as integer) > 0
order by failure_class, path, cast(source_line as integer);
