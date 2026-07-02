#!/usr/bin/env python3
"""List Sagelite doctest candidate files that are not in a corpus file."""

from __future__ import annotations

import argparse
import os
import posixpath
import signal
import sqlite3
import sys
from pathlib import Path


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
        help="Sagelite source root; defaults to the latest run metadata",
    )
    parser.add_argument(
        "--min-passed",
        type=int,
        default=1,
        help="minimum passing block count for a candidate",
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
        "--dedupe-paths",
        action="store_true",
        help=(
            "when scanning several databases, print only the best row for each "
            "normalized candidate path"
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
        "--max-failed",
        type=int,
        default=10,
        help="maximum failed block count for --near-misses",
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
    return args


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


def latest_run_metadata(db: sqlite3.Connection) -> tuple[int, Path | None]:
    row = db.execute(
        """
        select id, source_root
        from runs
        order by id desc
        limit 1
        """
    ).fetchone()
    if row is None:
        raise SystemExit("no doctest runs found in database")
    run_id, source_root = row
    return run_id, Path(source_root) if source_root else None


def files_table_has_column(db: sqlite3.Connection, column: str) -> bool:
    return any(
        name == column
        for _cid, name, *_rest in db.execute("pragma table_info(files)")
    )


def one_line_detail(detail: str) -> str:
    return " ".join(detail.replace("\t", " ").splitlines()).strip()


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
    if file_errors:
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
            order by
              {failure_class_expr},
              duration_ms,
              path
            """,
            (run_id,),
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
              {failure_detail_expr}
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
              and status = 'failed'
              and passed_blocks >= ?
              and failed_blocks between 1 and ?
              and total_blocks - skipped_blocks > 0
            order by
              failed_blocks,
              passed_blocks desc,
              skipped_blocks,
              duration_ms,
              path
            """,
            (run_id, min_passed, max_failed),
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
        relative_path = normalize_path(path, source_root)
        if not include_non_sage and not relative_path.startswith("src/sage/"):
            continue
        if not source_candidate_exists(relative_path, source_root):
            continue
        if relative_path in covered:
            continue
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
                one_line_detail(failure_detail),
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
            if args.include_failure_detail:
                columns.append("failure_detail")
        if show_database:
            columns.insert(0, "database")
        print("\t".join(columns))

    for database in args.database:
        try:
            if not database.exists():
                raise SystemExit(f"database not found: {database}")
            with sqlite3.connect(database) as db:
                require_doctest_schema(database, db)
                run_id, db_source_root = latest_run_metadata(db)
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
                )
        except (sqlite3.DatabaseError, SystemExit) as error:
            if args.ignore_invalid:
                if not args.quiet_invalid:
                    print(f"warning: skipping {database}: {error}", file=sys.stderr)
                continue
            raise

        if args.dedupe_paths:
            collected_rows.extend((database, row) for row in rows)
        else:
            for row in rows:
                print_row(row, database, show_database, args)

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
        ):
            print_row(row, database, show_database, args)
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
        values = row if args.include_failure_detail else row[:-1]
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
