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
tag_split(path, start_line, skip_reason, source, tag, rest) as (
  select
    path,
    start_line,
    skip_reason,
    source,
    '',
    tags || ','
  from deferred_blocks
  union all
  select
    path,
    start_line,
    skip_reason,
    source,
    substr(rest, 1, instr(rest, ',') - 1),
    substr(rest, instr(rest, ',') + 1)
  from tag_split
  where rest != ''
),
optional_features as (
  select
    path,
    start_line,
    group_concat(substr(tag, length('optional:') + 1), ',') as optional_arg
  from tag_split
  where tag like 'optional:%'
    and length(substr(tag, length('optional:') + 1)) > 0
  group by path, start_line
),
reruns as (
  select
    replace(substr(skip_reason, length('deferred:') + 1), ' ', '-') as deferred_tags,
    deferred_blocks.path,
    deferred_blocks.start_line,
    source,
    coalesce(optional_arg, '') as optional_arg,
    instr(',' || tags || ',', ',optional,') > 0 as has_optional
  from deferred_blocks
  left join optional_features
    on optional_features.path = deferred_blocks.path
    and optional_features.start_line = deferred_blocks.start_line
)
select
  deferred_tags,
  path,
  start_line as source_line,
  'sage -t --deferred=' || deferred_tags ||
    case
      when optional_arg != '' then ' --optional=''' || replace(optional_arg, '''', '''"''"''') || ''''
      when has_optional then ' --optional'
      else ''
    end ||
    ' --line ' || start_line || ' ' || path as command,
  replace(rtrim(source, char(10) || char(13)), char(10), '\n') as source
from reruns
where deferred_tags != ''
order by deferred_tags, path, start_line;
