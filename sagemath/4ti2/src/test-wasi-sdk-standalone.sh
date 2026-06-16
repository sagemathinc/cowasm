#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 5 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR GMP_DIR GLPK_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
gmp_dir="$(cd "$4" && pwd)"
glpk_dir="$(cd "$5" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "4ti2" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

libcxx_noeh="$("$bin_dir/wasi-sdk-clang++-next" -target wasm32-wasip1 -print-file-name=libc++.a)"
libcxx="${libcxx_noeh%/noeh/libc++.a}/eh/libc++.a"
libcxxabi="${libcxx_noeh%/noeh/libc++.a}/eh/libc++abi.a"
libunwind="${libcxx_noeh%/noeh/libc++.a}/eh/libunwind.a"
if [ ! -f "$libcxx" ] || [ ! -f "$libcxxabi" ] || [ ! -f "$libunwind" ]; then
  echo "cowasm: 4ti2 standalone smoke requires pinned wasi-sdk exception archives" >&2
  echo "  $libcxx" >&2
  echo "  $libcxxabi" >&2
  echo "  $libunwind" >&2
  exit 77
fi

# The exception-enabled wasi-sdk output is not accepted by the wasm-opt build in
# CoWasm's bin directory. Use absolute compiler paths and keep that bin
# directory out of PATH while configure and make run.
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
mkdir -p "$dist_dir/bin" "$dist_dir/lib"

cd "$build_dir"

env \
  PATH="$standalone_path" \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  CC="$bin_dir/cowasm-cc" \
  CXX="$bin_dir/cowasm-c++" \
  CPPFLAGS="-I$gmp_dir/include -I$glpk_dir/include" \
  CFLAGS="-Oz -fvisibility-main" \
  CXXFLAGS="-Oz -fvisibility-main" \
  LDFLAGS="-L$gmp_dir/lib -L$glpk_dir/lib -lwasi-emulated-signal -lwasi-emulated-process-clocks" \
  LIBS="-lglpk -lgmpxx -lgmp -lm $libcxx $libcxxabi $libunwind" \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --with-gmp="$gmp_dir" \
      --with-glpk="$glpk_dir" \
      --disable-shared \
      --enable-static \
      --disable-swig

PATH="$standalone_path" COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs"
PATH="$standalone_path" COWASM_TOOLCHAIN=wasi-sdk make install

test -f "$dist_dir/bin/4ti2gmp"
test -f "$dist_dir/bin/zsolve"
test -f "$dist_dir/lib/lib4ti2gmp.a"
test -f "$dist_dir/lib/libzsolve.a"
test -f "$dist_dir/include/4ti2/4ti2.h"

mkdir -p "$probe_dir/groebner" "$probe_dir/hilbert"
cp "$build_dir/test/groebner/4coins."* "$probe_dir/groebner/"
cp "$build_dir/test/hilbert/33."* "$probe_dir/hilbert/"

cowasm_clang_standalone_run_wasi \
  "$bin_dir" "$dist_dir/bin/4ti2gmp" groebner "$probe_dir/groebner/4coins"
cmp "$probe_dir/groebner/4coins.gro" "$build_dir/test/groebner/4coins.gro.chk"

cowasm_clang_standalone_run_wasi \
  "$bin_dir" "$dist_dir/bin/zsolve" -H "$probe_dir/hilbert/33"
cmp "$probe_dir/hilbert/33.hil" "$build_dir/test/hilbert/33.hil.chk"

echo "4ti2-ok groebner-4coins hilbert-33 gmp glpk"
