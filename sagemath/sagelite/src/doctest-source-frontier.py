#!/usr/bin/env python3
"""List Sagelite source files with Sage prompts that are not yet audited."""

from __future__ import annotations

import argparse
import glob
import os
import posixpath
import re
import shlex
import sqlite3
import sys
from dataclasses import dataclass
from pathlib import Path


DEFAULT_EXCLUDED_PATH_PREFIXES = ("src/sage/doctest/tests/",)
DEFAULT_EXCLUDED_PATH_SUFFIXES = (".orig", ".rej")
DEFAULT_EXTENSIONS = (".py", ".pyx")
REQUIRED_RUN_METADATA_COLUMNS = (
    "started_at",
    "git_commit",
    "command",
    "run_profile",
    "status",
)
SAGE_PATH_RE = re.compile(
    r"(?<![A-Za-z0-9_./-])(?:src/)?sage/[A-Za-z0-9_./+-]+?"
    r"\.(?:pyx|py|pxi|pxd|rst|txt)"
    r"(?![A-Za-z0-9_./+-])"
)
SAGE_PROMPT_RE = re.compile(r"^\s*sage:")
FILE_SKIP_DIRECTIVE_RE = re.compile(
    r"^\s*#\s*sage\.doctest:\s*(?:.*\bneeds\b|.*\boptional\b)"
)
PROMPT_SKIP_DIRECTIVE_RE = re.compile(
    r"#\s*"
    r"(?:needs\b|optional\b|long time\b|known bug\b|not implemented\b|not tested\b)"
)
STANDALONE_SKIP_DIRECTIVE_RE = re.compile(
    r"^\s*sage:\s*#\s*"
    r"(?:needs\b|optional\b|long time\b|known bug\b|not implemented\b|not tested\b)"
)


@dataclass(frozen=True)
class DatabasePathScan:
    audited_paths: set[str]
    valid_count: int
    invalid_count: int
    first_invalid_error: str


def parse_args() -> argparse.Namespace:
    package_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(
        description=(
            "Print source files with Sage doctest prompts after subtracting "
            "the curated corpus and, optionally, files already mentioned in "
            "audit notes."
        )
    )
    parser.add_argument(
        "--source-root",
        type=Path,
        default=package_root / "build" / "wasi-sdk",
        help="patched Sagelite source root to scan",
    )
    parser.add_argument(
        "--corpus",
        type=Path,
        default=Path(__file__).with_name("doctest-corpus") / "basic-pure-math.txt",
        help="curated corpus file to subtract",
    )
    parser.add_argument(
        "--mentioned-file",
        type=Path,
        action="append",
        default=[],
        help=(
            "text file whose mentioned src/sage paths should be subtracted; "
            "may be repeated"
        ),
    )
    parser.add_argument(
        "--subtract-database",
        type=Path,
        action="append",
        default=[],
        help=(
            "Sagelite doctest SQLite database whose files table paths should "
            "be subtracted; may be repeated"
        ),
    )
    parser.add_argument(
        "--subtract-database-glob",
        action="append",
        default=[],
        metavar="PATTERN",
        help=(
            "glob for Sagelite doctest SQLite databases whose files table "
            "paths should be subtracted; may be repeated"
        ),
    )
    parser.add_argument(
        "--ignore-invalid-databases",
        action="store_true",
        help="skip missing, empty, or non-Sagelite subtraction databases",
    )
    parser.add_argument(
        "--quiet-invalid-databases",
        action="store_true",
        help="with --ignore-invalid-databases, suppress skipped-database warnings",
    )
    parser.add_argument(
        "--require-subtraction-database",
        action="store_true",
        help=(
            "fail if --subtract-database and --subtract-database-glob resolve "
            "no valid SQLite subtraction databases"
        ),
    )
    parser.add_argument(
        "--strict-database-subtraction",
        action="store_true",
        help=(
            "subtract only modern file-level doctest runs with persisted block "
            "rows and source paths under --source-root"
        ),
    )
    parser.add_argument(
        "--strict-frontier",
        action="store_true",
        help=(
            "enable the standard scheduled source-frontier database guards: "
            "modern run metadata, persisted block rows, file-level doctest "
            "runs, and absolute paths under --source-root"
        ),
    )
    parser.add_argument(
        "--min-runner-version",
        type=int,
        help=(
            "when subtracting databases, use only the latest run whose "
            "runner_version is at least this value"
        ),
    )
    parser.add_argument(
        "--extension",
        action="append",
        default=[],
        metavar=".EXT",
        help=(
            "source extension to scan; defaults to .py and .pyx and may be "
            "repeated"
        ),
    )
    parser.add_argument(
        "--min-prompts",
        type=int,
        default=1,
        help="minimum number of sage: prompt lines to report",
    )
    parser.add_argument(
        "--max-prompts",
        type=int,
        help="maximum number of sage: prompt lines to report",
    )
    parser.add_argument(
        "--min-runnable-prompts",
        type=int,
        default=0,
        help=(
            "minimum number of prompt lines not covered by common default-skip "
            "directives such as # needs, # optional, # long time, or # known bug"
        ),
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="maximum number of rows to print",
    )
    parser.add_argument(
        "--paths-only",
        action="store_true",
        help="print only normalized paths, one per line",
    )
    parser.add_argument(
        "--include-header",
        action="store_true",
        help="print a tab-separated header row",
    )
    parser.add_argument(
        "--include-runnable-prompts",
        action="store_true",
        help="append a runnable_prompt_count column to tabular output",
    )
    parser.add_argument(
        "--fail-on-rows",
        action="store_true",
        help="exit with status 1 after printing rows if any frontier rows remain",
    )
    parser.add_argument(
        "--include-covered",
        action="store_true",
        help="include files already listed in the curated corpus",
    )
    parser.add_argument(
        "--include-mentioned",
        action="store_true",
        help="include files already mentioned in --mentioned-file inputs",
    )
    parser.add_argument(
        "--include-doctest-self-tests",
        action="store_true",
        help="include Sage doctest framework self-test fixtures",
    )
    args = parser.parse_args()
    if args.paths_only and args.include_header:
        parser.error("--paths-only cannot be combined with --include-header")
    if args.paths_only and args.include_runnable_prompts:
        parser.error(
            "--paths-only cannot be combined with --include-runnable-prompts"
        )
    if args.min_prompts < 1:
        parser.error("--min-prompts must be positive")
    if args.max_prompts is not None and args.max_prompts < args.min_prompts:
        parser.error("--max-prompts must be at least --min-prompts")
    if args.min_runnable_prompts < 0:
        parser.error("--min-runnable-prompts must not be negative")
    if args.min_runner_version is not None and args.min_runner_version < 1:
        parser.error("--min-runner-version must be positive")
    if args.limit is not None and args.limit < 1:
        parser.error("--limit must be positive")
    validate_existing_files(parser, "--corpus", [args.corpus])
    validate_existing_files(parser, "--mentioned-file", args.mentioned_file)
    if args.strict_frontier:
        args.strict_database_subtraction = True
    if args.quiet_invalid_databases and not args.ignore_invalid_databases:
        parser.error(
            "--quiet-invalid-databases requires --ignore-invalid-databases"
        )
    args.unmatched_subtract_database_globs = []
    for pattern in args.subtract_database_glob:
        matches = sorted(glob.glob(pattern, recursive=True))
        if not matches:
            args.unmatched_subtract_database_globs.append(pattern)
            continue
        args.subtract_database.extend(Path(path) for path in matches)
    if args.unmatched_subtract_database_globs and not args.ignore_invalid_databases:
        parser.error(
            "subtraction database glob matched no files: "
            + ", ".join(args.unmatched_subtract_database_globs)
        )
    args.extensions = tuple(
        normalize_extension(extension) for extension in args.extension
    ) or DEFAULT_EXTENSIONS
    args.excluded_path_prefixes = (
        ()
        if args.include_doctest_self_tests
        else DEFAULT_EXCLUDED_PATH_PREFIXES
    )
    return args


def validate_existing_files(
    parser: argparse.ArgumentParser, option: str, paths: list[Path]
) -> None:
    for path in paths:
        if not path.is_file():
            parser.error(f"{option} does not name a file: {path}")


def normalize_extension(extension: str) -> str:
    return extension if extension.startswith(".") else f".{extension}"


def normalize_path(path: str, source_root: Path | None = None) -> str:
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


def read_corpus(corpus: Path, source_root: Path) -> set[str]:
    entries: set[str] = set()
    with corpus.open(encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            entries.add(normalize_path(line, source_root))
    return entries


def read_mentioned(paths: list[Path]) -> set[str]:
    mentioned: set[str] = set()
    for path in paths:
        text = path.read_text(encoding="utf-8")
        for match in SAGE_PATH_RE.finditer(text):
            mentioned.add(normalize_path(match.group(0)))
    return mentioned


def database_paths(args: argparse.Namespace) -> list[Path]:
    return list(args.subtract_database)


def read_database_paths(
    paths: list[Path],
    source_root: Path,
    ignore_invalid: bool,
    quiet_invalid: bool,
    strict_database_subtraction: bool,
    min_runner_version: int | None,
) -> DatabasePathScan:
    audited: set[str] = set()
    valid_count = 0
    invalid_count = 0
    first_invalid_error = ""
    for path in paths:
        try:
            audited.update(
                read_one_database_paths(
                    path,
                    source_root,
                    strict_database_subtraction,
                    min_runner_version,
                )
            )
            valid_count += 1
        except (OSError, sqlite3.DatabaseError, SystemExit) as err:
            if not ignore_invalid:
                raise
            invalid_count += 1
            if not first_invalid_error:
                first_invalid_error = f"{path}: {err}"
            if not quiet_invalid:
                print(
                    f"warning: skipping invalid doctest database {path}: {err}",
                    file=sys.stderr,
                )
    return DatabasePathScan(
        audited,
        valid_count,
        invalid_count,
        first_invalid_error,
    )


def read_one_database_paths(
    path: Path,
    source_root: Path,
    strict_database_subtraction: bool,
    min_runner_version: int | None,
) -> set[str]:
    if not path.exists():
        raise SystemExit(f"database not found: {path}")
    if path.stat().st_size == 0:
        raise SystemExit(f"empty doctest database: {path}")
    with sqlite3.connect(path) as db:
        db.text_factory = lambda value: value.decode("utf-8", errors="replace")
        rows = db.execute(
            """
            select name
            from sqlite_master
            where type = 'table' and name = 'files'
            """
        ).fetchall()
        if not rows:
            raise SystemExit(f"not a Sagelite doctest database: {path}")

        run_id = None
        if strict_database_subtraction or min_runner_version is not None:
            run_id = latest_subtraction_run(
                path,
                db,
                strict_database_subtraction,
                min_runner_version,
            )
            if run_id is None:
                return set()
            if strict_database_subtraction and not run_has_block_rows(db, run_id):
                return set()

        if run_id is None:
            file_rows = db.execute("select distinct path from files").fetchall()
        else:
            file_rows = db.execute(
                """
                select distinct path
                from files
                where run_id = ?
                """,
                (run_id,),
            ).fetchall()
    return {
        normalize_path(row_path, source_root)
        for (row_path,) in file_rows
        if row_path is not None
        and (
            not strict_database_subtraction
            or source_path_matches_root(row_path, source_root)
        )
    }


def latest_subtraction_run(
    database: Path,
    db: sqlite3.Connection,
    strict_database_subtraction: bool,
    min_runner_version: int | None,
) -> int | None:
    if not table_exists(db, "runs"):
        raise SystemExit(
            f"not a Sagelite doctest database: {database} (missing table: runs)"
        )
    filters = []
    parameters: list[object] = []
    if strict_database_subtraction:
        missing = [
            column
            for column in REQUIRED_RUN_METADATA_COLUMNS
            if not table_has_column(db, "runs", column)
        ]
        if missing:
            return None
        filters.extend(
            f"coalesce({column}, '') != ''"
            for column in REQUIRED_RUN_METADATA_COLUMNS
        )
    if min_runner_version is not None:
        if not table_has_column(db, "runs", "runner_version"):
            return None
        filters.append("runner_version >= ?")
        parameters.append(min_runner_version)

    command_expr = "command" if table_has_column(db, "runs", "command") else "''"
    where_clause = f"where {' and '.join(filters)}" if filters else ""
    rows = db.execute(
        f"""
        select id, {command_expr}
        from runs
        {where_clause}
        order by id desc
        """,
        parameters,
    ).fetchall()
    for run_id, command in rows:
        if strict_database_subtraction and run_command_is_focused_rerun(
            command or ""
        ):
            continue
        return run_id
    return None


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


def table_has_column(db: sqlite3.Connection, table: str, column: str) -> bool:
    return any(
        name == column
        for _cid, name, *_rest in db.execute(f"pragma table_info({table})")
    )


def run_has_block_rows(db: sqlite3.Connection, run_id: int) -> bool:
    if (
        not table_exists(db, "blocks")
        or not table_has_column(db, "files", "id")
        or not table_has_column(db, "files", "run_id")
        or not table_has_column(db, "blocks", "file_id")
    ):
        return False
    return (
        db.execute(
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


def source_path_matches_root(path: str, source_root: Path) -> bool:
    candidate = Path(path)
    if not candidate.is_absolute():
        return True
    try:
        candidate.resolve().relative_to(source_root.resolve())
    except ValueError:
        return False
    return True


def iter_source_files(source_root: Path, extensions: tuple[str, ...]) -> list[Path]:
    source_dir = source_root / "src" / "sage"
    if not source_dir.is_dir():
        raise SystemExit(f"Sagelite source tree not found: {source_dir}")
    return sorted(
        path
        for path in source_dir.rglob("*")
        if path.is_file() and path.suffix in extensions
    )


def count_sage_prompts(path: Path) -> tuple[int, int]:
    prompts = 0
    runnable_prompts = 0
    file_skip_directive = False
    active_skip_directive = False
    try:
        with path.open(encoding="utf-8") as handle:
            for line in handle:
                (
                    prompt_counted,
                    runnable_counted,
                    file_skip_directive,
                    active_skip_directive,
                ) = count_line_prompts(line, file_skip_directive, active_skip_directive)
                prompts += prompt_counted
                runnable_prompts += runnable_counted
    except UnicodeDecodeError:
        prompts = 0
        runnable_prompts = 0
        file_skip_directive = False
        active_skip_directive = False
        with path.open(encoding="latin-1") as handle:
            for line in handle:
                (
                    prompt_counted,
                    runnable_counted,
                    file_skip_directive,
                    active_skip_directive,
                ) = count_line_prompts(line, file_skip_directive, active_skip_directive)
                prompts += prompt_counted
                runnable_prompts += runnable_counted
    return prompts, runnable_prompts


def count_line_prompts(
    line: str,
    file_skip_directive: bool,
    active_skip_directive: bool,
) -> tuple[int, int, bool, bool]:
    if FILE_SKIP_DIRECTIVE_RE.search(line):
        file_skip_directive = True
    if not line.strip():
        active_skip_directive = False

    if not SAGE_PROMPT_RE.match(line):
        return 0, 0, file_skip_directive, active_skip_directive

    prompt_skip_directive = bool(PROMPT_SKIP_DIRECTIVE_RE.search(line))
    standalone_skip_directive = bool(STANDALONE_SKIP_DIRECTIVE_RE.match(line))
    runnable = not (
        file_skip_directive or active_skip_directive or prompt_skip_directive
    )
    active_skip_directive = active_skip_directive or standalone_skip_directive
    return 1, int(runnable), file_skip_directive, active_skip_directive


def is_excluded_path(
    relative_path: str,
    excluded_prefixes: tuple[str, ...],
) -> bool:
    return (
        relative_path.endswith(DEFAULT_EXCLUDED_PATH_SUFFIXES)
        or relative_path.startswith(excluded_prefixes)
    )


def main() -> int:
    args = parse_args()
    source_root = args.source_root.resolve()
    covered = read_corpus(args.corpus, source_root)
    mentioned = read_mentioned(args.mentioned_file)
    subtraction_databases = database_paths(args)
    if args.require_subtraction_database and not subtraction_databases:
        print(
            "error: no Sagelite doctest databases matched subtraction inputs",
            file=sys.stderr,
        )
        return 2
    database_scan = read_database_paths(
        subtraction_databases,
        source_root,
        args.ignore_invalid_databases,
        args.quiet_invalid_databases,
        args.strict_database_subtraction,
        args.min_runner_version,
    )
    audited = database_scan.audited_paths
    invalid_count = database_scan.invalid_count
    first_invalid_error = database_scan.first_invalid_error
    if args.ignore_invalid_databases:
        for pattern in args.unmatched_subtract_database_globs:
            invalid_count += 1
            error = f"{pattern}: no files matched subtraction database glob"
            if not first_invalid_error:
                first_invalid_error = error
            if not args.quiet_invalid_databases:
                print(
                    f"warning: skipping unmatched subtraction database glob "
                    f"{pattern}: no files matched",
                    file=sys.stderr,
                )
    if (
        args.ignore_invalid_databases
        and invalid_count
        and database_scan.valid_count == 0
    ):
        print(
            "error: no valid Sagelite doctest databases were scanned"
            f" ({invalid_count} invalid; first: {first_invalid_error})",
            file=sys.stderr,
        )
        return 2

    rows: list[tuple[int, int, str]] = []
    for source_path in iter_source_files(source_root, args.extensions):
        relative_path = normalize_path(str(source_path), source_root)
        if is_excluded_path(relative_path, args.excluded_path_prefixes):
            continue
        if not args.include_covered and relative_path in covered:
            continue
        if not args.include_mentioned and relative_path in mentioned:
            continue
        if relative_path in audited:
            continue

        prompt_count, runnable_prompt_count = count_sage_prompts(source_path)
        if prompt_count < args.min_prompts:
            continue
        if args.max_prompts is not None and prompt_count > args.max_prompts:
            continue
        if runnable_prompt_count < args.min_runnable_prompts:
            continue
        rows.append((prompt_count, runnable_prompt_count, relative_path))

    rows.sort(key=lambda row: (-row[0], row[2]))
    if args.limit is not None:
        rows = rows[: args.limit]

    if args.include_header:
        header = "path\tprompt_count"
        if args.include_runnable_prompts:
            header += "\trunnable_prompt_count"
        print(header)
    for prompt_count, runnable_prompt_count, relative_path in rows:
        if args.paths_only:
            print(relative_path)
        elif args.include_runnable_prompts:
            print(f"{relative_path}\t{prompt_count}\t{runnable_prompt_count}")
        else:
            print(f"{relative_path}\t{prompt_count}")
    if args.fail_on_rows and rows:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
