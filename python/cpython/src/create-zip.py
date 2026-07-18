#!/usr/bin/env python3
"""Create a zip archive while preserving paths relative to the working tree."""

from pathlib import Path
import sys
from zipfile import ZIP_DEFLATED, ZipFile


def archive_paths(paths):
    for path in paths:
        if path.is_dir():
            yield from (entry for entry in path.rglob("*") if entry.is_file())
        elif path.is_file():
            yield path
        else:
            raise FileNotFoundError(path)


def main():
    if len(sys.argv) < 3:
        raise SystemExit(f"usage: {sys.argv[0]} ARCHIVE PATH [PATH ...]")

    archive = Path(sys.argv[1])
    paths = [Path(name) for name in sys.argv[2:]]
    with ZipFile(archive, "w", compression=ZIP_DEFLATED) as output:
        for path in archive_paths(paths):
            output.write(path, path.as_posix())


if __name__ == "__main__":
    main()
