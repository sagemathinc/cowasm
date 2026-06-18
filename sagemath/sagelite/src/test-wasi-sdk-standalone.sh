#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 10 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR CPYTHON_WASM PY_CYTHON PY_NUMPY PY_GMPY2 CYSIGNALS_WASI_SDK MEMORY_ALLOCATOR_WASI_SDK POSIX_WASI_SDK" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
cpython_wasm="$(cd "$4" && pwd)"
py_cython="$(cd "$5" && pwd)"
py_numpy="$(cd "$6" && pwd)"
py_gmpy2="$(cd "$7" && pwd)"
cysignals_wasi_sdk="$(cd "$8" && pwd)"
memory_allocator_wasi_sdk="$(cd "$9" && pwd)"
posix_wasi_sdk="$(cd "${10}" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "sagelite" wasi-sdk "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir" "$build_dir/cowasm-meson-build" "$probe_dir/pkgconfig"

status_file="$dist_dir/status.txt"
log_file="$dist_dir/meson-setup.log"

record_blocker() {
  local message="$1"
  printf '%s\n' "$message" | tee "$status_file"
  exit 77
}

if ! command -v meson >/dev/null 2>&1; then
  record_blocker "sagelite-blocked: host meson is not available on PATH; package meson for the CoWasm Sagelite build-system probe."
fi

if ! command -v ninja >/dev/null 2>&1; then
  record_blocker "sagelite-blocked: ninja is not available on PATH; package or install ninja for the CoWasm Sagelite build-system probe."
fi

pythonpath_parts=(
  "$cysignals_wasi_sdk"
  "$memory_allocator_wasi_sdk"
  "$py_gmpy2"
  "$py_numpy"
  "$py_cython"
)
pythonpath="$(IFS=:; echo "${pythonpath_parts[*]}")"

pkg_config_paths=()
for pkg_dir in \
  "$repo_dir/sagemath/gmp/dist/wasi-sdk" \
  "$repo_dir/sagemath/mpfr/dist/wasi-sdk" \
  "$repo_dir/sagemath/mpc/dist/wasi-sdk" \
  "$repo_dir/sagemath/pari/dist/wasi-sdk" \
  "$repo_dir/sagemath/gsl/dist/wasi-sdk" \
  "$repo_dir/sagemath/flint/dist/wasi-sdk" \
  "$repo_dir/sagemath/m4ri/dist/wasi-sdk" \
  "$repo_dir/sagemath/m4rie/dist/wasi-sdk" \
  "$repo_dir/sagemath/eclib/dist/wasi-sdk" \
  "$repo_dir/sagemath/fflas-ffpack/dist/wasi-sdk" \
  "$repo_dir/sagemath/givaro/dist/wasi-sdk" \
  "$repo_dir/sagemath/linbox/dist/wasi-sdk" \
  "$repo_dir/core/zlib/dist/wasi-sdk" \
  "$repo_dir/core/libpng/dist/wasi-sdk"
do
  if [ -d "$pkg_dir/lib/pkgconfig" ]; then
    pkg_config_paths+=("$pkg_dir/lib/pkgconfig")
  fi
done
pkg_config_path="$(IFS=:; echo "${pkg_config_paths[*]}")"

cross_file="$probe_dir/cowasm-wasi.ini"
pkg_config="$src_dir/cowasm-pkg-config.py"
cat >"$cross_file" <<EOF
[binaries]
c = '$bin_dir/wasi-sdk-clang-next'
cpp = '$bin_dir/wasi-sdk-clang++-next'
ar = '$bin_dir/wasi-sdk-llvm-ar-next'
strip = '$bin_dir/wasi-sdk-llvm-strip-next'
pkg-config = '$pkg_config'
python = '$bin_dir/python-wasm'

[host_machine]
system = 'wasi'
cpu_family = 'wasm32'
cpu = 'wasm32'
endian = 'little'

[built-in options]
c_args = ['-target', 'wasm32-wasip1', '-fPIC', '-D_SCHED_H', '-I$cpython_wasm/include/python3.14', '-I$posix_wasi_sdk']
cpp_args = ['-target', 'wasm32-wasip1', '-fPIC', '-D_SCHED_H', '-I$cpython_wasm/include/python3.14', '-I$posix_wasi_sdk']
c_link_args = ['-target', 'wasm32-wasip1', '-shared', '-nostdlib', '-Wl,--allow-undefined', '-Wl,--no-entry']
cpp_link_args = ['-target', 'wasm32-wasip1', '-shared', '-nostdlib', '-Wl,--allow-undefined', '-Wl,--no-entry']
EOF

set +e
PYTHONPATH="$pythonpath" \
PKG_CONFIG_PATH="$pkg_config_path" \
PKG_CONFIG_LIBDIR="$pkg_config_path" \
PKG_CONFIG="$pkg_config" \
  meson setup \
    "$build_dir/cowasm-meson-build" \
    "$build_dir" \
    --cross-file "$cross_file" \
    --prefix "$dist_dir" \
    --default-library=static \
    -Dbuild-docs=false \
    -Dbliss=disabled \
    -Dbrial=disabled \
    -Dcoxeter3=disabled \
    -Declib=disabled \
    -Dlibbraiding=disabled \
    -Dlibhomfly=disabled \
    -Dmcqd=disabled \
    -Drankwidth=disabled \
    -Dsirocco=disabled \
    -Dtdlib=disabled \
    >"$log_file" 2>&1
meson_status=$?
set -e

if [ "$meson_status" -ne 0 ]; then
  tail -80 "$log_file" >&2
  record_blocker "sagelite-blocked: meson setup failed; see $log_file for the first configure blocker."
fi

PYTHONPATH="$pythonpath" \
PKG_CONFIG_PATH="$pkg_config_path" \
PKG_CONFIG_LIBDIR="$pkg_config_path" \
PKG_CONFIG="$pkg_config" \
  meson compile -C "$build_dir/cowasm-meson-build"

PYTHONPATH="$pythonpath" \
PKG_CONFIG_PATH="$pkg_config_path" \
PKG_CONFIG_LIBDIR="$pkg_config_path" \
PKG_CONFIG="$pkg_config" \
  meson install -C "$build_dir/cowasm-meson-build" --destdir "$dist_dir/stage"

echo "sagelite-ok meson configure compile install" | tee "$status_file"
