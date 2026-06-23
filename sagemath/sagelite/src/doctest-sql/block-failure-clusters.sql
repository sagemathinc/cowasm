with latest as (
  select max(id) as run_id from runs
),
failures as (
  select
    f.path,
    b.start_line,
    coalesce(b.failure_class, 'unclassified') as failure_class,
    coalesce(
      b.failure_detail,
      trim(substr(coalesce(b.actual, ''), 1, instr(coalesce(b.actual, '') || char(10), char(10)) - 1)),
      ''
    ) as failure_detail,
    b.source
  from blocks b
  join files f on f.id = b.file_id
  where
    f.run_id = (select run_id from latest)
    and b.status = 'failed'
)
select
  failure_class,
  failure_detail,
  count(*) as blocks,
  group_concat(path || ':' || coalesce(start_line, '') || ': ' || source, char(10)) as contexts
from failures
group by failure_class, failure_detail
order by blocks desc, failure_class, failure_detail;
