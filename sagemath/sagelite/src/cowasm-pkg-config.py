#!/usr/bin/env python3
import os
import re
import shlex
import sys
from pathlib import Path


VERSION_RE = re.compile(r"^\s*([A-Za-z0-9_.+-]+)\s*(?:(>=|<=|=|>|<)\s*([^\s,]+))?")


class Package:
    def __init__(self, name, path):
        self.name = name
        self.path = path
        self.vars = {}
        self.fields = {}
        self._read()

    def _read(self):
        for raw_line in self.path.read_text().splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            if ":" in line:
                key, value = line.split(":", 1)
                self.fields[key.strip()] = self.expand(value.strip())
            elif "=" in line:
                key, value = line.split("=", 1)
                self.vars[key.strip()] = self.expand(value.strip())

    def expand(self, value):
        previous = None
        while value != previous:
            previous = value
            for key, replacement in self.vars.items():
                value = value.replace("${" + key + "}", replacement)
        return value

    def requires(self, static):
        values = [self.fields.get("Requires", "")]
        if static:
            values.append(self.fields.get("Requires.private", ""))
        return parse_requires(" ".join(values))

    def flags(self, key, static):
        values = [self.fields.get(key, "")]
        if static and key == "Libs":
            values.append(self.fields.get("Libs.private", ""))
        return shlex.split(" ".join(values))


def search_paths():
    raw = os.environ.get("PKG_CONFIG_LIBDIR") or os.environ.get("PKG_CONFIG_PATH") or ""
    return [Path(p) for p in raw.split(os.pathsep) if p]


def find_pc(name):
    pc_name = name if name.endswith(".pc") else name + ".pc"
    for directory in search_paths():
        path = directory / pc_name
        if path.exists():
            return path
    return None


def parse_requires(value):
    packages = []
    for part in value.replace(",", " ").split():
        if part in {">=", "<=", "=", ">", "<"}:
            continue
        if re.match(r"^[0-9]", part):
            continue
        match = VERSION_RE.match(part)
        if match:
            packages.append(match.group(1))
    return packages


def version_tuple(value):
    return tuple(int(part) if part.isdigit() else part for part in re.split(r"[.+_-]", value))


def version_ok(found, op, expected):
    if not op:
        return True
    left = version_tuple(found)
    right = version_tuple(expected)
    if op == ">=":
        return left >= right
    if op == "<=":
        return left <= right
    if op == "=":
        return left == right
    if op == ">":
        return left > right
    if op == "<":
        return left < right
    return False


def resolve(name, static, seen=None):
    seen = seen or set()
    if name in seen:
        return []
    path = find_pc(name)
    if path is None:
        raise FileNotFoundError(name)
    seen.add(name)
    package = Package(name, path)
    packages = [package]
    for dep in package.requires(static):
        packages.extend(resolve(dep, static, seen))
    return packages


def unique(items):
    result = []
    for item in items:
        if item not in result:
            result.append(item)
    return result


def split_args(argv):
    opts = []
    packages = []
    constraints = {}
    skip_next = False
    for index, arg in enumerate(argv):
        if skip_next:
            skip_next = False
            continue
        if arg.startswith("-"):
            opts.append(arg)
            if arg in {"--atleast-version", "--exact-version", "--max-version"}:
                if index + 1 < len(argv):
                    opts.append(argv[index + 1])
                    skip_next = True
            continue
        match = VERSION_RE.match(arg)
        if not match:
            packages.append(arg)
            continue
        name, op, version = match.groups()
        packages.append(name)
        if op and version:
            constraints[name] = (op, version)
    return opts, packages, constraints


def main(argv):
    if not argv:
        return 1
    if argv[0] == "--version":
        print("0.29.2")
        return 0
    if argv[0] == "--atleast-pkgconfig-version":
        return 0

    opts, names, constraints = split_args(argv)
    static = "--static" in opts
    try:
        packages = []
        for name in names:
            resolved = resolve(name, static)
            package = resolved[0]
            if name in constraints:
                op, expected = constraints[name]
                if not version_ok(package.fields.get("Version", "0"), op, expected):
                    return 1
            packages.extend(resolved)
    except FileNotFoundError as err:
        if "--print-errors" in opts:
            print(f"Package {err} was not found", file=sys.stderr)
        return 1

    if "--exists" in opts:
        return 0
    if "--modversion" in opts:
        print(packages[0].fields.get("Version", ""))
        return 0

    variable = next((opt.split("=", 1)[1] for opt in opts if opt.startswith("--variable=")), None)
    if variable:
        print(packages[0].vars.get(variable, ""))
        return 0

    flags = []
    if any(opt.startswith("--cflags") for opt in opts):
        flags.extend(flag for package in packages for flag in package.flags("Cflags", static))
    if any(opt.startswith("--libs") for opt in opts):
        flags.extend(flag for package in packages for flag in package.flags("Libs", static))

    if "--libs-only-l" in opts:
        flags = [flag for flag in flags if flag.startswith("-l")]
    elif "--libs-only-L" in opts:
        flags = [flag for flag in flags if flag.startswith("-L")]
    elif "--libs-only-other" in opts:
        flags = [flag for flag in flags if not flag.startswith(("-l", "-L"))]
    elif "--cflags-only-I" in opts:
        flags = [flag for flag in flags if flag.startswith("-I")]

    if flags:
        print(" ".join(unique(flags)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
