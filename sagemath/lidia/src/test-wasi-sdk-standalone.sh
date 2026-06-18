#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR GMP_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
gmp_dir="$(cd "$4" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "lidia" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

default_libcxxabi="$("$bin_dir/wasi-sdk-clang++-next" -target wasm32-wasip1 -print-file-name=libc++abi.a)"
libcxxabi="${default_libcxxabi%/noeh/libc++abi.a}/eh/libc++abi.a"
libunwind="${default_libcxxabi%/noeh/libc++abi.a}/eh/libunwind.a"
if [ ! -f "$libcxxabi" ] || [ ! -f "$libunwind" ]; then
  echo "cowasm: lidia standalone smoke requires pinned wasi-sdk exception archives" >&2
  echo "  $libcxxabi" >&2
  echo "  $libunwind" >&2
  exit 77
fi

# The exception-enabled wasi-sdk C++ output is not accepted by the wasm-opt
# build in CoWasm's bin directory. Use absolute compiler paths and keep that
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

# Fixes needed before configuring for WASI:
# - a typo in factorization stream loading
# - deterministic WASI random seeding without getpid/getppid
perl -0pi -e 's/filenmae/filename/g' \
  "$build_dir/src/base/simple_classes/factorization/file_f.cc"
perl -0pi -e 's/unsigned int[ \t]+s;/unsigned int s = 1;/; s/\n\ts \^= static_cast<unsigned int>\(getpid\(\)\);\n\ts \^= static_cast<unsigned int>\(getppid\(\)\);//' \
  "$build_dir/src/base/system/random_generator.cc"

cd "$build_dir"
env \
  PATH="$standalone_path" \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  NM="$bin_dir/wasi-sdk-llvm-nm-next" \
  CC="$bin_dir/cowasm-cc" \
  CXX="$bin_dir/cowasm-c++" \
  CFLAGS="-Oz -fvisibility-main" \
  CXXFLAGS="-Oz -fvisibility-main -std=c++11" \
  CPPFLAGS="-I$gmp_dir/include" \
  LDFLAGS="-L$gmp_dir/lib -lwasi-emulated-signal" \
  LIBS="-lwasi-emulated-signal" \
  lidia_cv_iso_namespaces=yes \
  COWASM_TOOLCHAIN=wasi-sdk \
  ./configure \
    --build=i686-pc-linux-gnu \
    --host=none \
    --prefix="$dist_dir" \
    --with-arithmetic=gmp \
    --with-extra-includes="$gmp_dir/include" \
    --with-extra-libs="$gmp_dir/lib" \
    --disable-shared \
    --enable-static

# The generated build rule creates and runs a target WASI helper. Build that
# generator with the host compiler instead.
perl -0pi -e 's#\$\((?:LIDIA_CONFIG_INCLUDEDIR)\)/bytes_to_int_flag\.h: bytes_to_int_flag_generator\$\((?:EXEEXT)\)\n\t\./bytes_to_int_flag_generator > \$@#\$(LIDIA_CONFIG_INCLUDEDIR)/bytes_to_int_flag.h: \$(LIDIA_PORTAB_SRCDIR)/bytes_to_int_flag_generator.cc\n\t\$(CXX_FOR_BUILD) -I../../include -I../../src/base/include ../../src/portability/bytes_to_int_flag_generator.cc -o bytes_to_int_flag_generator_host\n\t./bytes_to_int_flag_generator_host > \$@#' \
  library/base/Makefile

cxx_for_build="${CXX_FOR_BUILD:-g++}"
PATH="$standalone_path" COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs" CXX_FOR_BUILD="$cxx_for_build"
PATH="$standalone_path" COWASM_TOOLCHAIN=wasi-sdk make install CXX_FOR_BUILD="$cxx_for_build"

ln -sfn lidia "$dist_dir/include/LiDIA"
test -f "$dist_dir/lib/libLiDIA.a"
test -f "$dist_dir/include/lidia/bigint.h"
test -L "$dist_dir/include/LiDIA"

cd "$repo_dir"
link_log="$probe_dir/lidia-link.log"
set +e
env \
  -u MAKEFLAGS \
  -u MFLAGS \
  -u MAKELEVEL \
  -u MAKE_TERMOUT \
  -u MAKE_TERMERR \
  PATH="$standalone_path" \
  COWASM_TOOLCHAIN=wasi-sdk \
  "$bin_dir/cowasm-c++" \
  -Oz \
  -std=c++11 \
  -Wno-nonportable-include-path \
  -I"$dist_dir/include" \
  -I"$gmp_dir/include" \
  "$src_dir/test-lidia.cpp" \
  -L"$dist_dir/lib" \
  -L"$gmp_dir/lib" \
  -lLiDIA \
  -lgmp \
  "$libcxxabi" \
  "$libunwind" \
  -lwasi-emulated-signal \
  -o "$probe_dir/lidia-test" >"$link_log" 2>&1
link_status=$?
set -e
if [ "$link_status" -ne 0 ]; then
  echo "cowasm: LiDIA smoke link failed" >&2
  echo "  cwd: $PWD" >&2
  echo "  output: $probe_dir/lidia-test" >&2
  echo "  libLiDIA: $dist_dir/lib/libLiDIA.a" >&2
  cat "$link_log" >&2
  exit "$link_status"
fi

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/lidia-test" |
  grep -F "lidia-ok gcd=3 nextprime=1009 rational=29/21 mod=2 det=-1 poly-gcd=x^2-1 roots=2 snf=2,4"
