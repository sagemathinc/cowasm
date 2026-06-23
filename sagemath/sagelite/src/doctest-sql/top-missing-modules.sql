with latest as (
  select max(id) as run_id from runs
),
missing as (
  select
    case
      when instr(b.actual, 'ModuleNotFoundError: No module named ') > 0 then
        replace(
          substr(
            b.actual,
            instr(b.actual, 'ModuleNotFoundError: No module named ')
              + length('ModuleNotFoundError: No module named ')
          ),
          '''',
          ''
        )
      when instr(b.actual, 'ImportError: ') > 0 then
        substr(b.actual, instr(b.actual, 'ImportError: ') + length('ImportError: '))
      else null
    end as message
  from blocks b
  join files f on f.id = b.file_id
  where
    f.run_id = (select run_id from latest)
    and b.status = 'failed'
    and (
      instr(b.actual, 'ModuleNotFoundError: No module named ') > 0
      or instr(b.actual, 'ImportError: ') > 0
    )
)
select
  trim(substr(message, 1, instr(message || char(10), char(10)) - 1)) as missing_import,
  count(*) as failures
from missing
where message is not null
group by missing_import
order by failures desc, missing_import;
