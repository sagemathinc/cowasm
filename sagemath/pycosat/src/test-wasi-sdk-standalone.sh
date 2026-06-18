#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 5 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR CPYTHON_WASM POSIX_WASI_SDK" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
cpython_wasm="$(cd "$4" && pwd)"
posix_wasi_sdk="$(cd "$5" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "pycosat" wasi-sdk "$bin_dir" "$probe_dir"

python_include="$cpython_wasm/include/python3.14"
extension_suffix=".cpython-314-wasm32-wasi.so"

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

"$bin_dir/wasi-sdk-clang-next" -target wasm32-wasip1 \
  -Oz \
  -fPIC \
  -D_SCHED_H \
  -DNGETRUSAGE \
  -shared \
  -nostdlib \
  -Wl,--allow-undefined \
  -Wl,--no-entry \
  -Wl,--export=PyInit_pycosat \
  -I"$python_include" \
  -I"$posix_wasi_sdk" \
  "$build_dir/pycosat.c" \
  -o "$dist_dir/pycosat$extension_suffix"

"$bin_dir/wasi-sdk-llvm-objdump-next" -h "$dist_dir/pycosat$extension_suffix" |
  grep 'dylink\.0'
"$bin_dir/wasi-sdk-llvm-nm-next" "$dist_dir/pycosat$extension_suffix" |
  grep ' T PyInit_pycosat$'

cd "$probe_dir"
PYTHONPATH="$dist_dir" "$bin_dir/python-wasm" - <<'PY'
import pycosat

cnf = [[1, -5, 4], [-1, 5, 3, 4], [-3, -4]]
solution = pycosat.solve(cnf)
assert isinstance(solution, list), solution
assert all(any(lit in solution for lit in clause) for clause in cnf)
assert len(list(pycosat.itersolve(cnf))) == 18
assert pycosat.solve((tuple(clause) for clause in cnf), vars=7) == [
    1,
    -2,
    -3,
    -4,
    5,
    -6,
    -7,
]

assert pycosat.solve([[1], [-1]]) == "UNSAT"
assert pycosat.solve([[1, 2, 3], [-1, -2]], prop_limit=1) == "UNKNOWN"

try:
    pycosat.solve([[1, 0]])
except ValueError:
    pass
else:
    raise AssertionError("zero literal should raise ValueError")

assert pycosat.solve([[1]]) == [1]


def var(row, col):
    return row * 4 + col + 1


def exactly_one(literals):
    clauses = [literals[:]]
    for i, left in enumerate(literals):
        for right in literals[i + 1 :]:
            clauses.append([-left, -right])
    return clauses


queens = []
for row in range(4):
    queens.extend(exactly_one([var(row, col) for col in range(4)]))
for col in range(4):
    queens.extend(exactly_one([var(row, col) for row in range(4)]))
for row in range(4):
    for col in range(4):
        current = var(row, col)
        for next_row in range(row + 1, 4):
            delta = next_row - row
            for next_col in (col - delta, col + delta):
                if 0 <= next_col < 4:
                    queens.append([-current, -var(next_row, next_col)])

queen_solutions = list(pycosat.itersolve(queens, vars=16))
assert len(queen_solutions) == 2, queen_solutions
for queen_solution in queen_solutions:
    assignment = set(queen_solution)
    placed = {literal for literal in queen_solution if literal > 0}
    assert len(placed) == 4, queen_solution
    assert all(any(literal in assignment for literal in clause) for clause in queens)
PY

echo "pycosat-ok solve itersolve unsat unknown vars errors queens"
