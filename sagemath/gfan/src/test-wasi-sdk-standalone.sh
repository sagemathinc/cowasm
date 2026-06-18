#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 5 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR GMP_DIR CDDLIB_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
gmp_dir="$(cd "$4" && pwd)"
cddlib_dir="$(cd "$5" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "gfan" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

rm -rf "$dist_dir"
mkdir -p "$dist_dir/bin"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -Oz \
  -c "$src_dir/cowasm-system-stub.c" \
  -o "$probe_dir/cowasm-system-stub.o"

clangxx="$bin_dir/wasi-sdk-clang++-next"
libcxx_noeh="$("$clangxx" -target wasm32-wasip1 -print-file-name=libc++.a)"
libcxx="${libcxx_noeh%/noeh/libc++.a}/eh/libc++.a"
libcxxabi="${libcxx_noeh%/noeh/libc++.a}/eh/libc++abi.a"
libunwind="${libcxx_noeh%/noeh/libc++.a}/eh/libunwind.a"
if [ ! -f "$libcxx" ] || [ ! -f "$libcxxabi" ] || [ ! -f "$libunwind" ]; then
  echo "cowasm: gfan standalone smoke requires pinned wasi-sdk exception archives" >&2
  echo "  $libcxx" >&2
  echo "  $libcxxabi" >&2
  echo "  $libunwind" >&2
  exit 77
fi
build_log="$probe_dir/gfan-build.log"

cd "$build_dir"
set +e
env COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs" \
  CC="$bin_dir/cowasm-cc" \
  CXX="$bin_dir/cowasm-c++" \
  PREFIX="$dist_dir" \
  gmppath="$gmp_dir" \
  cddpath="$cddlib_dir" \
  cddnoprefix=1 \
  CDD_INCLUDEOPTIONS="-I $cddlib_dir/include/cddlib" \
  GPROFFLAG= \
  OPTFLAGS="-DGMPRATIONAL -DNDEBUG -Oz" \
  CDD_LINKOPTIONS="$cddlib_dir/lib/libcddgmp.a" \
  GMP_LINKOPTIONS="$gmp_dir/lib/libgmp.a" \
  ADDITIONALLINKOPTIONS="$probe_dir/cowasm-system-stub.o $cddlib_dir/lib/libcddgmp.a $gmp_dir/lib/libgmp.a $libcxx $libcxxabi $libunwind -lwasi-emulated-signal -lwasi-emulated-process-clocks" \
  gfan >"$build_log" 2>&1
status=$?
set -e

if [ "$status" -ne 0 ]; then
  cat "$build_log"
  exit "$status"
fi

cp gfan "$dist_dir/bin/gfan"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/gfan" _list |
  grep -F "gfan_buchberger"

cat >"$probe_dir/buchberger.input" <<'EOF'
Q[a,b,c]
{aab-c,bbc-a,cca-b}
EOF

buchberger_log="$probe_dir/buchberger.log"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/gfan" _buchberger \
  <"$probe_dir/buchberger.input" >"$buchberger_log"
grep -F "c^15-c" "$buchberger_log"
grep -F "b-c^11" "$buchberger_log"
grep -F "a-c^9" "$buchberger_log"

env "$clangxx" \
  -target wasm32-wasip1 \
  -Oz \
  -fno-exceptions \
  -I"$build_dir/src" \
  -I"$gmp_dir/include" \
  "$src_dir/test-gfanlib-matrix.cpp" \
  -L"$gmp_dir/lib" \
  -lgmp \
  -lwasi-emulated-signal \
  -o "$probe_dir/gfanlib-matrix-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/gfanlib-matrix-test" |
  grep -F "gfanlib-matrix-ok product=68,161"

echo "gfan-ok list buchberger gfanlib-matrix"
