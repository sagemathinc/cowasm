with latest as (
  select max(id) as run_id from runs
),
deferred_blocks as (
  select
    f.path,
    b.start_line,
    coalesce(b.skip_reason, '') as skip_reason,
    coalesce(b.tags, '') as tags,
    b.source
  from blocks b
  join files f on f.id = b.file_id
  where
    f.run_id = (select run_id from latest)
    and b.status = 'skipped'
    and coalesce(b.skip_reason, '') like 'deferred:%'
    and b.start_line is not null
    and b.start_line > 0
),
reruns as (
  select
    replace(substr(skip_reason, length('deferred:') + 1), ' ', '-') as deferred_tags,
    path,
    start_line,
    source
  from deferred_blocks
)
select
  deferred_tags,
  path,
  start_line as source_line,
  'sage -t --deferred=' || deferred_tags || ' --line ' || start_line || ' ' || path as command,
  replace(rtrim(source, char(10) || char(13)), char(10), '\n') as source
from reruns
where deferred_tags != ''
order by deferred_tags, path, start_line;
