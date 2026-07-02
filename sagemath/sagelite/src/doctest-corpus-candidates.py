#!/usr/bin/env python3
"""List clean Sagelite doctest candidates that are not in a corpus file."""

from __future__ import annotations

import argparse
import os
import posixpath
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
    parser.add_argument("database", type=Path, help="doctest SQLite database")
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
    args = parser.parse_args()
    if args.paths_only and args.include_header:
        parser.error("--paths-only cannot be combined with --include-header")
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
    candidate = Path(path)
    if source_root is not None:
        try:
            return candidate.resolve().relative_to(source_root.resolve()).as_posix()
        except ValueError:
            pass

    text = path.replace(os.sep, "/")
    marker = "/src/sage/"
    if marker in text:
        return "src/sage/" + text.split(marker, 1)[1]
    if text.startswith("src/sage/"):
        return text
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


def candidate_rows(
    db: sqlite3.Connection,
    run_id: int,
    covered: set[str],
    source_root: Path | None,
    min_passed: int,
    include_non_sage: bool,
) -> list[tuple[str, int, int, int, int, int]]:
    rows = db.execute(
        """
        select
          path,
          total_blocks,
          passed_blocks,
          skipped_blocks,
          total_blocks - skipped_blocks as runnable_blocks,
          duration_ms
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
    for path, total, passed, skipped, runnable, duration in rows:
        relative_path = normalize_path(path, source_root)
        if not include_non_sage and not relative_path.startswith("src/sage/"):
            continue
        if not source_candidate_exists(relative_path, source_root):
            continue
        if relative_path in covered:
            continue
        candidates.append((relative_path, total, passed, skipped, runnable, duration))
    return candidates


def main() -> int:
    args = parse_args()
    if not args.database.exists():
        raise SystemExit(f"database not found: {args.database}")
    with sqlite3.connect(args.database) as db:
        require_doctest_schema(args.database, db)
        run_id, db_source_root = latest_run_metadata(db)
        source_root = args.source_root or db_source_root
        covered = read_corpus(args.corpus, source_root)
        rows = candidate_rows(
            db,
            run_id,
            covered,
            source_root,
            args.min_passed,
            args.include_non_sage,
        )

    if args.include_header:
        print("path\ttotal_blocks\tpassed_blocks\tskipped_blocks\trunnable_blocks\tduration_ms")
    for row in rows:
        if args.paths_only:
            print(row[0])
        else:
            print("\t".join(str(value) for value in row))
    return 0


if __name__ == "__main__":
    sys.exit(main())
