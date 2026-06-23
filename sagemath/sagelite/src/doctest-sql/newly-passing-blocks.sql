with ordered_runs as (
  select
    id,
    row_number() over (order by id desc) as run_order
  from runs
),
latest as (
  select id from ordered_runs where run_order = 1
),
previous as (
  select id from ordered_runs where run_order = 2
),
latest_blocks as (
  select
    f.path,
    b.block_key,
    b.start_line,
    b.source,
    b.status
  from blocks b
  join files f on f.id = b.file_id
  where f.run_id = (select id from latest)
),
previous_blocks as (
  select
    b.block_key,
    b.status
  from blocks b
  join files f on f.id = b.file_id
  where f.run_id = (select id from previous)
)
select
  latest_blocks.path,
  latest_blocks.start_line,
  latest_blocks.source
from latest_blocks
join previous_blocks using (block_key)
where
  latest_blocks.status = 'passed'
  and previous_blocks.status != 'passed'
order by latest_blocks.path, latest_blocks.start_line;
