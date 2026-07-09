#!/usr/bin/env python3
"""List Sagelite doctest candidate files that are not in a corpus file."""

from __future__ import annotations

import argparse
import os
import posixpath
import shlex
import signal
import sqlite3
import sys
from pathlib import Path


DEFAULT_EXCLUDED_PATH_PREFIXES = ("src/sage/doctest/tests/",)
DEFAULT_EXCLUDED_PATH_SUFFIXES = (".orig", ".rej")
REQUIRED_RUN_METADATA_COLUMNS = (
    "started_at",
    "git_commit",
    "command",
    "run_profile",
    "status",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Print clean runnable files from the latest Sagelite doctest run "
            "after subtracting entries already listed in the curated corpus."
        )
    )
    parser.add_argument(
        "database",
        type=Path,
        nargs="+",
        help="doctest SQLite database; pass more than one to scan several runs",
    )
    parser.add_argument(
        "--corpus",
        type=Path,
        default=Path(__file__).with_name("doctest-corpus") / "basic-pure-math.txt",
        help="curated corpus file to subtract",
    )
    parser.add_argument(
        "--source-root",
        type=Path,
        help=(
            "Sagelite source root for corpus normalization and source-existence "
            "filtering; defaults to each database's latest run metadata"
        ),
    )
    parser.add_argument(
        "--min-passed",
        type=int,
        default=1,
        help="minimum passing block count for a candidate",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="maximum number of rows to print after filtering and sorting",
    )
    parser.add_argument(
        "--include-header",
        action="store_true",
        help="print a tab-separated header row",
    )
    parser.add_argument(
        "--paths-only",
        action="store_true",
        help="print only normalized candidate paths, one per line",
    )
    parser.add_argument(
        "--include-non-sage",
        action="store_true",
        help="include clean files outside the src/sage source tree",
    )
    parser.add_argument(
        "--include-covered",
        action="store_true",
        help=(
            "include rows already listed in the corpus; useful for auditing "
            "probe results without changing the default promotion-candidate "
            "subtraction"
        ),
    )
    parser.add_argument(
        "--include-doctest-self-tests",
        action="store_true",
        help=(
            "include Sage doctest framework self-test fixtures, which are "
            "excluded by default because several files intentionally fail"
        ),
    )
    parser.add_argument(
        "--dedupe-paths",
        action="store_true",
        help=(
            "when scanning several databases, print only the best row for each "
            "normalized candidate path"
        ),
    )
    parser.add_argument(
        "--strict-frontier",
        action="store_true",
        help=(
            "enable the standard scheduled frontier-scan guards: require "
            "modern run metadata, persisted block rows, a file-level doctest "
            "run, absolute paths under the selected source root, and "
            "path-deduplicated output"
        ),
    )
    parser.add_argument(
        "--near-misses",
        action="store_true",
        help=(
            "print failed files with at least --min-passed passing blocks "
            "instead of clean promotion candidates"
        ),
    )
    parser.add_argument(
        "--skipped-only",
        action="store_true",
        help=(
            "print clean files whose latest run has only skipped blocks, "
            "for auditing dependency-boundary coverage"
        ),
    )
    parser.add_argument(
        "--zero-blocks",
        action="store_true",
        help=(
            "print clean files whose latest run extracted no doctest blocks, "
            "for auditing empty frontier probes"
        ),
    )
    parser.add_argument(
        "--file-errors",
        action="store_true",
        help=(
            "print files whose latest run failed at file scope, for auditing "
            "runtime, import, timeout, and worker-process frontiers"
        ),
    )
    parser.add_argument(
        "--include-failure-detail",
        action="store_true",
        help=(
            "append one-line failure_detail text when printing diagnostic "
            "candidate modes"
        ),
    )
    parser.add_argument(
        "--include-skip-reasons",
        action="store_true",
        help=(
            "with --skipped-only, append distinct block skip reasons so "
            "dependency-boundary rows can be audited without raw SQLite queries"
        ),
    )
    parser.add_argument(
        "--include-skip-tags",
        action="store_true",
        help=(
            "with --skipped-only, append distinct block tags so optional, "
            "needs, and deferred boundaries can be audited without raw SQLite "
            "queries"
        ),
    )
    parser.add_argument(
        "--only-skip-reason",
        action="append",
        default=[],
        metavar="TEXT[,TEXT...]",
        help=(
            "with --skipped-only, report only files whose distinct block skip "
            "reasons contain one of these substrings; may be repeated"
        ),
    )
    parser.add_argument(
        "--only-skip-tag",
        action="append",
        default=[],
        metavar="TEXT[,TEXT...]",
        help=(
            "with --skipped-only, report only files whose distinct block tags "
            "contain one of these substrings; may be repeated"
        ),
    )
    parser.add_argument(
        "--exclude-skip-tag",
        action="append",
        default=[],
        metavar="TEXT[,TEXT...]",
        help=(
            "with --skipped-only, suppress files whose distinct block tags "
            "contain one of these substrings; may be repeated"
        ),
    )
    parser.add_argument(
        "--exclude-skip-reason",
        action="append",
        default=[],
        metavar="TEXT[,TEXT...]",
        help=(
            "with --skipped-only, suppress files whose distinct block skip "
            "reasons contain one of these substrings; may be repeated"
        ),
    )
    parser.add_argument(
        "--failure-detail-limit",
        type=int,
        default=0,
        metavar="CHARS",
        help=(
            "when printing failure details, truncate them to this many "
            "characters; 0 leaves details unbounded"
        ),
    )
    parser.add_argument(
        "--max-failed",
        type=int,
        default=10,
        help="maximum failed block count for --near-misses",
    )
    parser.add_argument(
        "--exclude-block-failure-class",
        action="append",
        default=[],
        metavar="CLASS[,CLASS...]",
        help=(
            "with --near-misses, suppress files whose failed blocks include "
            "one of these failure_class values; may be repeated"
        ),
    )
    parser.add_argument(
        "--only-block-failure-class",
        action="append",
        default=[],
        metavar="CLASS[,CLASS...]",
        help=(
            "with --near-misses, report only files whose failed blocks include "
            "one of these failure_class values; may be repeated"
        ),
    )
    parser.add_argument(
        "--exclude-block-failure-detail",
        action="append",
        default=[],
        metavar="TEXT[,TEXT...]",
        help=(
            "with --near-misses, suppress files whose block-level "
            "failure_detail contains one of these substrings; may be repeated"
        ),
    )
    parser.add_argument(
        "--only-block-failure-detail",
        action="append",
        default=[],
        metavar="TEXT[,TEXT...]",
        help=(
            "with --near-misses, report only files whose block-level "
            "failure_detail contains one of these substrings; may be repeated"
        ),
    )
    parser.add_argument(
        "--exclude-file-failure-class",
        action="append",
        default=[],
        metavar="CLASS[,CLASS...]",
        help=(
            "with --file-errors, suppress files whose file-scope failure_class "
            "matches one of these values; may be repeated"
        ),
    )
    parser.add_argument(
        "--only-file-failure-class",
        action="append",
        default=[],
        metavar="CLASS[,CLASS...]",
        help=(
            "with --file-errors, report only files whose file-scope "
            "failure_class matches one of these values; may be repeated"
        ),
    )
    parser.add_argument(
        "--exclude-file-failure-detail",
        action="append",
        default=[],
        metavar="TEXT[,TEXT...]",
        help=(
            "with --file-errors, suppress files whose one-line failure_detail "
            "contains one of these substrings; may be repeated"
        ),
    )
    parser.add_argument(
        "--only-file-failure-detail",
        action="append",
        default=[],
        metavar="TEXT[,TEXT...]",
        help=(
            "with --file-errors, report only files whose one-line "
            "failure_detail contains one of these substrings; may be repeated"
        ),
    )
    parser.add_argument(
        "--min-runner-version",
        type=int,
        help=(
            "scan only the latest run whose runner_version is at least this "
            "value; databases without runner_version metadata produce no rows"
        ),
    )
    parser.add_argument(
        "--require-run-metadata",
        action="store_true",
        help=(
            "scan only databases with modern real-run metadata columns, "
            "filtering synthetic helper fixtures while preserving legacy "
            "compatibility by default"
        ),
    )
    parser.add_argument(
        "--require-block-rows",
        action="store_true",
        help=(
            "scan only databases whose selected run has persisted block rows, "
            "filtering aggregate-only fixtures and empty probe databases while "
            "preserving legacy compatibility by default"
        ),
    )
    parser.add_argument(
        "--require-source-root-path",
        action="store_true",
        help=(
            "include absolute file rows only when the recorded path is under "
            "the selected source root; useful when scanning old scratch "
            "databases that were run against a different checkout"
        ),
    )
    parser.add_argument(
        "--require-file-run",
        action="store_true",
        help=(
            "scan only databases whose selected run command is a file-level "
            "doctest run, filtering focused --line and --block-key reruns"
        ),
    )
    parser.add_argument(
        "--ignore-invalid",
        action="store_true",
        help="skip missing, empty, or non-Sagelite databases during multi-database scans",
    )
    parser.add_argument(
        "--quiet-invalid",
        action="store_true",
        help="with --ignore-invalid, suppress skipped-database warnings",
    )
    args = parser.parse_args()
    if args.paths_only and args.include_header:
        parser.error("--paths-only cannot be combined with --include-header")
    exclusive_modes = [
        args.near_misses,
        args.skipped_only,
        args.zero_blocks,
        args.file_errors,
    ]
    if sum(1 for enabled in exclusive_modes if enabled) > 1:
        parser.error(
            "--near-misses, --skipped-only, --zero-blocks, and --file-errors "
            "are mutually exclusive"
        )
    if args.quiet_invalid and not args.ignore_invalid:
        parser.error("--quiet-invalid requires --ignore-invalid")
    if args.max_failed < 1:
        parser.error("--max-failed must be positive")
    if args.limit is not None and args.limit < 1:
        parser.error("--limit must be positive")
    if args.min_runner_version is not None and args.min_runner_version < 1:
        parser.error("--min-runner-version must be positive")
    if args.failure_detail_limit < 0:
        parser.error("--failure-detail-limit must be non-negative")
    if args.strict_frontier:
        args.require_run_metadata = True
        args.require_block_rows = True
        args.require_file_run = True
        args.require_source_root_path = True
        args.dedupe_paths = True
    if args.exclude_block_failure_class and not args.near_misses:
        parser.error("--exclude-block-failure-class requires --near-misses")
    if args.only_block_failure_class and not args.near_misses:
        parser.error("--only-block-failure-class requires --near-misses")
    if args.exclude_block_failure_detail and not args.near_misses:
        parser.error("--exclude-block-failure-detail requires --near-misses")
    if args.only_block_failure_detail and not args.near_misses:
        parser.error("--only-block-failure-detail requires --near-misses")
    if args.exclude_file_failure_class and not args.file_errors:
        parser.error("--exclude-file-failure-class requires --file-errors")
    if args.only_file_failure_class and not args.file_errors:
        parser.error("--only-file-failure-class requires --file-errors")
    if args.exclude_file_failure_detail and not args.file_errors:
        parser.error("--exclude-file-failure-detail requires --file-errors")
    if args.only_file_failure_detail and not args.file_errors:
        parser.error("--only-file-failure-detail requires --file-errors")
    if args.include_skip_reasons and not args.skipped_only:
        parser.error("--include-skip-reasons requires --skipped-only")
    if args.include_skip_tags and not args.skipped_only:
        parser.error("--include-skip-tags requires --skipped-only")
    if args.only_skip_reason and not args.skipped_only:
        parser.error("--only-skip-reason requires --skipped-only")
    if args.exclude_skip_reason and not args.skipped_only:
        parser.error("--exclude-skip-reason requires --skipped-only")
    if args.only_skip_tag and not args.skipped_only:
        parser.error("--only-skip-tag requires --skipped-only")
    if args.exclude_skip_tag and not args.skipped_only:
        parser.error("--exclude-skip-tag requires --skipped-only")
    args.exclude_block_failure_class = parse_csv_values(
        args.exclude_block_failure_class
    )
    args.only_block_failure_class = parse_csv_values(args.only_block_failure_class)
    args.exclude_block_failure_detail = parse_csv_values(
        args.exclude_block_failure_detail
    )
    args.only_block_failure_detail = parse_csv_values(args.only_block_failure_detail)
    args.exclude_file_failure_class = parse_csv_values(
        args.exclude_file_failure_class
    )
    args.only_file_failure_class = parse_csv_values(args.only_file_failure_class)
    args.exclude_file_failure_detail = parse_csv_values(
        args.exclude_file_failure_detail
    )
    args.only_file_failure_detail = parse_csv_values(args.only_file_failure_detail)
    args.only_skip_reason = parse_csv_values(args.only_skip_reason)
    args.exclude_skip_reason = parse_csv_values(args.exclude_skip_reason)
    args.only_skip_tag = parse_csv_values(args.only_skip_tag)
    args.exclude_skip_tag = parse_csv_values(args.exclude_skip_tag)
    args.excluded_path_prefixes = (
        ()
        if args.include_doctest_self_tests
        else DEFAULT_EXCLUDED_PATH_PREFIXES
    )
    return args


def parse_csv_values(values: list[str]) -> list[str]:
    parsed: list[str] = []
    for value in values:
        parsed.extend(part.strip() for part in value.split(",") if part.strip())
    return parsed


def require_doctest_schema(database: Path, db: sqlite3.Connection) -> None:
    if not database.exists():
        raise SystemExit(f"database not found: {database}")
    if database.stat().st_size == 0:
        raise SystemExit(f"empty doctest database: {database}")

    required_tables = {"runs", "files"}
    rows = db.execute(
        """
        select name
        from sqlite_master
        where type = 'table'
        """
    ).fetchall()
    existing_tables = {name for (name,) in rows}
    missing_tables = sorted(required_tables - existing_tables)
    if missing_tables:
        missing = ", ".join(missing_tables)
        raise SystemExit(
            f"not a Sagelite doctest database: {database} "
            f"(missing table{'s' if len(missing_tables) != 1 else ''}: {missing})"
        )


def normalize_path(path: str, source_root: Path | None) -> str:
    text = path.replace(os.sep, "/")
    if text.startswith("sage/"):
        return posixpath.normpath(f"src/{text}")
    if text.startswith("src/sage/"):
        return posixpath.normpath(text)

    marker = "/src/sage/"
    if marker in text:
        return posixpath.normpath("src/sage/" + text.split(marker, 1)[1])

    candidate = Path(path)
    if source_root is not None and candidate.is_absolute():
        try:
            return candidate.resolve().relative_to(source_root.resolve()).as_posix()
        except ValueError:
            pass
    return posixpath.normpath(text)


def read_corpus(corpus: Path, source_root: Path | None) -> set[str]:
    entries: set[str] = set()
    with corpus.open(encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            entries.add(normalize_path(line, source_root))
    return entries


def source_candidate_exists(relative_path: str, source_root: Path | None) -> bool:
    if source_root is None or not relative_path.startswith("src/sage/"):
        return True
    if not source_root.exists():
        return True
    return (source_root / relative_path).exists()


def source_path_matches_root(path: str, source_root: Path | None) -> bool:
    if source_root is None:
        return True
    candidate = Path(path)
    if not candidate.is_absolute():
        return True
    try:
        candidate.resolve().relative_to(source_root.resolve())
    except ValueError:
        return False
    return True


def table_has_column(db: sqlite3.Connection, table: str, column: str) -> bool:
    return any(
        name == column
        for _cid, name, *_rest in db.execute(f"pragma table_info({table})")
    )


def table_exists(db: sqlite3.Connection, table: str) -> bool:
    return (
        db.execute(
            """
            select 1
            from sqlite_master
            where type = 'table'
              and name = ?
            """,
            (table,),
        ).fetchone()
        is not None
    )


def connect_doctest_database(database: Path) -> sqlite3.Connection:
    db = sqlite3.connect(database)
    db.text_factory = lambda value: value.decode("utf-8", errors="replace")
    return db


def runs_table_has_column(db: sqlite3.Connection, column: str) -> bool:
    return table_has_column(db, "runs", column)


def latest_run_metadata(
    db: sqlite3.Connection,
    min_runner_version: int | None,
    require_run_metadata: bool,
    require_file_run: bool,
) -> tuple[int, Path | None] | None:
    filters = []
    parameters: list[object] = []
    if require_file_run and not runs_table_has_column(db, "command"):
        return None
    if require_run_metadata:
        if any(
            not runs_table_has_column(db, column)
            for column in REQUIRED_RUN_METADATA_COLUMNS
        ):
            return None
        filters.extend(
            f"coalesce({column}, '') != ''"
            for column in REQUIRED_RUN_METADATA_COLUMNS
        )
    if min_runner_version is not None:
        if not runs_table_has_column(db, "runner_version"):
            return None
        filters.append("runner_version >= ?")
        parameters.append(min_runner_version)
    command_expr = "command" if runs_table_has_column(db, "command") else "''"
    source_root_expr = (
        "source_root" if runs_table_has_column(db, "source_root") else "NULL"
    )
    where_clause = ""
    if filters:
        where_clause = "where " + " and ".join(filters)
    rows = db.execute(
        f"""
        select id, {source_root_expr}, {command_expr}
        from runs
        {where_clause}
        order by id desc
        """,
        parameters,
    ).fetchall()
    row = None
    for candidate in rows:
        if require_file_run and run_command_is_focused_rerun(candidate[2] or ""):
            continue
        row = candidate
        break
    if min_runner_version is not None and row is None:
        return None
    if require_run_metadata and row is None:
        return None
    if require_file_run and row is None:
        return None
    if row is None:
        raise SystemExit("no doctest runs found in database")
    run_id, source_root, _command = row
    return run_id, Path(source_root) if source_root else None


def run_command_is_focused_rerun(command: str) -> bool:
    try:
        tokens = shlex.split(command)
    except ValueError:
        tokens = command.split()
    for token in tokens:
        if token in {"--line", "--block-key"}:
            return True
        if token.startswith("--line=") or token.startswith("--block-key="):
            return True
    return False


def files_table_has_column(db: sqlite3.Connection, column: str) -> bool:
    return table_has_column(db, "files", column)


def can_filter_block_failure_classes(db: sqlite3.Connection) -> bool:
    return (
        table_exists(db, "blocks")
        and files_table_has_column(db, "id")
        and table_has_column(db, "blocks", "file_id")
        and table_has_column(db, "blocks", "status")
        and table_has_column(db, "blocks", "failure_class")
    )


def can_read_block_failure_details(db: sqlite3.Connection) -> bool:
    return can_filter_block_failure_classes(db) and table_has_column(
        db, "blocks", "failure_detail"
    )


def can_read_block_skip_reasons(db: sqlite3.Connection) -> bool:
    return (
        table_exists(db, "blocks")
        and files_table_has_column(db, "id")
        and table_has_column(db, "blocks", "file_id")
        and table_has_column(db, "blocks", "status")
        and table_has_column(db, "blocks", "skip_reason")
    )


def can_read_block_tags(db: sqlite3.Connection) -> bool:
    return (
        table_exists(db, "blocks")
        and files_table_has_column(db, "id")
        and table_has_column(db, "blocks", "file_id")
        and table_has_column(db, "blocks", "status")
        and table_has_column(db, "blocks", "tags")
    )


def run_has_block_rows(db: sqlite3.Connection, run_id: int) -> bool:
    return (
        table_exists(db, "blocks")
        and files_table_has_column(db, "id")
        and table_has_column(db, "blocks", "file_id")
        and db.execute(
            """
            select 1
            from blocks
            join files on files.id = blocks.file_id
            where files.run_id = ?
            limit 1
            """,
            (run_id,),
        ).fetchone()
        is not None
    )


def one_line_detail(detail: str) -> str:
    return " ".join(detail.replace("\t", " ").splitlines()).strip()


def printable_detail(detail: str, limit: int) -> str:
    if limit == 0 or len(detail) <= limit:
        return detail
    if limit <= 3:
        return "." * limit
    return detail[: limit - 3].rstrip() + "..."


def grouped_skipped_block_metadata(
    db: sqlite3.Connection,
    run_id: int,
    path: str,
    column: str,
    split_commas: bool,
) -> str:
    values: set[str] = set()
    rows = db.execute(
        f"""
        select distinct coalesce(blocks.{column}, '')
        from blocks
        join files on files.id = blocks.file_id
        where files.run_id = ?
          and files.path = ?
          and blocks.status = 'skipped'
          and coalesce(blocks.{column}, '') != ''
        """,
        (run_id, path),
    ).fetchall()
    for (value,) in rows:
        if split_commas:
            values.update(part.strip() for part in value.split(",") if part.strip())
        elif value.strip():
            values.add(value.strip())
    return ", ".join(sorted(values))


def combined_skip_metadata(skip_reasons: str, skip_tags: str) -> str:
    parts = []
    if skip_reasons:
        parts.append(f"reasons: {skip_reasons}")
    if skip_tags:
        parts.append(f"tags: {skip_tags}")
    return "; ".join(parts)


def candidate_rows(
    db: sqlite3.Connection,
    run_id: int,
    covered: set[str],
    source_root: Path | None,
    min_passed: int,
    include_non_sage: bool,
    near_misses: bool,
    skipped_only: bool,
    zero_blocks: bool,
    file_errors: bool,
    max_failed: int,
    excluded_block_failure_classes: list[str],
    only_block_failure_classes: list[str],
    excluded_block_failure_details: list[str],
    only_block_failure_details: list[str],
    excluded_file_failure_classes: list[str],
    only_file_failure_classes: list[str],
    excluded_file_failure_details: list[str],
    only_file_failure_details: list[str],
    only_skip_reasons: list[str],
    excluded_skip_reasons: list[str],
    only_skip_tags: list[str],
    excluded_skip_tags: list[str],
    excluded_path_prefixes: tuple[str, ...],
    include_skip_reasons: bool,
    include_skip_tags: bool,
    require_source_root_path: bool,
    include_covered: bool,
) -> list[tuple[str, int, int, int, int, int, int, str, str, str]]:
    failure_class_expr = (
        "coalesce(failure_class, '')"
        if files_table_has_column(db, "failure_class")
        else "''"
    )
    failure_detail_expr = (
        "coalesce(failure_detail, '')"
        if files_table_has_column(db, "failure_detail")
        else "''"
    )
    row_failure_class_expr = failure_class_expr
    row_failure_detail_expr = failure_detail_expr
    if near_misses and can_filter_block_failure_classes(db):
        row_failure_class_expr = f"""
              coalesce(
                (
                  select group_concat(class, ', ')
                  from (
                    select distinct coalesce(blocks.failure_class, '') as class
                    from blocks
                    where blocks.file_id = files.id
                      and blocks.status = 'failed'
                      and coalesce(blocks.failure_class, '') != ''
                    order by class
                  )
                ),
                {failure_class_expr}
              )
        """
    if near_misses and can_read_block_failure_details(db):
        row_failure_detail_expr = f"""
              coalesce(
                (
                  select group_concat(detail, char(10) || '---' || char(10))
                  from (
                    select distinct coalesce(blocks.failure_detail, '') as detail
                    from blocks
                    where blocks.file_id = files.id
                      and blocks.status = 'failed'
                      and coalesce(blocks.failure_detail, '') != ''
                    order by detail
                  )
                ),
                {failure_detail_expr}
              )
        """
    if skipped_only and (
        include_skip_reasons or only_skip_reasons or excluded_skip_reasons
    ):
        if not can_read_block_skip_reasons(db):
            raise SystemExit(
                "cannot read skip reasons: database lacks compatible "
                "blocks/files metadata"
            )
    if skipped_only and (include_skip_tags or only_skip_tags or excluded_skip_tags):
        if not can_read_block_tags(db):
            raise SystemExit(
                "cannot read skip tags: database lacks compatible "
                "blocks/files metadata"
            )
    if file_errors:
        file_failure_filter = ""
        query_parameters: list[object] = [run_id]
        if excluded_file_failure_classes:
            placeholders = ", ".join("?" for _ in excluded_file_failure_classes)
            file_failure_filter = f"""
              and {failure_class_expr} not in ({placeholders})
            """
            query_parameters.extend(excluded_file_failure_classes)
        if only_file_failure_classes:
            placeholders = ", ".join("?" for _ in only_file_failure_classes)
            file_failure_filter += f"""
              and {failure_class_expr} in ({placeholders})
            """
            query_parameters.extend(only_file_failure_classes)
        rows = db.execute(
            f"""
            select
              path,
              total_blocks,
              passed_blocks,
              failed_blocks,
              skipped_blocks,
              total_blocks - skipped_blocks as runnable_blocks,
              duration_ms,
              status,
              {failure_class_expr},
              {failure_detail_expr}
            from files
            where run_id = ?
              and status = 'error'
              {file_failure_filter}
            order by
              {failure_class_expr},
              duration_ms,
              path
            """,
            query_parameters,
        ).fetchall()
    elif zero_blocks:
        rows = db.execute(
            f"""
            select
              path,
              total_blocks,
              passed_blocks,
              failed_blocks,
              skipped_blocks,
              total_blocks - skipped_blocks as runnable_blocks,
              duration_ms,
              status,
              {failure_class_expr},
              {failure_detail_expr}
            from files
            where run_id = ?
              and status = 'passed'
              and total_blocks = 0
              and passed_blocks = 0
              and failed_blocks = 0
              and skipped_blocks = 0
            order by
              duration_ms,
              path
            """,
            (run_id,),
        ).fetchall()
    elif skipped_only:
        rows = db.execute(
            f"""
            select
              path,
              total_blocks,
              passed_blocks,
              failed_blocks,
              skipped_blocks,
              total_blocks - skipped_blocks as runnable_blocks,
              duration_ms,
              status,
              {failure_class_expr},
              {row_failure_detail_expr}
            from files
            where run_id = ?
              and status = 'passed'
              and passed_blocks = 0
              and failed_blocks = 0
              and skipped_blocks > 0
              and total_blocks = skipped_blocks
            order by
              skipped_blocks,
              duration_ms,
              path
            """,
            (run_id,),
        ).fetchall()
    elif near_misses:
        block_failure_filter = ""
        query_parameters: list[object] = [run_id, min_passed, max_failed]
        if excluded_block_failure_classes or only_block_failure_classes:
            if not can_filter_block_failure_classes(db):
                raise SystemExit(
                    "cannot filter block failure classes: database lacks "
                    "compatible blocks/files metadata"
                )
        if excluded_block_failure_details or only_block_failure_details:
            if not can_read_block_failure_details(db):
                raise SystemExit(
                    "cannot filter block failure details: database lacks "
                    "compatible blocks/files metadata"
                )
        if excluded_block_failure_classes:
            placeholders = ", ".join("?" for _ in excluded_block_failure_classes)
            block_failure_filter += f"""
              and not exists (
                select 1
                from blocks
                where blocks.file_id = files.id
                  and blocks.status = 'failed'
                  and coalesce(blocks.failure_class, '') in ({placeholders})
              )
            """
            query_parameters.extend(excluded_block_failure_classes)
        if only_block_failure_classes:
            placeholders = ", ".join("?" for _ in only_block_failure_classes)
            block_failure_filter += f"""
              and exists (
                select 1
                from blocks
                where blocks.file_id = files.id
                  and blocks.status = 'failed'
                  and coalesce(blocks.failure_class, '') in ({placeholders})
              )
            """
            query_parameters.extend(only_block_failure_classes)
        rows = db.execute(
            f"""
            select
              path,
              total_blocks,
              passed_blocks,
              failed_blocks,
              skipped_blocks,
              total_blocks - skipped_blocks as runnable_blocks,
              duration_ms,
              status,
              {row_failure_class_expr},
              {row_failure_detail_expr}
            from files
            where run_id = ?
              and status = 'failed'
              and passed_blocks >= ?
              and failed_blocks between 1 and ?
              and total_blocks - skipped_blocks > 0
              {block_failure_filter}
            order by
              failed_blocks,
              passed_blocks desc,
              skipped_blocks,
              duration_ms,
              path
            """,
            query_parameters,
        ).fetchall()
    else:
        rows = db.execute(
            f"""
            select
              path,
              total_blocks,
              passed_blocks,
              failed_blocks,
              skipped_blocks,
              total_blocks - skipped_blocks as runnable_blocks,
              duration_ms,
              status,
              {failure_class_expr},
              {failure_detail_expr}
            from files
            where run_id = ?
              and status = 'passed'
              and failed_blocks = 0
              and passed_blocks >= ?
              and total_blocks - skipped_blocks > 0
            order by
              passed_blocks desc,
              skipped_blocks,
              duration_ms,
              path
            """,
            (run_id, min_passed),
        ).fetchall()

    candidates = []
    for (
        path,
        total,
        passed,
        failed,
        skipped,
        runnable,
        duration,
        status,
        failure,
        failure_detail,
    ) in rows:
        if require_source_root_path and not source_path_matches_root(
            path, source_root
        ):
            continue
        relative_path = normalize_path(path, source_root)
        one_line_failure_detail = one_line_detail(failure_detail)
        skip_reason_detail = one_line_failure_detail
        if skipped_only and (
            include_skip_reasons or only_skip_reasons or excluded_skip_reasons
        ):
            skip_reason_detail = grouped_skipped_block_metadata(
                db, run_id, path, "skip_reason", False
            )
        skip_tag_detail = ""
        if skipped_only and (include_skip_tags or only_skip_tags or excluded_skip_tags):
            skip_tag_detail = grouped_skipped_block_metadata(
                db, run_id, path, "tags", True
            )
        if any(relative_path.startswith(prefix) for prefix in excluded_path_prefixes):
            continue
        if relative_path.endswith(DEFAULT_EXCLUDED_PATH_SUFFIXES):
            continue
        if file_errors and any(
            detail in one_line_failure_detail
            for detail in excluded_file_failure_details
        ):
            continue
        if file_errors and only_file_failure_details and not any(
            detail in one_line_failure_detail for detail in only_file_failure_details
        ):
            continue
        if near_misses and any(
            detail in one_line_failure_detail
            for detail in excluded_block_failure_details
        ):
            continue
        if near_misses and only_block_failure_details and not any(
            detail in one_line_failure_detail
            for detail in only_block_failure_details
        ):
            continue
        if skipped_only and only_skip_reasons and not any(
            reason in skip_reason_detail for reason in only_skip_reasons
        ):
            continue
        if skipped_only and any(
            reason in skip_reason_detail for reason in excluded_skip_reasons
        ):
            continue
        if skipped_only and only_skip_tags and not any(
            tag in skip_tag_detail for tag in only_skip_tags
        ):
            continue
        if skipped_only and any(
            tag in skip_tag_detail for tag in excluded_skip_tags
        ):
            continue
        if not include_non_sage and not relative_path.startswith("src/sage/"):
            continue
        if not source_candidate_exists(relative_path, source_root):
            continue
        if not include_covered and relative_path in covered:
            continue
        if skipped_only and include_skip_reasons and include_skip_tags:
            one_line_failure_detail = combined_skip_metadata(
                skip_reason_detail, skip_tag_detail
            )
        elif skipped_only and include_skip_reasons:
            one_line_failure_detail = skip_reason_detail
        elif skipped_only and include_skip_tags:
            one_line_failure_detail = skip_tag_detail
        candidates.append(
            (
                relative_path,
                total,
                passed,
                failed,
                skipped,
                runnable,
                duration,
                status,
                failure,
                one_line_failure_detail,
            )
        )
    return candidates


def row_sort_key(
    row: tuple[str, int, int, int, int, int, int, str, str, str],
    near_misses: bool,
    skipped_only: bool,
    zero_blocks: bool,
    file_errors: bool,
) -> tuple[int, int, int, int, str, str]:
    (
        path,
        _total,
        passed,
        failed,
        skipped,
        _runnable,
        duration,
        _status,
        _failure,
        _detail,
    ) = row
    if file_errors:
        failure = row[8]
        return (failed, skipped, duration, passed, failure, path)
    if zero_blocks:
        return (duration, skipped, failed, -passed, "", path)
    if skipped_only:
        return (skipped, duration, failed, -passed, "", path)
    if near_misses:
        return (failed, -passed, skipped, duration, "", path)
    return (-passed, skipped, failed, duration, "", path)


def main() -> int:
    if hasattr(signal, "SIGPIPE"):
        signal.signal(signal.SIGPIPE, signal.SIG_DFL)
    args = parse_args()
    show_database = len(args.database) > 1 and not args.paths_only
    covered_by_source_root: dict[Path | None, set[str]] = {}
    collected_rows: list[
        tuple[Path, tuple[str, int, int, int, int, int, int, str, str, str]]
    ] = []
    if args.include_header:
        columns = [
            "path",
            "total_blocks",
            "passed_blocks",
        ]
        if (
            args.near_misses
            or args.skipped_only
            or args.zero_blocks
            or args.file_errors
        ):
            columns.extend(["failed_blocks", "skipped_blocks"])
        else:
            columns.append("skipped_blocks")
        columns.extend(["runnable_blocks", "duration_ms"])
        if (
            args.near_misses
            or args.skipped_only
            or args.zero_blocks
            or args.file_errors
        ):
            columns.extend(["status", "failure_class"])
            if args.include_skip_reasons and args.include_skip_tags:
                columns.append("skip_metadata")
            elif args.include_skip_reasons:
                columns.append("skip_reasons")
            elif args.include_skip_tags:
                columns.append("skip_tags")
            elif args.include_failure_detail:
                columns.append("failure_detail")
        if show_database:
            columns.insert(0, "database")
        print("\t".join(columns))

    printed_rows = 0
    valid_database_count = 0
    invalid_database_count = 0
    first_invalid_error = ""
    for database in args.database:
        if args.limit is not None and printed_rows >= args.limit:
            break
        try:
            if not database.exists():
                raise SystemExit(f"database not found: {database}")
            with connect_doctest_database(database) as db:
                require_doctest_schema(database, db)
                metadata = latest_run_metadata(
                    db,
                    args.min_runner_version,
                    args.require_run_metadata,
                    args.require_file_run,
                )
                if metadata is None:
                    continue
                run_id, db_source_root = metadata
                if args.require_block_rows and not run_has_block_rows(db, run_id):
                    continue
                source_root = args.source_root or db_source_root
                if source_root not in covered_by_source_root:
                    covered_by_source_root[source_root] = read_corpus(
                        args.corpus, source_root
                    )
                covered = covered_by_source_root[source_root]
                rows = candidate_rows(
                    db,
                    run_id,
                    covered,
                    source_root,
                    args.min_passed,
                    args.include_non_sage,
                    args.near_misses,
                    args.skipped_only,
                    args.zero_blocks,
                    args.file_errors,
                    args.max_failed,
                    args.exclude_block_failure_class,
                    args.only_block_failure_class,
                    args.exclude_block_failure_detail,
                    args.only_block_failure_detail,
                    args.exclude_file_failure_class,
                    args.only_file_failure_class,
                    args.exclude_file_failure_detail,
                    args.only_file_failure_detail,
                    args.only_skip_reason,
                    args.exclude_skip_reason,
                    args.only_skip_tag,
                    args.exclude_skip_tag,
                    args.excluded_path_prefixes,
                    args.include_skip_reasons,
                    args.include_skip_tags,
                    args.require_source_root_path,
                    args.include_covered,
                )
        except (sqlite3.DatabaseError, SystemExit) as error:
            if args.ignore_invalid:
                invalid_database_count += 1
                if not first_invalid_error:
                    first_invalid_error = f"{database}: {error}"
                if not args.quiet_invalid:
                    print(f"warning: skipping {database}: {error}", file=sys.stderr)
                continue
            raise

        valid_database_count += 1
        if args.dedupe_paths:
            collected_rows.extend((database, row) for row in rows)
        else:
            for row in rows:
                if args.limit is not None and printed_rows >= args.limit:
                    break
                print_row(row, database, show_database, args)
                printed_rows += 1

    if args.dedupe_paths:
        best_by_path: dict[
            str, tuple[Path, tuple[str, int, int, int, int, int, int, str, str, str]]
        ] = {}
        for database, row in collected_rows:
            path = row[0]
            current = best_by_path.get(path)
            if current is None or row_sort_key(
                row,
                args.near_misses,
                args.skipped_only,
                args.zero_blocks,
                args.file_errors,
            ) < row_sort_key(
                current[1],
                args.near_misses,
                args.skipped_only,
                args.zero_blocks,
                args.file_errors,
            ):
                best_by_path[path] = (database, row)

        for database, row in sorted(
            best_by_path.values(),
            key=lambda item: row_sort_key(
                item[1],
                args.near_misses,
                args.skipped_only,
                args.zero_blocks,
                args.file_errors,
            ),
        )[: args.limit]:
            print_row(row, database, show_database, args)
    if (
        args.ignore_invalid
        and invalid_database_count
        and valid_database_count == 0
    ):
        print(
            "error: no valid Sagelite doctest databases were scanned"
            f" ({invalid_database_count} invalid; first: {first_invalid_error})",
            file=sys.stderr,
        )
        return 2
    return 0


def print_row(
    row: tuple[str, int, int, int, int, int, int, str, str, str],
    database: Path,
    show_database: bool,
    args: argparse.Namespace,
) -> None:
    if args.paths_only:
        print(row[0])
    elif args.near_misses or args.skipped_only or args.zero_blocks or args.file_errors:
        if (
            args.include_failure_detail
            or args.include_skip_reasons
            or args.include_skip_tags
        ):
            values = (*row[:-1], printable_detail(row[-1], args.failure_detail_limit))
        else:
            values = row[:-1]
        if show_database:
            values = (database, *values)
        print("\t".join(str(value) for value in values))
    else:
        (
            path,
            total,
            passed,
            _failed,
            skipped,
            runnable,
            duration,
            _status,
            _failure,
            _detail,
        ) = row
        values = (
            path,
            total,
            passed,
            skipped,
            runnable,
            duration,
        )
        if show_database:
            values = (database, *values)
        print(
            "\t".join(
                str(value)
                for value in values
            )
        )


if __name__ == "__main__":
    try:
        sys.exit(main())
    except BrokenPipeError:
        sys.stdout = open(os.devnull, "w")
        sys.exit(0)
