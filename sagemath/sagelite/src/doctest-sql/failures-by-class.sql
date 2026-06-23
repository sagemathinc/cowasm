with latest as (
  select max(id) as run_id from runs
),
block_failures as (
  select
    coalesce(b.failure_class, 'unclassified') as failure_class
  from blocks b
  join files f on f.id = b.file_id
  where
    f.run_id = (select run_id from latest)
    and b.status = 'failed'
),
file_failures as (
  select
    coalesce(f.failure_class, 'file_error') as failure_class
  from files f
  where
    f.run_id = (select run_id from latest)
    and f.status = 'error'
    and f.failed_blocks > 0
),
all_failures as (
  select failure_class from block_failures
  union all
  select failure_class from file_failures
)
select
  failure_class,
  count(*) as failures
from all_failures
group by failure_class
order by failures desc, failure_class;
