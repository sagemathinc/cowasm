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

cowasm_standalone_probe "ppl" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

libcxx_noeh="$("$bin_dir/wasi-sdk-clang++-next" -target wasm32-wasip1 -print-file-name=libc++.a)"
libcxxabi="${libcxx_noeh%/noeh/libc++.a}/eh/libc++abi.a"
libunwind="${libcxx_noeh%/noeh/libc++.a}/eh/libunwind.a"
if [ ! -f "$libcxxabi" ] || [ ! -f "$libunwind" ]; then
  echo "cowasm: ppl standalone smoke requires pinned wasi-sdk exception archives" >&2
  echo "  $libcxxabi" >&2
  echo "  $libunwind" >&2
  exit 77
fi

# The exception-enabled wasi-sdk output is not accepted by the wasm-opt build in
# CoWasm's bin directory. Use absolute compiler paths and keep that bin
# directory out of PATH while configure, make, and the smoke link run.
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

cd "$build_dir"
env \
  PATH="$standalone_path" \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  CC="$bin_dir/cowasm-cc" \
  CXX="$bin_dir/cowasm-c++" \
  CC_FOR_BUILD="zig cc ${ZIG_NATIVE_CFLAGS:-}" \
  CPPFLAGS="-I$gmp_dir/include -I$glpk_dir/include" \
  CFLAGS="-Oz -fPIC -fvisibility-main" \
  CXXFLAGS="-Oz -std=c++11 -fPIC -fvisibility-main" \
  LDFLAGS="-L$gmp_dir/lib -L$glpk_dir/lib -lwasi-emulated-signal" \
  LIBS="-lglpk -lsetjmp -lgmpxx -lgmp -lwasi-emulated-signal -lm" \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --disable-shared \
      --enable-static \
      --disable-documentation \
      --disable-ppl_lcdd \
      --disable-ppl_lpsol \
      --disable-ppl_pips \
      --enable-interfaces=cxx \
      --with-gmp="$gmp_dir"

find . -name Makefile -exec sed -i.bak -e 's/ -Weverything//g' {} +
sed -f ./ppl-config.sed config.h >ppl-config.h

PATH="$standalone_path" COWASM_TOOLCHAIN=wasi-sdk make -C src -j"$jobs" libppl.la
PATH="$standalone_path" COWASM_TOOLCHAIN=wasi-sdk make -C src install-libLTLIBRARIES install-includeHEADERS

test -f "$dist_dir/include/ppl.hh"
test -f "$dist_dir/lib/libppl.a"

env \
  -u MAKEFLAGS \
  -u MFLAGS \
  -u MAKELEVEL \
  -u MAKE_TERMOUT \
  -u MAKE_TERMERR \
  PATH="$standalone_path" \
  COWASM_TOOLCHAIN=wasi-sdk \
  "$bin_dir/cowasm-c++" \
  -fvisibility-main \
  -Oz \
  -std=c++11 \
  "$src_dir/test-ppl.cpp" \
  -I"$dist_dir/include" \
  -I"$gmp_dir/include" \
  -I"$glpk_dir/include" \
  -L"$dist_dir/lib" \
  -L"$glpk_dir/lib" \
  -L"$gmp_dir/lib" \
  -lppl \
  -lglpk \
  -lsetjmp \
  -lgmpxx \
  -lgmp \
  "$libcxxabi" \
  "$libunwind" \
  -lwasi-emulated-signal \
  -lm \
  -o "$probe_dir/ppl-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/ppl-test" |
  grep -F "ppl-ok poly-max=18/1 poly-min=-14/1 mip-max=25/1 hull=contains minimized-generators=checked"
