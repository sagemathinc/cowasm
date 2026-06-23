with latest as (
  select max(id) as run_id from runs
),
skips as (
  select
    f.path,
    b.start_line,
    coalesce(b.skip_reason, 'unspecified') as skip_reason,
    coalesce(b.expected_kind, 'skip') as expected_kind,
    coalesce(b.tags, '') as tags,
    b.source
  from blocks b
  join files f on f.id = b.file_id
  where
    f.run_id = (select run_id from latest)
    and b.status = 'skipped'
)
select
  skip_reason,
  expected_kind,
  tags,
  count(*) as blocks,
  group_concat(path || ':' || coalesce(start_line, '') || ': ' || source, char(10)) as contexts
from skips
group by skip_reason, expected_kind, tags
order by blocks desc, skip_reason, tags;
