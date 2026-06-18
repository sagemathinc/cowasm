#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
case "$2" in
  /*) dist_dir="$2" ;;
  *) dist_dir="$(pwd)/$2" ;;
esac
bin_dir="$(cd "$3" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "lie" wasi-sdk "$bin_dir" "$probe_dir"

if ! command -v bison >/dev/null; then
  echo "Skipping lie wasi-sdk standalone smoke: bison is required to generate parser.c." >&2
  exit 77
fi

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

# Raw wasi-sdk clang may run wasm-opt after linking at -Oz. Keep CoWasm's
# bin directory out of PATH when invoking the standalone compiler.
standalone_path=""
IFS=:
for path_entry in $PATH; do
  path_entry_real="$(cd "${path_entry:-.}" 2>/dev/null && pwd || true)"
  if [ "$path_entry_real" = "$bin_dir" ]; then
    continue
  fi
  if [ -z "$standalone_path" ]; then
    standalone_path="$path_entry"
  else
    standalone_path="$standalone_path:$path_entry"
  fi
done
unset IFS

rm -rf "$dist_dir"
mkdir -p "$dist_dir/bin"

sjlj_flags="-mllvm -wasm-enable-sjlj -mllvm -wasm-use-legacy-eh=false"
common_flags=(
  -target wasm32-wasip1
  -ansi
  -I"$build_dir"
  -I"$build_dir/box"
  -Oz
  -D_POSIX_C_SOURCE=200809L
  -D_WASI_EMULATED_SIGNAL
  -DL_tmpnam=64
  -Wno-deprecated-non-prototype
  -Wno-deprecated-declarations
  -Wno-dangling-else
  -Wno-format
  -Wno-non-literal-null-conversion
  $sjlj_flags
)
non_ansi_flags=(
  -target wasm32-wasip1
  -I"$build_dir"
  -I"$build_dir/box"
  -Oz
  -D_POSIX_C_SOURCE=200809L
  -D_WASI_EMULATED_SIGNAL
  -DL_tmpnam=64
  -Wno-deprecated-non-prototype
  -Wno-deprecated-declarations
  -Wno-dangling-else
  -Wno-format
  -Wno-non-literal-null-conversion
  $sjlj_flags
)

cd "$build_dir"
bison -d --output-file=parser.c parser.y

env PATH="$standalone_path" COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs" -C box \
  CC="$bin_dir/wasi-sdk-clang-next" \
  all-C-flags="${common_flags[*]}" \
  all
env PATH="$standalone_path" COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs" -C static \
  CC="$bin_dir/wasi-sdk-clang-next" \
  all-C-flags="${common_flags[*]}" \
  all

env PATH="$standalone_path" COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs" \
  CC="$bin_dir/wasi-sdk-clang-next" \
  all-C-flags="${common_flags[*]}" \
  non-ansi-flags="${non_ansi_flags[*]}" \
  lexer.o parser.o non-ANSI.o bigint.o binmat.o creatop.o gettype.o \
  getvalue.o init.o learn.o main.o mem.o node.o onoff.o output.o poly.o \
  sym.o print.o

env PATH="$standalone_path" "$bin_dir/wasi-sdk-clang-next" "${common_flags[@]}" -c getl.c -o getl.o
env PATH="$standalone_path" "$bin_dir/wasi-sdk-clang-next" "${common_flags[@]}" -c date.c -o date.o
env PATH="$standalone_path" "$bin_dir/wasi-sdk-clang-next" -target wasm32-wasip1 -Oz \
  -D_POSIX_C_SOURCE=200809L \
  -c "$src_dir/cowasm-wasi-compat.c" \
  -o "$probe_dir/cowasm-wasi-compat.o"

env PATH="$standalone_path" "$bin_dir/wasi-sdk-clang-next" \
  -target wasm32-wasip1 \
  -Oz \
  -D_POSIX_C_SOURCE=200809L \
  -D_WASI_EMULATED_SIGNAL \
  -I"$build_dir" \
  -I"$build_dir/box" \
  -o "$dist_dir/bin/Lie" \
  lexer.o parser.o non-ANSI.o bigint.o binmat.o creatop.o gettype.o \
  getvalue.o init.o learn.o main.o mem.o node.o onoff.o output.o poly.o \
  sym.o print.o getl.o date.o "$probe_dir/cowasm-wasi-compat.o" \
  static/*.o box/*.o \
  -lsetjmp \
  -lwasi-emulated-signal

lie_log="$probe_dir/lie.log"
printf 'diagram(A2)\nCartan(A2)\n[1,0]*[0,1]\nquit\n' |
  cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/Lie" >"$lie_log"

grep -F "LiE version 2.2.2" "$lie_log"
grep -F "O---O" "$lie_log"
grep -F "A2" "$lie_log"
grep -F "[[ 2,-1]" "$lie_log"
grep -F "[-1, 2]" "$lie_log"
grep -F ">      0" "$lie_log"

echo "lie-ok diagram cartan tensor-product"
