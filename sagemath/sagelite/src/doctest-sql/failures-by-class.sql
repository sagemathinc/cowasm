with latest as (
  select max(id) as run_id from runs
)
select
  coalesce(b.failure_class, 'unclassified') as failure_class,
  count(*) as failures
from blocks b
join files f on f.id = b.file_id
where
  f.run_id = (select run_id from latest)
  and b.status = 'failed'
group by coalesce(b.failure_class, 'unclassified')
order by failures desc, failure_class;
