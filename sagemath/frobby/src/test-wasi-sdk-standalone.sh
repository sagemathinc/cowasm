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

cowasm_standalone_probe "frobby" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

default_libcxxabi="$("$bin_dir/wasi-sdk-clang++-next" -target wasm32-wasip1 -print-file-name=libc++abi.a)"
libcxxabi="${default_libcxxabi%/noeh/libc++abi.a}/eh/libc++abi.a"
libunwind="${default_libcxxabi%/noeh/libc++abi.a}/eh/libunwind.a"
if [ ! -f "$libcxxabi" ] || [ ! -f "$libunwind" ]; then
  echo "cowasm: frobby standalone smoke requires pinned wasi-sdk exception archives" >&2
  echo "  $libcxxabi" >&2
  echo "  $libunwind" >&2
  exit 77
fi

rm -rf "$dist_dir"
mkdir -p "$dist_dir/bin"

(
  cd "$build_dir"
  env COWASM_TOOLCHAIN=wasi-sdk make MODE=release -j"$jobs" bin/release/frobby \
    CXX="$bin_dir/cowasm-c++" \
    CXXFLAGS="-D_WASI_EMULATED_GETPID" \
    GMP_INC_DIR="$gmp_dir/include" \
    ldflags="-L$gmp_dir/lib -lgmpxx -lgmp -lwasi-emulated-getpid -lwasi-emulated-signal -lwasi-emulated-process-clocks $libcxxabi $libunwind" \
    STRIP=true
)

cp "$build_dir/bin/release/frobby" "$dist_dir/bin/"

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/frobby" help \
  >"$probe_dir/help.out" 2>&1 || true
grep -F "Frobby version 0.9.9" "$probe_dir/help.out"

cat >"$probe_dir/input.ideal" <<'EOF'
vars x, y, z;
[
 x^3,
 x^2*y,
 x*y^2,
 y^3,
 x^2*z
];
EOF

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/frobby" \
  irrdecom -encode on -canon <"$probe_dir/input.ideal" >"$probe_dir/irrdecom.out"

grep -F "x^3*y*z" "$probe_dir/irrdecom.out"
grep -F "x^2*y^2" "$probe_dir/irrdecom.out"
grep -F "x*y^3" "$probe_dir/irrdecom.out"

echo "frobby-ok version irrdecom"
