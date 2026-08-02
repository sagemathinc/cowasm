#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 31 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR CPYTHON_WASM PY_CYTHON PY_NUMPY PY_GMPY2 PY_MPMATH PY_JINJA2 PY_MESON PY_NINJA PY_PACKAGING PY_PLATFORMDIRS PYTHON_WASM CONWAY_POLYNOMIALS_WASI_SDK PRIMECOUNTPY_WASI_SDK LRCALC_PYTHON_WASI_SDK CYSIGNALS_WASI_SDK MEMORY_ALLOCATOR_WASI_SDK POSIX_WASI_SDK LIBCXX_WASI_SDK CYPARI2_WASI_SDK LIBBRAIDING_WASI_SDK RW_WASI_SDK IML_WASI_SDK GLPK_WASI_SDK NAUTY_WASI_SDK PLANARITY_WASI_SDK BLISS_WASI_SDK TDLIB_WASI_SDK CLIQUER_WASI_SDK" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
mkdir -p "$2"
dist_dir="$(cd "$2" && pwd)"
bin_dir="$(cd "$3" && pwd)"
cpython_wasm="$(cd "$4" && pwd)"
py_cython="$(cd "$5" && pwd)"
py_numpy="$(cd "$6" && pwd)"
py_gmpy2="$(cd "$7" && pwd)"
py_mpmath="$(cd "$8" && pwd)"
py_jinja2="$(cd "$9" && pwd)"
py_meson="$(cd "${10}" && pwd)"
py_ninja="$(cd "${11}" && pwd)"
py_packaging="$(cd "${12}" && pwd)"
py_platformdirs="$(cd "${13}" && pwd)"
python_wasm="$(cd "${14}" && pwd)"
conway_polynomials_wasi_sdk="$(cd "${15}" && pwd)"
primecountpy_wasi_sdk="$(cd "${16}" && pwd)"
lrcalc_python_wasi_sdk="$(cd "${17}" && pwd)"
cysignals_wasi_sdk="$(cd "${18}" && pwd)"
memory_allocator_wasi_sdk="$(cd "${19}" && pwd)"
posix_wasi_sdk="$(cd "${20}" && pwd)"
libcxx_wasi_sdk="$(cd "${21}" && pwd)"
cypari2_wasi_sdk="$(cd "${22}" && pwd)"
libbraiding_wasi_sdk="$(cd "${23}" && pwd)"
rw_wasi_sdk="$(cd "${24}" && pwd)"
iml_wasi_sdk="$(cd "${25}" && pwd)"
glpk_wasi_sdk="$(cd "${26}" && pwd)"
nauty_wasi_sdk="$(cd "${27}" && pwd)"
planarity_wasi_sdk="$(cd "${28}" && pwd)"
bliss_wasi_sdk="$(cd "${29}" && pwd)"
tdlib_wasi_sdk="$(cd "${30}" && pwd)"
cliquer_wasi_sdk="$(cd "${31}" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

resume_standalone_build="${SAGELITE_STANDALONE_RESUME:-0}"
case "$resume_standalone_build" in
  0|1)
    ;;
  *)
    echo "SAGELITE_STANDALONE_RESUME must be 0 or 1" >&2
    exit 2
    ;;
esac

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT
tool_dir="$build_dir/.cowasm-standalone"
tool_bin_dir="$tool_dir/bin"
tool_pkgconfig_dir="$tool_dir/pkgconfig"
meson_build_dir="$build_dir/cowasm-meson-build"

meson_build_uses_stable_tools() {
  local meson_dir="$1"
  local stable_tool_dir="$2"
  local transient_tool_re='/tmp/tmp[^/]+/(bin|pkgconfig|cowasm-wasi[.]ini)'

  if [ -d "$meson_dir/meson-info" ] &&
      grep -R -F "$stable_tool_dir" "$meson_dir/meson-info" >/dev/null &&
      ! grep -R -E "$transient_tool_re" "$meson_dir/meson-info" >/dev/null; then
    return 0
  fi

  if [ -f "$meson_dir/meson-private/coredata.dat" ] &&
      grep -a -F "$stable_tool_dir" "$meson_dir/meson-private/coredata.dat" >/dev/null &&
      ! grep -a -E "$transient_tool_re" "$meson_dir/meson-private/coredata.dat" >/dev/null; then
    return 0
  fi

  return 1
}

cowasm_standalone_probe "sagelite" wasi-sdk "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
if [ "$resume_standalone_build" -eq 0 ]; then
  rm -rf "$meson_build_dir"
elif [ -f "$meson_build_dir/build.ninja" ] &&
    ! meson_build_uses_stable_tools "$meson_build_dir" "$tool_dir"; then
  rm -rf "$meson_build_dir"
fi
mkdir -p "$dist_dir" "$meson_build_dir" "$tool_bin_dir" "$tool_pkgconfig_dir"

status_file="$dist_dir/status.txt"
log_file="$dist_dir/meson-setup.log"
node_import_log="$dist_dir/node-import.log"
wasi_sdk_python_import_log="$dist_dir/wasi-sdk-python-import.log"
followups_file="$dist_dir/followups.txt"
side_module_audit_log="$dist_dir/side-module-audit.log"
node_import_timeout="${SAGELITE_NODE_IMPORT_TIMEOUT:-180s}"
electron_smoke_timeout="${SAGELITE_ELECTRON_SMOKE_TIMEOUT:-180s}"
doctest_timeout_smoke_seconds="${SAGELITE_DOCTEST_TIMEOUT_SMOKE_SECONDS:-30}"
meson_compile_jobs="${SAGELITE_MESON_COMPILE_JOBS:-4}"
cython_generate_jobs="${SAGELITE_CYTHON_GENERATE_JOBS:-1}"
cython_generate_attempts="${SAGELITE_CYTHON_GENERATE_ATTEMPTS:-10}"

if ! [[ "$meson_compile_jobs" =~ ^[1-9][0-9]*$ ]]; then
  echo "SAGELITE_MESON_COMPILE_JOBS must be a positive integer" >&2
  exit 2
fi

if ! [[ "$cython_generate_jobs" =~ ^[1-9][0-9]*$ ]]; then
  echo "SAGELITE_CYTHON_GENERATE_JOBS must be a positive integer" >&2
  exit 2
fi

if ! [[ "$cython_generate_attempts" =~ ^[1-9][0-9]*$ ]]; then
  echo "SAGELITE_CYTHON_GENERATE_ATTEMPTS must be a positive integer" >&2
  exit 2
fi

record_blocker() {
  local message="$1"
  printf '%s\n' "$message" | tee "$status_file"
  exit 77
}

sha256_file() {
  local path="$1"
  if command -v sha256sum >/dev/null; then
    sha256sum "$path" | awk '{ print $1 }'
  else
    shasum -a 256 "$path" | awk '{ print $1 }'
  fi
}

audit_wasm_side_modules() {
  local module_list="$1"
  local audit_log="$2"
  local pyinit_mode="$3"
  local blocker_message="$4"
  local success_marker="$5"
  local module_count
  local require_pyinit

  module_count="$(wc -l <"$module_list" | tr -d ' ')"
  if [ "$module_count" -eq 0 ]; then
    record_blocker "$blocker_message: no side modules found."
  fi

  : >"$audit_log"
  while IFS= read -r side_module; do
    if ! "$bin_dir/wasi-sdk-llvm-objdump-next" -h "$side_module" |
        awk '$2 == "dylink.0" { found = 1 } END { exit found ? 0 : 1 }'; then
      printf '%s: missing dylink.0 section\n' "$side_module" >>"$audit_log"
    fi
    case "$pyinit_mode" in
      all)
        require_pyinit=1
        ;;
      cpython)
        case "$(basename "$side_module")" in
          *.cpython-*.so) require_pyinit=1 ;;
          *) require_pyinit=0 ;;
        esac
        ;;
      *)
        echo "unknown pyinit audit mode: $pyinit_mode" >&2
        exit 2
        ;;
    esac
    if [ "$require_pyinit" -eq 1 ] &&
        ! "$bin_dir/wasi-sdk-llvm-nm-next" --defined-only "$side_module" |
          awk '$2 == "T" && $3 ~ /^PyInit_/ { found = 1 } END { exit found ? 0 : 1 }'; then
      printf '%s: missing PyInit_* export\n' "$side_module" >>"$audit_log"
    fi
    if "$bin_dir/wasi-sdk-llvm-strings-next" "$side_module" |
        awk '$0 == "needed_dynlibs" { found = 1 } END { exit found ? 0 : 1 }'; then
      printf '%s: records needed_dynlibs\n' "$side_module" >>"$audit_log"
    fi
  done <"$module_list"

  python3 - "$module_list" >>"$audit_log" 2>&1 <<'PY'
import sys
from pathlib import Path


def read_uleb(data, offset):
    result = 0
    shift = 0
    while True:
        byte = data[offset]
        offset += 1
        result |= (byte & 0x7F) << shift
        if byte & 0x80 == 0:
            return result, offset
        shift += 7


def read_name(data, offset):
    size, offset = read_uleb(data, offset)
    return data[offset:offset + size].decode(), offset + size


def imports_memory(path):
    data = path.read_bytes()
    if data[:4] != b"\0asm":
        return False

    offset = 8
    while offset < len(data):
        section_id = data[offset]
        offset += 1
        section_size, offset = read_uleb(data, offset)
        section_end = offset + section_size
        if section_id != 2:
            offset = section_end
            continue

        import_count, offset = read_uleb(data, offset)
        for _ in range(import_count):
            _, offset = read_name(data, offset)
            _, offset = read_name(data, offset)
            kind = data[offset]
            offset += 1
            if kind == 0:  # function
                _, offset = read_uleb(data, offset)
            elif kind == 1:  # table
                offset += 1
                flags, offset = read_uleb(data, offset)
                _, offset = read_uleb(data, offset)
                if flags & 1:
                    _, offset = read_uleb(data, offset)
            elif kind == 2:  # memory
                return True
            elif kind == 3:  # global
                offset += 2
            else:
                return False
        return False
    return False


missing_memory_imports = []
for line in Path(sys.argv[1]).read_text().splitlines():
    side_module = Path(line)
    if not imports_memory(side_module):
        missing_memory_imports.append(side_module)

for side_module in missing_memory_imports:
    print(f"{side_module}: missing imported memory")

sys.exit(1 if missing_memory_imports else 0)
PY

  if [ -s "$audit_log" ]; then
    tail -120 "$audit_log" >&2
    record_blocker "$blocker_message; see $audit_log."
  fi

  printf '%s %s modules\n' "$success_marker" "$module_count" >"$audit_log"
}

cat >"$tool_bin_dir/meson" <<EOF
#!/usr/bin/env bash
set -euo pipefail
export PYTHONPATH="$py_meson\${PYTHONPATH:+:\$PYTHONPATH}"
exec python3 -m mesonbuild.mesonmain "\$@"
EOF
chmod +x "$tool_bin_dir/meson"

cat >"$tool_bin_dir/ninja" <<EOF
#!/usr/bin/env bash
set -euo pipefail
export PYTHONPATH="$py_meson\${PYTHONPATH:+:\$PYTHONPATH}"
exec "$py_ninja/bin/ninja" "\$@"
EOF
chmod +x "$tool_bin_dir/ninja"

cat >"$tool_bin_dir/cython" <<EOF
#!/usr/bin/env bash
set -euo pipefail
export PYTHONPATH="$py_cython\${PYTHONPATH:+:\$PYTHONPATH}"
exec "$bin_dir/python-wasi-sdk" -m cython "\$@"
EOF
chmod +x "$tool_bin_dir/cython"

cat >"$tool_bin_dir/wasi-sdk-clang-next" <<EOF
#!/usr/bin/env bash
set -euo pipefail
args=()
for arg in "\$@"; do
  case "\$arg" in
    -Wl,--start-group|-Wl,--end-group|--start-group|--end-group)
      ;;
    *)
      args+=("\$arg")
      ;;
  esac
done
exec "$bin_dir/wasi-sdk-clang-next" "\${args[@]}"
EOF
chmod +x "$tool_bin_dir/wasi-sdk-clang-next"

cat >"$tool_bin_dir/wasi-sdk-clang++-next" <<EOF
#!/usr/bin/env bash
set -euo pipefail
args=()
for arg in "\$@"; do
  case "\$arg" in
    -Wl,--start-group|-Wl,--end-group|--start-group|--end-group)
      ;;
    *)
      args+=("\$arg")
      ;;
  esac
done
exec "$bin_dir/wasi-sdk-clang++-next" "\${args[@]}"
EOF
chmod +x "$tool_bin_dir/wasi-sdk-clang++-next"

export PATH="$tool_bin_dir:$PATH"

if ! command -v meson >/dev/null 2>&1; then
  record_blocker "sagelite-blocked: package-local meson wrapper is not available on PATH."
fi

if ! command -v ninja >/dev/null 2>&1; then
  record_blocker "sagelite-blocked: package-local ninja wrapper is not available on PATH."
fi

if ! command -v cython >/dev/null 2>&1; then
  record_blocker "sagelite-blocked: package-local Cython wrapper is not available on PATH."
fi

if ! command -v timeout >/dev/null 2>&1; then
  record_blocker "sagelite-blocked: host timeout command is required for bounded Node.js runtime probes."
fi

timeout_supports_foreground=0
if timeout --foreground 0 true >/dev/null 2>&1; then
  timeout_supports_foreground=1
fi

run_host_timeout() {
  if [ "$timeout_supports_foreground" -eq 1 ]; then
    timeout --foreground "$@"
  else
    timeout "$@"
  fi
}

pythonpath_parts=(
  "$cypari2_wasi_sdk"
  "$conway_polynomials_wasi_sdk"
  "$primecountpy_wasi_sdk"
  "$lrcalc_python_wasi_sdk"
  "$cysignals_wasi_sdk"
  "$memory_allocator_wasi_sdk"
  "$py_jinja2"
  "$py_packaging"
  "$py_platformdirs"
  "$py_gmpy2"
  "$py_mpmath"
  "$py_numpy"
  "$py_cython"
)
pythonpath="$(IFS=:; echo "${pythonpath_parts[*]}")"

pkg_config_paths=()
pari_wasi_sdk="$repo_dir/sagemath/pari/dist/wasi-sdk"
boost_cropped_wasi_sdk="$repo_dir/sagemath/boost-cropped/dist/wasi-sdk"
gmp_wasi_sdk="$repo_dir/sagemath/gmp/dist/wasi-sdk"
mpfr_wasi_sdk="$repo_dir/sagemath/mpfr/dist/wasi-sdk"
mpfi_wasi_sdk="$repo_dir/sagemath/mpfi/dist/wasi-sdk"
ntl_wasi_sdk="$repo_dir/sagemath/ntl/dist/wasi-sdk"
gsl_wasi_sdk="$repo_dir/sagemath/gsl/dist/wasi-sdk"
m4ri_wasi_sdk="$repo_dir/sagemath/m4ri/dist/wasi-sdk"
m4rie_wasi_sdk="$repo_dir/sagemath/m4rie/dist/wasi-sdk"
libpng_wasi_sdk="$repo_dir/core/libpng/dist/wasi-sdk"
zlib_wasi_sdk="$repo_dir/core/zlib/dist/wasi-sdk"

cat >"$tool_pkgconfig_dir/cblas.pc" <<EOF
prefix=$gsl_wasi_sdk
libdir=\${prefix}/lib
includedir=\${prefix}/include

Name: cblas
Description: CoWasm BLAS provider backed by GSL CBLAS
Version: 2.8
Libs: -L\${libdir} -lgslcblas -lm
Cflags: -I\${includedir}
EOF

cp "$tool_pkgconfig_dir/cblas.pc" "$tool_pkgconfig_dir/blas.pc"

cat >"$tool_pkgconfig_dir/libpng.pc" <<EOF
prefix=$libpng_wasi_sdk
zlib_prefix=$zlib_wasi_sdk
libdir=\${prefix}/lib
includedir=\${prefix}/include
zlib_libdir=\${zlib_prefix}/lib

Name: libpng
Description: CoWasm libpng
Version: 1.6.35
Libs: -L\${libdir} -lpng -L\${zlib_libdir} -lz -lm
Cflags: -I\${includedir}
EOF

cp "$tool_pkgconfig_dir/libpng.pc" "$tool_pkgconfig_dir/png.pc"
cp "$tool_pkgconfig_dir/libpng.pc" "$tool_pkgconfig_dir/png16.pc"
pkg_config_paths+=("$tool_pkgconfig_dir")

for pkg_dir in \
  "$repo_dir/sagemath/gmp/dist/wasi-sdk" \
  "$repo_dir/sagemath/mpfr/dist/wasi-sdk" \
  "$repo_dir/sagemath/mpc/dist/wasi-sdk" \
  "$repo_dir/sagemath/mpfi/dist/wasi-sdk" \
  "$repo_dir/sagemath/gf2x/dist/wasi-sdk" \
  "$repo_dir/sagemath/ntl/dist/wasi-sdk" \
  "$libbraiding_wasi_sdk" \
  "$repo_dir/sagemath/pari/dist/wasi-sdk" \
  "$repo_dir/sagemath/gsl/dist/wasi-sdk" \
  "$repo_dir/sagemath/flint/dist/wasi-sdk" \
  "$repo_dir/sagemath/m4ri/dist/wasi-sdk" \
  "$repo_dir/sagemath/m4rie/dist/wasi-sdk" \
  "$repo_dir/sagemath/eclib/dist/wasi-sdk" \
  "$repo_dir/sagemath/fflas-ffpack/dist/wasi-sdk" \
  "$repo_dir/sagemath/givaro/dist/wasi-sdk" \
  "$repo_dir/sagemath/linbox/dist/wasi-sdk" \
  "$planarity_wasi_sdk" \
  "$cliquer_wasi_sdk" \
  "$repo_dir/core/zlib/dist/wasi-sdk" \
  "$repo_dir/core/libpng/dist/wasi-sdk"
do
  if [ -d "$pkg_dir/lib/pkgconfig" ]; then
    pkg_config_paths+=("$pkg_dir/lib/pkgconfig")
  fi
done
pkg_config_path="$(IFS=:; echo "${pkg_config_paths[*]}")"

cross_file="$tool_dir/cowasm-wasi.ini"
pkg_config="$src_dir/cowasm-pkg-config.py"
cat >"$cross_file" <<EOF
[binaries]
c = '$tool_bin_dir/wasi-sdk-clang-next'
cpp = '$tool_bin_dir/wasi-sdk-clang++-next'
ar = '$bin_dir/wasi-sdk-llvm-ar-next'
strip = '$bin_dir/wasi-sdk-llvm-strip-next'
pkg-config = '$pkg_config'
python = '$bin_dir/python-wasi-sdk'

[host_machine]
system = 'wasi'
cpu_family = 'wasm32'
cpu = 'wasm32'
endian = 'little'

[built-in options]
c_args = ['-target', 'wasm32-wasip1', '-fPIC', '-D_WASI_EMULATED_SIGNAL', '-include', '$src_dir/cowasm-fenv-compat.h', '-I$cpython_wasm/include/python3.14', '-I$posix_wasi_sdk', '-I$pari_wasi_sdk/include', '-I$boost_cropped_wasi_sdk/include', '-I$gsl_wasi_sdk/include', '-I$glpk_wasi_sdk/include', '-I$mpfr_wasi_sdk/include', '-I$mpfi_wasi_sdk/include', '-I$ntl_wasi_sdk/include', '-I$libbraiding_wasi_sdk/include', '-I$rw_wasi_sdk/include', '-I$m4ri_wasi_sdk/include', '-I$m4rie_wasi_sdk/include']
cpp_args = ['-target', 'wasm32-wasip1', '-fPIC', '-D_WASI_EMULATED_SIGNAL', '-include', '$src_dir/cowasm-fenv-compat.h', '-I$cpython_wasm/include/python3.14', '-I$posix_wasi_sdk', '-I$pari_wasi_sdk/include', '-I$boost_cropped_wasi_sdk/include', '-I$gsl_wasi_sdk/include', '-I$glpk_wasi_sdk/include', '-I$mpfr_wasi_sdk/include', '-I$mpfi_wasi_sdk/include', '-I$ntl_wasi_sdk/include', '-I$libbraiding_wasi_sdk/include', '-I$rw_wasi_sdk/include', '-I$m4ri_wasi_sdk/include', '-I$m4rie_wasi_sdk/include', '-I$bliss_wasi_sdk/include', '-I$tdlib_wasi_sdk/include']
c_link_args = ['-target', 'wasm32-wasip1', '-shared', '-nostdlib', '-Wl,--allow-undefined', '-Wl,--no-entry', '-L$pari_wasi_sdk/lib', '-L$gmp_wasi_sdk/lib', '-L$glpk_wasi_sdk/lib', '-L$libbraiding_wasi_sdk/lib', '-L$rw_wasi_sdk/lib', '-L$iml_wasi_sdk/lib', '-L$bliss_wasi_sdk/lib']
cpp_link_args = ['-target', 'wasm32-wasip1', '-shared', '-nostdlib', '-Wl,--allow-undefined', '-Wl,--no-entry', '-L$pari_wasi_sdk/lib', '-L$gmp_wasi_sdk/lib', '-L$glpk_wasi_sdk/lib', '-L$libbraiding_wasi_sdk/lib', '-L$rw_wasi_sdk/lib', '-L$iml_wasi_sdk/lib', '-L$bliss_wasi_sdk/lib']

[properties]
cowasm_libcxx = '$libcxx_wasi_sdk/libcxx.so'
EOF

if [ "$resume_standalone_build" -eq 1 ] && [ -f "$meson_build_dir/build.ninja" ]; then
  printf 'sagelite-resume: reusing existing Meson build directory %s\n' \
    "$meson_build_dir" >"$log_file"
else
  set +e
  PYTHONPATH="$pythonpath" \
  PKG_CONFIG_PATH="$pkg_config_path" \
  PKG_CONFIG_LIBDIR="$pkg_config_path" \
  PKG_CONFIG="$pkg_config" \
    meson setup \
      "$meson_build_dir" \
      "$build_dir" \
      --cross-file "$cross_file" \
      --prefix "$dist_dir" \
      --default-library=static \
      -Dbuild-docs=false \
      -Dbliss=enabled \
      -Dbrial=disabled \
      -Dcoxeter3=disabled \
      -Declib=disabled \
      -Dlibbraiding=enabled \
      -Dlibhomfly=disabled \
      -Dmcqd=disabled \
      -Drankwidth=enabled \
      -Dsirocco=disabled \
      -Dtdlib=enabled \
      >"$log_file" 2>&1
  meson_status=$?
  set -e

  if [ "$meson_status" -ne 0 ]; then
    tail -80 "$log_file" >&2
    record_blocker "sagelite-blocked: meson setup failed; see $log_file for the first configure blocker."
  fi
fi

cython_targets_file="$probe_dir/cython-targets.txt"
awk '
  /^build / && /: cython_COMPILER / {
    line = $0
    sub(/^build /, "", line)
    sub(/: cython_COMPILER .*/, "", line)
    count = split(line, outputs, " ")
    for (i = 1; i <= count; i++) {
      print outputs[i]
    }
  }
' "$meson_build_dir/build.ninja" >"$cython_targets_file"

if [ -s "$cython_targets_file" ]; then
  cython_generate_status=0
  : >"$dist_dir/meson-cython-generate.log"
  for cython_generate_attempt in $(seq 1 "$cython_generate_attempts"); do
    printf 'Sagelite Cython generation attempt %s/%s\n' \
      "$cython_generate_attempt" "$cython_generate_attempts" >>"$dist_dir/meson-cython-generate.log"
    set +e
    PYTHONPATH="$pythonpath" \
    PKG_CONFIG_PATH="$pkg_config_path" \
    PKG_CONFIG_LIBDIR="$pkg_config_path" \
    PKG_CONFIG="$pkg_config" \
      xargs ninja -j "$cython_generate_jobs" -C "$meson_build_dir" \
        <"$cython_targets_file" >>"$dist_dir/meson-cython-generate.log" 2>&1
    cython_generate_status=$?
    set -e
    if [ "$cython_generate_status" -eq 0 ]; then
      break
    fi
  done
  if [ "$cython_generate_status" -ne 0 ]; then
    tail -120 "$dist_dir/meson-cython-generate.log" >&2
    record_blocker "sagelite-blocked: meson Cython generation failed; configure succeeded, see $dist_dir/meson-cython-generate.log for the first Cython blockers."
  fi
fi

set +e
PYTHONPATH="$pythonpath" \
PKG_CONFIG_PATH="$pkg_config_path" \
PKG_CONFIG_LIBDIR="$pkg_config_path" \
PKG_CONFIG="$pkg_config" \
  meson compile -j "$meson_compile_jobs" -C "$meson_build_dir" >"$dist_dir/meson-compile.log" 2>&1
compile_status=$?
set -e
if [ "$compile_status" -ne 0 ]; then
  tail -120 "$dist_dir/meson-compile.log" >&2
  record_blocker "sagelite-blocked: meson compile failed; configure succeeded, see $dist_dir/meson-compile.log for the first compile blockers."
fi

set +e
PYTHONPATH="$pythonpath" \
PKG_CONFIG_PATH="$pkg_config_path" \
PKG_CONFIG_LIBDIR="$pkg_config_path" \
PKG_CONFIG="$pkg_config" \
  meson install -C "$meson_build_dir" --destdir "$dist_dir/stage" >"$dist_dir/meson-install.log" 2>&1
install_status=$?
set -e
if [ "$install_status" -ne 0 ]; then
  tail -120 "$dist_dir/meson-install.log" >&2
  record_blocker "sagelite-blocked: meson install failed; compile succeeded, see $dist_dir/meson-install.log for the first install blocker."
fi

installed_site_packages="$dist_dir/stage$cpython_wasm/lib/python3.14/site-packages"
if [ ! -d "$installed_site_packages/sage" ]; then
  record_blocker "sagelite-blocked: meson install did not create a Sage package under $installed_site_packages."
fi

graph_database_companion_source="$build_dir/companion-packages/sagelite-database-graphs/src/sagelite_database_graphs"
graph_database_companion_target="$installed_site_packages/sagelite_database_graphs"
graph_database_source_db="$graph_database_companion_source/data/graphs/graphs.db"
if [ ! -s "$graph_database_companion_source/__init__.py" ] ||
    [ ! -s "$graph_database_source_db" ]; then
  record_blocker "sagelite-blocked: graph database companion package is incomplete."
fi
rm -rf "$graph_database_companion_target"
mkdir -p "$graph_database_companion_target"
cp -a "$graph_database_companion_source/." "$graph_database_companion_target/"
sqlite3 "$graph_database_source_db" .dump |
  gzip -9 >"$graph_database_companion_target/data/graphs/graphs.sql.gz"
if [ ! -s "$graph_database_companion_target/data/graphs/graphs.sql.gz" ]; then
  record_blocker "sagelite-blocked: compressed graph database SQL dump is empty."
fi

disabled_side_modules_dir="$dist_dir/disabled-side-modules"
mkdir -p "$disabled_side_modules_dir"

disable_wasi_side_module() {
  local module_rel="$1"
  local module_name="$2"
  local reason="$3"
  local module_dir="$installed_site_packages/$(dirname "$module_rel")"
  local stem
  local side_module

  stem="$(basename "$module_rel")"
  side_module="$(find "$module_dir" -maxdepth 1 -type f -name "${stem}.cpython-*-wasm32-wasi.so" -print -quit)"
  if [ -z "$side_module" ]; then
    record_blocker "sagelite-blocked: expected WASI side module for $module_name was not installed."
  fi

  mkdir -p "$disabled_side_modules_dir/$(dirname "$module_rel")"
  mv "$side_module" "$disabled_side_modules_dir/$module_rel$(basename "$side_module" | sed "s/^$stem//")"
  cat >"$module_dir/$stem.py" <<PY
"""WASI runtime placeholder for an unavailable Sagelite FLINT module."""

raise ImportError("$reason")
PY
}

disable_wasi_side_module \
  "sage/rings/polynomial/polynomial_rational_flint" \
  "sage.rings.polynomial.polynomial_rational_flint" \
  "FLINT rational polynomial side module is disabled on CoWasm WASI until its initializer no longer terminates the Node.js worker"
disable_wasi_side_module \
  "sage/rings/polynomial/polynomial_zmod_flint" \
  "sage.rings.polynomial.polynomial_zmod_flint" \
  "FLINT modular polynomial side module is disabled on CoWasm WASI until its initializer no longer terminates the Node.js worker"

side_module_list="$dist_dir/sagelite-side-modules.txt"
find "$installed_site_packages/sage" -name '*.so' -type f | sort >"$side_module_list"
audit_wasm_side_modules \
  "$side_module_list" \
  "$side_module_audit_log" \
  all \
  "sagelite-blocked: installed Sage side-module audit failed" \
  "sagelite-side-module-audit-ok"

while IFS= read -r side_module; do
  if "$bin_dir/wasi-sdk-llvm-strings-next" "$side_module" |
      awk '$0 ~ /(^|[[:space:]])libcxx[.]so$/ { found = 1 } END { exit found ? 0 : 1 }'; then
    cp "$libcxx_wasi_sdk/libcxx.so" "$(dirname "$side_module")/libcxx.so"
  fi
done <"$side_module_list"

node_pythonpath_parts=(
  "$installed_site_packages"
  "${pythonpath_parts[@]}"
)
node_pythonpath="$(IFS=:; echo "${node_pythonpath_parts[*]}")"
: >"$node_import_log"
: >"$wasi_sdk_python_import_log"
node_import_index=0
wasi_sdk_python_import_index=0

run_node_import() {
  local label="$1"
  local code="$2"
  local marker="__sagelite_node_import_done_${node_import_index}__"
  local wrapped_code
  node_import_index=$((node_import_index + 1))
  printf -v wrapped_code '%s\nprint("%s")' "$code" "$marker"
  printf '## %s\n' "$label" >>"$node_import_log"
  set +e
  PYTHONPATH="$node_pythonpath" \
    run_host_timeout "$node_import_timeout" \
      node "$python_wasm/bin/python-wasm" -c "$wrapped_code" >>"$node_import_log" 2>&1
  local import_status=$?
  set -e
  if [ "$import_status" -eq 124 ]; then
    tail -120 "$node_import_log" >&2
    record_blocker "sagelite-blocked: Node.js python-wasm import timed out after $node_import_timeout at $label; see $node_import_log for the first runtime blocker."
  fi
  if [ "$import_status" -ne 0 ]; then
    if grep -Fqx "$marker" "$node_import_log"; then
      printf 'sagelite-node-warning: %s completed before Node.js python-wasm exited with status %s\n' \
        "$label" "$import_status" >>"$node_import_log"
      return
    fi
    tail -120 "$node_import_log" >&2
    record_blocker "sagelite-blocked: Node.js python-wasm import failed at $label; see $node_import_log for the first runtime blocker."
  fi
  if ! grep -Fqx "$marker" "$node_import_log"; then
    printf '## %s verbose import trace after missing marker\n' "$label" >>"$node_import_log"
    set +e
    PYTHONPATH="$node_pythonpath" \
      run_host_timeout "$node_import_timeout" \
        node "$python_wasm/bin/python-wasm" -v -c "$wrapped_code" >>"$node_import_log" 2>&1
    local verbose_status=$?
    set -e
    if [ "$verbose_status" -eq 124 ]; then
      tail -120 "$node_import_log" >&2
      record_blocker "sagelite-blocked: verbose Node.js python-wasm import timed out after $node_import_timeout at $label; see $node_import_log for the first runtime blocker."
    fi
    tail -120 "$node_import_log" >&2
    record_blocker "sagelite-blocked: Node.js python-wasm import exited before completing $label; see $node_import_log for the first runtime blocker."
  fi
}

run_wasi_sdk_python_import() {
  local label="$1"
  local code="$2"
  local marker="__sagelite_wasi_sdk_python_import_done_${wasi_sdk_python_import_index}__"
  local wrapped_code
  wasi_sdk_python_import_index=$((wasi_sdk_python_import_index + 1))
  printf -v wrapped_code '%s\nprint("%s")' "$code" "$marker"
  printf '## %s\n' "$label" >>"$wasi_sdk_python_import_log"
  set +e
  PYTHONPATH="$node_pythonpath" \
    PYTHONDONTWRITEBYTECODE=1 \
    run_host_timeout "$node_import_timeout" \
      "$bin_dir/python-wasi-sdk" -c "$wrapped_code" \
      >>"$wasi_sdk_python_import_log" 2>&1
  local import_status=$?
  set -e
  if [ "$import_status" -eq 124 ]; then
    tail -120 "$wasi_sdk_python_import_log" >&2
    record_blocker "sagelite-blocked: python-wasi-sdk import timed out after $node_import_timeout at $label; see $wasi_sdk_python_import_log for the first runtime blocker."
  fi
  if [ "$import_status" -ne 0 ]; then
    if grep -Fqx "$marker" "$wasi_sdk_python_import_log"; then
      printf 'sagelite-wasi-sdk-warning: %s completed before python-wasi-sdk exited with status %s\n' \
        "$label" "$import_status" >>"$wasi_sdk_python_import_log"
      return
    fi
    printf '## %s verbose import trace after status %s\n' "$label" "$import_status" >>"$wasi_sdk_python_import_log"
    set +e
    PYTHONPATH="$node_pythonpath" \
      PYTHONDONTWRITEBYTECODE=1 \
      run_host_timeout "$node_import_timeout" \
        "$bin_dir/python-wasi-sdk" -v -c "$wrapped_code" \
        >>"$wasi_sdk_python_import_log" 2>&1
    local verbose_status=$?
    set -e
    if [ "$verbose_status" -eq 124 ]; then
      tail -120 "$wasi_sdk_python_import_log" >&2
      record_blocker "sagelite-blocked: verbose python-wasi-sdk import timed out after $node_import_timeout at $label; see $wasi_sdk_python_import_log for the first runtime blocker."
    fi
    tail -120 "$wasi_sdk_python_import_log" >&2
    record_blocker "sagelite-blocked: python-wasi-sdk import failed at $label; see $wasi_sdk_python_import_log for the first runtime blocker."
  fi
  if ! grep -Fqx "$marker" "$wasi_sdk_python_import_log"; then
    printf '## %s verbose import trace after missing marker\n' "$label" >>"$wasi_sdk_python_import_log"
    set +e
    PYTHONPATH="$node_pythonpath" \
      PYTHONDONTWRITEBYTECODE=1 \
      run_host_timeout "$node_import_timeout" \
        "$bin_dir/python-wasi-sdk" -v -c "$wrapped_code" \
        >>"$wasi_sdk_python_import_log" 2>&1
    local verbose_status=$?
    set -e
    if [ "$verbose_status" -eq 124 ]; then
      tail -120 "$wasi_sdk_python_import_log" >&2
      record_blocker "sagelite-blocked: verbose python-wasi-sdk import timed out after $node_import_timeout at $label; see $wasi_sdk_python_import_log for the first runtime blocker."
    fi
    tail -120 "$wasi_sdk_python_import_log" >&2
    record_blocker "sagelite-blocked: python-wasi-sdk import exited before completing $label; see $wasi_sdk_python_import_log for the first runtime blocker."
  fi
}

run_node_import "import sage" "import sage; print('sagelite-node-ok import sage')"
run_node_import "import sage.env" "import sage.env; print(sage.env.SAGE_VERSION)"
run_node_import "import sage.version" "import sage.env
import sage.version
assert sage.version.version == sage.env.SAGE_VERSION
print('sagelite-node-ok import sage.version')"
run_node_import "import sage.structure.element" "import sage.structure.element; print('sagelite-node-ok import sage.structure.element')"
run_node_import "integer arithmetic" "from sage.rings.integer_ring import ZZ; assert ZZ(7) < ZZ(9); print(ZZ(2) + ZZ(3))"
run_node_import "rational arithmetic" "from sage.rings.rational_field import QQ; print(QQ(2) / QQ(5) + QQ(1) / QQ(5))"
run_node_import "Conway polynomial database" "from sage.databases.conway import ConwayPolynomials
c = ConwayPolynomials()
assert c.has_polynomial(97, 12)
assert len(c) > 30000
print('sagelite-node-ok Conway polynomial database')"
run_node_import "import sage.all" "import sage.all; print('sagelite-node-ok import sage.all')"
run_wasi_sdk_python_import "import sage.all" "import sys
assert sys.platform == 'wasi'
import sage.all
print('sagelite-wasi-sdk-ok import sage.all')"
run_wasi_sdk_python_import "exact math smoke" "from sage.all import ZZ, QQ, PolynomialRing, PositiveIntegers, factor, prime_pi
assert ZZ(2) + ZZ(3) == ZZ(5)
assert QQ(6, 15) == QQ(2, 5)
assert str(PositiveIntegers().cardinality()) == '+Infinity'
R = PolynomialRing(QQ, 'x')
x = R.gen()
assert (x + 1) * (x - 1) == x**2 - 1
ZZx = PolynomialRing(ZZ, 'x')
y = ZZx.gen()
assert (y + 2) * (y + 3) == y**2 + 5*y + 6
assert list(factor(2**31 - 1)) == [(ZZ(2147483647), 1)]
assert prime_pi(10**6) == 78498
print('sagelite-wasi-sdk-ok exact math smoke')"
run_wasi_sdk_python_import "linear algebra smoke" "from sage.all import ZZ, QQ
from sage.matrix.constructor import identity_matrix, matrix
A = matrix(ZZ, [[1, 2], [3, 4]])
assert A.det() == ZZ(-2)
assert A * A == matrix(ZZ, [[7, 10], [15, 22]])
assert A.transpose() == matrix(ZZ, [[1, 3], [2, 4]])
assert A.change_ring(QQ) == matrix(QQ, [[1, 2], [3, 4]])
B = matrix(QQ, [[1, 2], [3, 5]])
assert B.det() == QQ(-1)
assert B.inverse() * B == identity_matrix(QQ, 2)
D = matrix(QQ, [[1, 2, 3], [0, 1, 4], [5, 6, 0]])
assert D.det() == QQ(1)
assert D.inverse() * D == identity_matrix(QQ, 3)
print('sagelite-wasi-sdk-ok linear algebra smoke')"
run_wasi_sdk_python_import "finite enumeration smoke" "import sage.all
from sage.arith.srange import ellipsis_range, srange
from sage.combinat.combination import Combinations
from sage.combinat.composition import Composition, Compositions
from sage.combinat.derangements import Derangements
from sage.combinat.perfect_matching import PerfectMatching, PerfectMatchings
from sage.combinat.subword import Subwords
from sage.combinat.tuple import Tuples, UnorderedTuples
from sage.all import RealNumber
from sage.doctest.fixtures import reproducible_repr
from sage.sets.disjoint_set import DisjointSet
from sage.sets.family import Family
from sage.sets.integer_range import IntegerRange
from sage.sets.non_negative_integers import NonNegativeIntegers
from sage.sets.positive_integers import PositiveIntegers
assert Combinations([1, 2, 3], 2).list() == [[1, 2], [1, 3], [2, 3]]
assert Composition([2, 1]).size() == 3
assert Compositions(4).cardinality() == 8
assert Derangements([1, 2, 3]).cardinality() == 2
assert PerfectMatchings(4).cardinality() == 3
assert PerfectMatching([2, 1, 4, 3]).number_of_crossings() == 0
assert Subwords([1, 2, 3], 2).cardinality() == 3
assert Tuples([1, 2], 3).cardinality() == 8
assert UnorderedTuples([1, 2, 3], 2).list() == [(1, 1), (1, 2), (1, 3), (2, 2), (2, 3), (3, 3)]
F = Family([1, 2, 3], lambda i: i * i)
assert list(F) == [1, 4, 9]
assert F.cardinality() == 3
N = NonNegativeIntegers()
assert 0 in N and 5 in N and -1 not in N
P = PositiveIntegers()
assert 1 in P and 5 in P and 0 not in P
half = RealNumber('0.5')
assert srange(1, 5, half) == [1 + i * half for i in range(8)]
two_fifths = RealNumber('0.4')
assert srange(0, 1, two_fifths) == [i * two_fifths for i in range(3)]
assert ellipsis_range(1, Ellipsis, 3, step=half) == [1 + i * half for i in range(5)]
try:
    IntegerRange(RealNumber('1.0'))
except TypeError as err:
    assert str(err) == \"end must be Integer or Infinity, not <class 'sage.rings.real_mpfr.RealLiteral'>\"
else:
    raise AssertionError('IntegerRange should reject a RealLiteral endpoint')
try:
    DisjointSet(RealNumber('4.3'))
except TypeError as err:
    assert str(err) == \"'sage.rings.real_mpfr.RealLiteral' object is not iterable\"
else:
    raise AssertionError('DisjointSet should reject a non-iterable RealLiteral')
assert reproducible_repr({RealNumber('3.0'): 'three', '2': 'two', 1: 'one'}) == \
    \"{'2': 'two', 1: 'one', 3.00000000000000: 'three'}\"
print('sagelite-wasi-sdk-ok finite enumeration smoke')"
run_wasi_sdk_python_import "unicode typeerror integer fields after sage.all" "import sage.all
def keyword_only(*, value=None):
    return value
try:
    keyword_only(5)
except TypeError as err:
    message = str(err)
else:
    raise AssertionError('keyword_only should reject positional arguments')
assert 'takes 0 positional arguments but 1 was given' in message, message
print('sagelite-wasi-sdk-ok unicode typeerror integer fields')"
run_wasi_sdk_python_import "remote-file runtime policy" "import os
import sys
import sage.misc.all
assert 'ssl' not in sys.modules
assert '_ssl' not in sys.modules
import sage.misc.remote_file as remote_file
assert os.environ['COWASM_RUNTIME'] == 'node'
os.environ['COWASM_RUNTIME'] = 'browser'
try:
    remote_file.get_remote_file('https://example.com/sagelite.txt')
except NotImplementedError as err:
    assert 'WASI browser profile' in str(err)
else:
    raise AssertionError('remote file downloads should fail closed on WASI')
assert 'ssl' not in sys.modules
assert '_ssl' not in sys.modules
os.environ['COWASM_RUNTIME'] = 'node'
try:
    remote_file.get_remote_file('https://example.com/sagelite.txt', verbose=False)
except NotImplementedError as err:
    assert 'optional WASI SSL runtime' in str(err)
else:
    raise AssertionError('remote file downloads should require the WASI SSL runtime')
assert 'ssl' not in sys.modules
assert '_ssl' not in sys.modules
print('sagelite-wasi-sdk-ok remote-file runtime policy')"
run_node_import "remote-file Node policy" "import os
import sage.misc.remote_file as remote_file
assert os.environ['COWASM_RUNTIME'] == 'node'
class Response:
    def read(self):
        return b'sagelite remote file transport enabled under Node\n'
remote_file.urlopen = lambda *args, **kwargs: Response()
downloaded = remote_file.get_remote_file('https://example.com/sagelite.txt', verbose=False)
try:
    assert downloaded.read_bytes() == b'sagelite remote file transport enabled under Node\n'
finally:
    downloaded.unlink()
print('sagelite-node-ok remote-file Node policy')"
run_node_import "authorized remote Python load" "import os
import sage.misc.remote_file as remote_file
import sage.repl.load as sage_load
assert os.environ['COWASM_RUNTIME'] == 'node'
requests = []
class Response:
    def read(self):
        return b'remote_value = local_value * 6\n'
def authorized_urlopen(request, *, timeout, context):
    requests.append((request, timeout, context))
    return Response()
remote_file.urlopen = authorized_urlopen
namespace = {'local_value': 7}
sage_load.load('https://example.com/authorized.py', namespace)
assert namespace['remote_value'] == 42
assert len(requests) == 1
request, timeout, context = requests[0]
assert request.full_url == 'https://example.com/authorized.py'
assert request.get_header('User-agent') == 'sage-doctest'
assert timeout == 1
assert context is not None
print('sagelite-node-ok authorized remote Python load')"
run_node_import "exact math smoke" "from sage.all import ZZ, QQ, PolynomialRing, factor, prime_pi
assert ZZ(2) + ZZ(3) == ZZ(5)
assert QQ(6, 15) == QQ(2, 5)
R = PolynomialRing(QQ, 'x')
x = R.gen()
assert (x + 1) * (x - 1) == x**2 - 1
ZZx = PolynomialRing(ZZ, 'x')
y = ZZx.gen()
assert (y + 2) * (y + 3) == y**2 + 5*y + 6
assert list(factor(2**31 - 1)) == [(ZZ(2147483647), 1)]
assert prime_pi(10**6) == 78498
print('sagelite-node-ok exact math smoke')"
run_node_import "linear algebra smoke" "from sage.all import ZZ, QQ
from sage.matrix.constructor import identity_matrix, matrix
A = matrix(ZZ, [[1, 2], [3, 4]])
assert A.det() == ZZ(-2)
assert A * A == matrix(ZZ, [[7, 10], [15, 22]])
assert A.transpose() == matrix(ZZ, [[1, 3], [2, 4]])
assert A.change_ring(QQ) == matrix(QQ, [[1, 2], [3, 4]])
assert A.list() == [ZZ(1), ZZ(2), ZZ(3), ZZ(4)]
assert list(A.rows()[0]) == [ZZ(1), ZZ(2)]
assert list(A.columns()[1]) == [ZZ(2), ZZ(4)]
u = matrix(ZZ, 2, 1, [1, 2])
solution = A.solve_right(u)
assert A * solution == u
G = matrix(ZZ, [[1, 2, 3], [4, 5, 6], [7, 8, 10]])
assert G[0, 2] == ZZ(3)
assert list(G[1]) == [ZZ(4), ZZ(5), ZZ(6)]
assert G.column(1).list() == [ZZ(2), ZZ(5), ZZ(8)]
assert G.matrix_from_rows_and_columns([0, 2], [1, 2]) == matrix(ZZ, [[2, 3], [8, 10]])
assert G.delete_rows([1]) == matrix(ZZ, [[1, 2, 3], [7, 8, 10]])
assert G.delete_columns([0]) == matrix(ZZ, [[2, 3], [5, 6], [8, 10]])
assert G.antitranspose()[0, 0] == ZZ(10)
B = matrix(QQ, [[1, 2], [3, 5]])
assert B.det() == QQ(-1)
assert B.inverse() * B == matrix(QQ, [[1, 0], [0, 1]])
row = matrix(QQ, 1, 2, [1, 1])
rational_left_solution = B.solve_left(row)
assert rational_left_solution * B == row
E = matrix(QQ, [[2, 1], [1, 1]])
assert E.rank() == 2
assert E.echelon_form() == matrix(QQ, [[1, 0], [0, 1]])
C = matrix(ZZ, [[2, 1], [1, 2]])
assert C.trace() == ZZ(4)
assert C.charpoly()(C) == matrix(ZZ, [[0, 0], [0, 0]])
I = identity_matrix(QQ, 3)
assert I.det() == QQ(1)
D = matrix(QQ, [[1, 2, 3], [0, 1, 4], [5, 6, 0]])
assert D.det() == QQ(1)
assert D.inverse() * D == identity_matrix(QQ, 3)
print('sagelite-node-ok linear algebra smoke')"
run_node_import "rational 3x3 matrix smoke" "from sage.all import QQ
from sage.matrix.constructor import identity_matrix, matrix
A = matrix(QQ, [[2, 1, 0], [1, 2, 1], [0, 1, 2]])
assert A.det() == QQ(4)
assert A.trace() == QQ(6)
assert A.inverse() * A == identity_matrix(QQ, 3)
assert A**2 == matrix(QQ, [[5, 4, 1], [4, 6, 4], [1, 4, 5]])
assert (A + identity_matrix(QQ, 3)).det() == QQ(21)
print('sagelite-node-ok rational 3x3 matrix smoke')"
run_node_import "rational matrix solve and view smoke" "from sage.all import QQ
from sage.matrix.constructor import identity_matrix, matrix
A = matrix(QQ, [[3, 1, 2], [2, 2, 1], [1, 0, 1]])
b = matrix(QQ, 3, 1, [1, 2, 3])
x = A.solve_right(b)
assert A * x == b
row = matrix(QQ, 1, 3, [2, 0, 1])
y = A.solve_left(row)
assert y * A == row
assert A.matrix_from_rows_and_columns([0, 2], [0, 2]) == matrix(QQ, [[3, 2], [1, 1]])
assert A.delete_rows([1]) == matrix(QQ, [[3, 1, 2], [1, 0, 1]])
assert A.delete_columns([1]) == matrix(QQ, [[3, 2], [2, 1], [1, 1]])
assert A.augment(identity_matrix(QQ, 3)).ncols() == 6
assert A.stack(identity_matrix(QQ, 3)).nrows() == 6
print('sagelite-node-ok rational matrix solve and view smoke')"
run_node_import "matrix row-column mutation smoke" "from sage.all import ZZ, QQ
from sage.matrix.constructor import matrix
A = matrix(ZZ, [[1, 2, 3], [4, 5, 6], [7, 8, 10]])
A.swap_rows(0, 2)
assert A == matrix(ZZ, [[7, 8, 10], [4, 5, 6], [1, 2, 3]])
A.swap_columns(0, 1)
assert A == matrix(ZZ, [[8, 7, 10], [5, 4, 6], [2, 1, 3]])
A.rescale_row(1, ZZ(2))
assert list(A[1]) == [ZZ(10), ZZ(8), ZZ(12)]
A.set_row(0, [ZZ(1), ZZ(0), ZZ(1)])
assert list(A[0]) == [ZZ(1), ZZ(0), ZZ(1)]
A.set_column(2, [ZZ(3), ZZ(6), ZZ(9)])
assert A == matrix(ZZ, [[1, 0, 3], [10, 8, 6], [2, 1, 9]])
B = matrix(QQ, [[1, 2], [3, 5]])
B.add_multiple_of_row(1, 0, QQ(-3))
assert B == matrix(QQ, [[1, 2], [0, -1]])
B.rescale_col(0, QQ(2, 3))
assert B == matrix(QQ, [[QQ(2, 3), 2], [0, -1]])
B.add_multiple_of_column(1, 0, QQ(-3))
assert B == matrix(QQ, [[QQ(2, 3), 0], [0, -1]])
A.add_multiple_of_row(2, 0, ZZ(-2))
assert A == matrix(ZZ, [[1, 0, 3], [10, 8, 6], [0, 1, 3]])
A.add_multiple_of_column(1, 0, ZZ(3))
assert A == matrix(ZZ, [[1, 3, 3], [10, 38, 6], [0, 1, 3]])
C = matrix(QQ, [[1, 2, 3], [4, 5, 6]])
C.rescale_row(0, QQ(1, 2))
assert C == matrix(QQ, [[QQ(1, 2), 1, QQ(3, 2)], [4, 5, 6]])
C.rescale_col(2, QQ(2, 3))
assert C == matrix(QQ, [[QQ(1, 2), 1, 1], [4, 5, 4]])
print('sagelite-node-ok matrix row-column mutation smoke')"
run_node_import "free module smoke" "from sage.all import FreeQuadraticModule, IntegralLattice, Integers, QQ, ZZ, zero_vector
from sage.modules.free_module import FreeModule
from sage.matrix.constructor import identity_matrix
M = FreeModule(ZZ, 3)
v = M([1, 2, 3])
w = M([4, 5, 6])
assert v + w == M([5, 7, 9])
assert v.dot_product(w) == ZZ(32)
assert 2 * v == M([2, 4, 6])
V = FreeModule(QQ, 2)
q = V([QQ(1, 2), QQ(2, 3)])
assert q.denominator() == 6
R8 = Integers(8)
Md = FreeModule(R8, 2)
Ms = FreeModule(R8, 2, sparse=True)
assert not Md.basis_matrix().is_sparse()
assert Md == Ms
assert Ms.basis_matrix().is_sparse()
Q = FreeQuadraticModule(ZZ, 2, identity_matrix(ZZ, 2))
assert Q.inner_product_matrix() == identity_matrix(ZZ, 2)
assert zero_vector(QQ, 2) == V.zero_vector()
L = IntegralLattice('U')
assert L._eq(IntegralLattice('U'))
print('sagelite-node-ok free module smoke')"
run_node_import "finite abelian group smoke" "import sage.all
from sage.groups.abelian_gps.abelian_group import AbelianGroup
G = AbelianGroup([2, 3])
a, b = G.gens()
assert a.order() == 2
assert b.order() == 3
assert (a * b).order() == 6
H = AbelianGroup([4, 6])
c, d = H.gens()
assert (c * d).order() == 12
assert (c**2 * d**3).order() == 2
assert (c**3 * d**5)**2 == c**2 * d**4
assert c**4 == H.one()
assert d**6 == H.one()
print('sagelite-node-ok finite abelian group smoke')"
run_node_import "free abelian monoid smoke" "import sage.all
from sage.monoids.free_abelian_monoid import FreeAbelianMonoid
M = FreeAbelianMonoid(3, 'xyz')
x, y, z = M.gens()
assert x * y * x == x**2 * y
assert (x * y * z).parent() is M
assert (x**3 * z**2).list() == [3, 0, 2]
print('sagelite-node-ok free abelian monoid smoke')"
run_node_import "combinatorics smoke" "import sage.all
from sage.combinat.combinat import polygonal_number
from sage.combinat.combination import Combinations
from sage.combinat.composition import Composition, Compositions
from sage.combinat.composition_signed import SignedCompositions
from sage.combinat.derangements import Derangements
from sage.combinat.integer_vector import IntegerVectors
from sage.combinat.ordered_tree import OrderedTree
from sage.combinat.partition import Partition, Partitions
from sage.combinat.partition_tuple import PartitionTuples
from sage.combinat.perfect_matching import PerfectMatching, PerfectMatchings
from sage.combinat.permutation import Permutation, Permutations
from sage.combinat.set_partition import SetPartitions
from sage.combinat.subword import Subwords
from sage.combinat.subset import Subsets
from sage.combinat.tableau import SemistandardTableaux, StandardTableaux, Tableau
from sage.combinat.tuple import Tuples, UnorderedTuples
from sage.combinat.vector_partition import VectorPartitions
from sage.rings.real_mpfr import RealField
from sage.sets.finite_set_maps import FiniteSetMaps
try:
    polygonal_number(RealField()('3.5'), 1)
except TypeError as error:
    assert str(error) == 'Attempt to coerce non-integral RealNumber to Integer'
else:
    raise AssertionError('non-integral polygonal-number input unexpectedly accepted')
assert str(sage.all.RootSystem(['A', 2])) == \"Root system of type ['A', 2]\"
p = Partition([4, 2, 1])
assert p.conjugate() == Partition([3, 2, 1, 1])
assert p.size() == 7
assert Partitions(5).cardinality() == 7
assert PartitionTuples()([[2, 1], [1]]).size() == 4
assert SemistandardTableaux(shape=[3, 1, 1]).cardinality() == 126
assert Partitions(5).list() == [
    Partition([5]),
    Partition([4, 1]),
    Partition([3, 2]),
    Partition([3, 1, 1]),
    Partition([2, 2, 1]),
    Partition([2, 1, 1, 1]),
    Partition([1, 1, 1, 1, 1]),
]
assert Partitions(6, length=2).list() == [Partition([5, 1]), Partition([4, 2]), Partition([3, 3])]
assert PerfectMatchings(4).cardinality() == 3
assert PerfectMatching([2, 1, 4, 3]).number_of_crossings() == 0
assert PerfectMatching([(1, 4), (2, 3)]).is_noncrossing()
assert Derangements([1, 2, 3]).cardinality() == 2
assert Derangements([1, 2, 3]).list() == [[2, 3, 1], [3, 1, 2]]
assert Derangements([1, 2, 3, 4]).cardinality() == 9
assert all(all(value != image for value, image in zip([1, 2, 3, 4], d)) for d in Derangements([1, 2, 3, 4]))
sigma = Permutation([3, 1, 2])
assert sigma.inverse() == Permutation([2, 3, 1])
assert sigma.to_cycles() == [(1, 3, 2)]
assert Subwords([1, 2, 3], 2).cardinality() == 3
assert Subwords([1, 2, 3], 2).list() == [[1, 2], [1, 3], [2, 3]]
assert Subwords([1, 2, 3, 4]).cardinality() == 16
assert Subwords([1, 2, 3, 4], 3).list() == [[1, 2, 3], [1, 2, 4], [1, 3, 4], [2, 3, 4]]
assert Tuples([1, 2], 3).cardinality() == 8
assert Tuples([1, 2], 2).list() == [(1, 1), (2, 1), (1, 2), (2, 2)]
assert UnorderedTuples([1, 2, 3], 2).list() == [(1, 1), (1, 2), (1, 3), (2, 2), (2, 3), (3, 3)]
assert Tuples([1, 2, 3], 2).cardinality() == 9
assert UnorderedTuples([1, 2], 3).list() == [(1, 1, 1), (1, 1, 2), (1, 2, 2), (2, 2, 2)]
p2 = Partition([4, 2, 1])
assert p2.hook_lengths() == [[6, 4, 2, 1], [3, 1], [1]]
assert p2.arm_lengths() == [[3, 2, 1, 0], [1, 0], [0]]
assert p2.leg_lengths() == [[2, 1, 0, 0], [1, 0], [0]]
tau = Permutation([4, 1, 3, 2])
assert tau.number_of_inversions() == 4
assert tau.descents() == [1, 3]
assert tau.signature() == 1
assert Permutations(3).cardinality() == 6
assert Permutations(3).list() == [
    Permutation([1, 2, 3]),
    Permutation([1, 3, 2]),
    Permutation([2, 1, 3]),
    Permutation([2, 3, 1]),
    Permutation([3, 1, 2]),
    Permutation([3, 2, 1]),
]
assert sigma.order() == 3
assert sigma.cycle_type() == [3]
assert [sorted(s) for s in Subsets([1, 2, 3], 2)] == [[1, 2], [1, 3], [2, 3]]
assert Combinations([1, 2, 3], 2).list() == [[1, 2], [1, 3], [2, 3]]
assert [list(v) for v in IntegerVectors(4, 2)] == [[4, 0], [3, 1], [2, 2], [1, 3], [0, 4]]
assert str(OrderedTree([[[]], []])) == '[[[]], []]'
assert len(list(VectorPartitions([2, 2]))) == 9
assert Composition([2, 1]).size() == 3
assert Compositions(4).cardinality() == 8
assert SignedCompositions(3).cardinality() == 18
assert [list(c) for c in SignedCompositions(2)] == [[1, 1], [1, -1], [-1, 1], [-1, -1], [2], [-2]]
T = Tableau([[1, 2], [3]])
assert T.shape() == [2, 1]
assert T.conjugate() == Tableau([[1, 3], [2]])
assert StandardTableaux(3).cardinality() == 4
assert [list(t.shape()) for t in StandardTableaux(3)] == [[3], [2, 1], [2, 1], [1, 1, 1]]
assert SetPartitions(3).cardinality() == 5
assert sorted([sorted([tuple(sorted(block)) for block in p]) for p in SetPartitions([1, 2, 3], 2)]) == [
    [(1,), (2, 3)],
    [(1, 2), (3,)],
    [(1, 3), (2,)],
]
F = FiniteSetMaps([1, 2], [3, 4])
assert F.cardinality() == 4
assert [f(1) for f in F] == [3, 3, 4, 4]
F2 = FiniteSetMaps([1, 2, 3], [4, 5])
assert F2.cardinality() == 8
assert [f(2) for f in F2] == [4, 4, 5, 5, 4, 4, 5, 5]
print('sagelite-node-ok combinatorics smoke')"
run_node_import "partition and composition method smoke" "import sage.all
from sage.combinat.composition import Composition
from sage.combinat.partition import Partition
p = Partition([4, 2, 1])
assert p.conjugate().conjugate() == p
assert p.dominates(Partition([3, 3, 1]))
assert not Partition([3, 2, 2]).dominates(p)
p3 = Partition([5, 3, 1])
assert p3.frobenius_coordinates() == ([4, 1], [2, 0])
assert p3.to_exp() == [1, 0, 1, 0, 1]
comp = Composition([2, 1, 3])
assert comp.descents() == [1, 2]
assert comp.to_subset() == {2, 3}
print('sagelite-node-ok partition and composition method smoke')"
run_node_import "tableau and enumerated combinatorics smoke" "import sage.all
from sage.combinat.integer_vector import IntegerVectors
from sage.combinat.set_partition import SetPartitions
from sage.combinat.subset import Subsets
from sage.combinat.tableau import StandardTableaux, Tableau
assert StandardTableaux([2, 1]).list() == [
    Tableau([[1, 3], [2]]),
    Tableau([[1, 2], [3]]),
]
assert StandardTableaux([2, 2]).cardinality() == 2
assert [list(t.shape()) for t in StandardTableaux(4)[:5]] == [[4], [3, 1], [3, 1], [3, 1], [2, 2]]
assert SetPartitions(5).cardinality() == 52
assert Subsets([1, 2, 3, 4], 3).cardinality() == 4
assert IntegerVectors(5, 3).cardinality() == 21
print('sagelite-node-ok tableau and enumerated combinatorics smoke')"
run_node_import "set family smoke" "import sage.all
from sage.sets.family import Family
from sage.sets.non_negative_integers import NonNegativeIntegers
from sage.sets.positive_integers import PositiveIntegers
F = Family([1, 2, 3], lambda i: i * i)
assert list(F) == [1, 4, 9]
assert F.cardinality() == 3
G = Family([1, 2, 3, 4], lambda i: i * i)
assert G[3] == 9
assert list(G.keys()) == [1, 2, 3, 4]
assert list(G.values()) == [1, 4, 9, 16]
H = Family([1, 2, 3, 4], lambda i: i + 10)
assert list(H.keys()) == [1, 2, 3, 4]
assert list(H.values()) == [11, 12, 13, 14]
assert H[4] == 14
N = NonNegativeIntegers()
assert 0 in N
assert 5 in N
assert -1 not in N
assert list(N.some_elements())[:4] == [0, 1, 3, 42]
P = PositiveIntegers()
assert 1 in P
assert 5 in P
assert 0 not in P
assert list(P.some_elements())[:5] == [1, 2, 3, 4, 5]
print('sagelite-node-ok set family smoke')"
run_node_import "combinatorics cardinality smoke" "import sage.all
from sage.combinat.combination import Combinations
from sage.combinat.perfect_matching import PerfectMatchings
from sage.combinat.set_partition import SetPartitions
assert PerfectMatchings(6).cardinality() == 15
assert Combinations([1, 2, 3, 4], 3).cardinality() == 4
assert SetPartitions(4).cardinality() == 15
print('sagelite-node-ok combinatorics cardinality smoke')"
run_node_import "integer lists smoke" "import sage.all
import gc
import weakref
from sage.combinat.integer_lists import Envelope, IntegerListsLex
from sage.combinat.integer_lists.base import IntegerListsBackend
from sage.misc.persist import dumps, loads
from sage.rings.real_mpfr import RealField
try:
    IntegerListsBackend(min_sum=RealField()('1.4'))
except TypeError as error:
    assert str(error) == 'Attempt to coerce non-integral RealNumber to Integer'
else:
    raise AssertionError('non-integral integer-list bound unexpectedly accepted')
L = IntegerListsLex(4, length=3)
assert L.cardinality() == 15
assert list(L.first()) == [4, 0, 0]
assert list(L.last()) == [0, 0, 4]
assert [list(v) for v in L[:4]] == [[4, 0, 0], [3, 1, 0], [3, 0, 1], [2, 2, 0]]
backend = IntegerListsBackend(3, length=2)
backend_ref = weakref.ref(backend)
backend_pickle = dumps(backend)
assert loads(backend_pickle) is backend
del backend
gc.collect()
assert backend_ref() is None
assert loads(backend_pickle) == IntegerListsBackend(3, length=2)
assert loads(dumps(L.backend)) is L.backend
f = Envelope([3, 2, 2])
assert f == Envelope([3, 2, 2])
assert f == Envelope((3, 2, 2))
assert f != Envelope([3, 2, 1])
assert f != Envelope([3, 2, 2], min_part=2)
print('sagelite-node-ok integer lists smoke')"
run_node_import "generic numerical approximation smoke" "import sage.all
from sage.arith.numerical_approx import numerical_approx_generic
integer_approx = numerical_approx_generic(int(42), 20)
float_approx = numerical_approx_generic(float(4.2), 20)
assert str(integer_approx) == '42.000'
assert str(float_approx) == '4.2000'
assert integer_approx.parent().precision() == 20
assert float_approx.parent().precision() == 20
print('sagelite-node-ok generic numerical approximation smoke')"
run_node_import "real functional semantics smoke" "import sage.all
from sage.misc.functional import N, _do_sqrt, log, numerical_approx, sqrt
from sage.rings.complex_mpfr import ComplexField
from sage.rings.real_mpfr import RealField
CC = ComplexField()
assert str(log(CC(-1))) == '3.14159265358979*I'
assert str(log(CC(0))) == '-infinity'
a = CC(-5).n(prec=40)
b = ComplexField(40)(-5)
assert a == b
assert a.parent() is b.parent()
assert str(numerical_approx(9)) == '9.00000000000000'
y = N(3.14, digits=3)
assert str(y) == '3.14'
assert y.str(base=2) == '11.001000111101'
assert str(N(3, prec=2)) == '3.0'
assert type(numerical_approx(CC(1/2))) is type(CC(0))
assert str(N(0, algorithm='foo')) == '0.000000000000000'
assert str(_do_sqrt(3, prec=10)) == '1.7'
assert str(_do_sqrt(3, prec=100)) == '1.7320508075688772935274463415'
assert str(sqrt(sage.all.RealNumber('1.1'), prec=100)) == '1.0488088481701515469914535137'
assert str(sqrt(sage.all.RealNumber('4.00'), prec=250)) == '2.0000000000000000000000000000000000000000000000000000000000000000000000000'
try:
    RealField(24).pi().n()
except TypeError as error:
    assert str(error) == 'cannot approximate to a precision of 53 bits, use at most 24 bits'
else:
    raise AssertionError('low-precision real unexpectedly increased precision')
print('sagelite-node-ok real functional semantics smoke')"
run_node_import "real pushout semantics smoke" "import sage.all
from sage.all import CC, CDF, QQ, ZZ
from sage.categories.pushout import AlgebraicClosureFunctor, ConstructionFunctor, MultiPolynomialFunctor, pushout
from sage.categories.rings import Rings
from sage.rings.real_mpfr import RealField

RR = RealField()
F = MultiPolynomialFunctor(['x', 'y'], None)
assert str(F(CC)) == 'Multivariate Polynomial Ring in x, y over Complex Field with 53 bits of precision'
F2 = RR.construction()[0]
assert F2.type == 'MPFR'
assert F2.extras == {'rnd': 0, 'sci_not': False}
closure = AlgebraicClosureFunctor()
assert str(closure(RR)) == 'Complex Field with 53 bits of precision'
double_closure = CDF.construction()[0]
assert str(double_closure(RR)) == 'Complex Field with 53 bits of precision'
class EvenPolynomialRing(type(QQ['x'])):
    def __init__(self, base, var):
        super().__init__(base, var)
        self.register_embedding(base[var])
    def construction(self):
        return EvenPolynomialFunctor(), self.base()[self.variable_name()]
    def _coerce_map_from_(self, R):
        return self.base().has_coerce_map_from(R)
class EvenPolynomialFunctor(ConstructionFunctor):
    rank = 10
    coercion_reversed = True
    def __init__(self):
        ConstructionFunctor.__init__(self, Rings(), Rings())
    def _apply_functor(self, R):
        return EvenPolynomialRing(R.base(), R.variable_name())
assert pushout(EvenPolynomialRing(QQ, 'x'), RR).base_ring() is RR
assert pushout(EvenPolynomialRing(QQ, 'x'), RR['x']).base_ring() is RR
assert pushout(EvenPolynomialRing(QQ, 'x'), EvenPolynomialRing(RR, 'x')).base_ring() is RR
assert pushout(EvenPolynomialRing(QQ, 'x')**2, RR**2).base_ring().base_ring() is RR
assert pushout(EvenPolynomialRing(QQ, 'x')**2, RR['x']**2).base_ring().base_ring() is RR
print('sagelite-node-ok real pushout semantics smoke')"
run_node_import "real sparse polynomial semantics smoke" "import sage.all
from sage.rings.complex_mpfr import ComplexField
from sage.rings.integer_ring import ZZ
from sage.rings.polynomial.polynomial_ring_constructor import PolynomialRing
from sage.rings.real_mpfr import RealField
real_ring = PolynomialRing(RealField(19), 'x', sparse=True)
x = real_ring.gen()
f = (2 - RealField()('3.5') * x)**3
assert repr(f) == '-42.875*x^3 + 73.500*x^2 - 42.000*x + 8.0000'
assert repr(f[:2]) == '-42.000*x + 8.0000'
for key, message in (
    (slice(1, 3), 'polynomial slicing with a start is not defined'),
    (slice(1, 3, 2), 'polynomial slicing with a step is not defined'),
):
    try:
        f[key]
    except IndexError as error:
        assert str(error) == message
    else:
        raise AssertionError('invalid sparse polynomial slice unexpectedly succeeded')
try:
    f['hello']
except TypeError as error:
    assert str(error) == 'list indices must be integers, not str'
else:
    raise AssertionError('string sparse polynomial index unexpectedly succeeded')
complex_ring = PolynomialRing(ComplexField(), 'z', sparse=True)
z = complex_ring.gen()
z._unsafe_mutate(1, 0)
assert z == 0
integer_ring = PolynomialRing(ZZ, 't', sparse=True)
t = integer_ring.gen()
p = t**(2**100) - 5
try:
    p.shift(RealField()('1.5'))
except TypeError as error:
    assert str(error) == 'Attempt to coerce non-integral RealNumber to Integer'
else:
    raise AssertionError('non-integral sparse polynomial shift unexpectedly succeeded')
print('sagelite-node-ok real sparse polynomial semantics smoke')"
run_node_import "real-part literal semantics smoke" "import sage.all
from sage.functions.other import real
from sage.rings.real_mpfr import RealLiteral
a = sage.all.RealNumber('2.5')
assert str(real(a)) == '2.50000000000000'
assert type(real(a)) is RealLiteral
assert real(a) is a
print('sagelite-node-ok real-part literal semantics smoke')"
run_node_import "quaternion polynomial semantics smoke" "from sage.all import PolynomialRing, QQ, QuaternionAlgebra
A = QuaternionAlgebra(QQ, -1, -1)
i, j, k = A.gens()
R = PolynomialRing(A, 'w', sparse=True)
w = R.gen()
f = w**3 + (i + j)*w + 1
assert str(f) == 'w^3 + (i + j)*w + 1'
assert str(f**2) == 'w^6 + (2*i + 2*j)*w^4 + 2*w^3 - 2*w^2 + (2*i + 2*j)*w + 1'
f = w + i
g = w + j
assert str(f*g) == 'w^2 + (i + j)*w + k'
assert str(g*f) == 'w^2 + (i + j)*w - k'
print('sagelite-node-ok quaternion polynomial semantics smoke')"
run_node_import "real argument evaluation smoke" "import sage.all
from sage.functions.other import arg
value = arg(float('3.0'))
assert value == 0.0
assert type(value) is float
print('sagelite-node-ok real argument evaluation smoke')"
run_node_import "symbolic binomial internal evaluation smoke" "from sage.functions.other import binomial
from sage.rings.integer_ring import ZZ
from sage.rings.real_mpfr import RealNumber, create_RealNumber
value = binomial._eval_(create_RealNumber('5.'), ZZ(3))
assert value == create_RealNumber('10.')
assert type(value) is RealNumber
print('sagelite-node-ok symbolic binomial internal evaluation smoke')"
run_node_import "real and complex manifold category semantics smoke" "from sage.all import CC, RR
from sage.categories.manifolds import Manifolds
real_manifolds = Manifolds(RR)
assert str(real_manifolds) == 'Category of manifolds over Real Field with 53 bits of precision'
assert list(map(str, real_manifolds.super_categories())) == ['Category of topological spaces']
connected = real_manifolds.Connected()
finite_connected = connected.FiniteDimensional()
assert str(connected) == 'Category of connected manifolds over Real Field with 53 bits of precision'
assert str(finite_connected) == 'Category of finite dimensional connected manifolds over Real Field with 53 bits of precision'
differentiable = real_manifolds.Differentiable()
smooth = real_manifolds.Smooth()
analytic = real_manifolds.Analytic()
almost_complex = real_manifolds.AlmostComplex()
assert smooth.super_categories() == [differentiable]
assert analytic.super_categories() == [smooth]
assert almost_complex.super_categories() == [smooth]
complex_manifolds = Manifolds(CC).Complex()
assert str(complex_manifolds) == 'Category of complex manifolds over Complex Field with 53 bits of precision'
assert Manifolds(CC).Complex.__module__ == 'sage.categories.manifolds'
print('sagelite-node-ok real and complex manifold category semantics smoke')"
run_node_import "modular arithmetic smoke" "from sage.all import ZZ, Integers, GF
I = ZZ.ideal(7)
assert I.gen() == ZZ(7)
Q7 = ZZ.quotient(7 * ZZ)
q3 = Q7(3)
q5 = Q7(5)
assert q3 + q5 == Q7(1)
assert q3 * q5 == Q7(1)
assert q3**6 == Q7(1)
assert -q3 == Q7(4)
assert q3.lift() == ZZ(3)
assert q3 - q5 == Q7(5)
Q11 = ZZ.quotient(11 * ZZ)
q7 = Q11(7)
assert q7**10 == Q11(1)
assert (q7 + Q11(9)).lift() == ZZ(5)
Z7 = Integers(7)
assert Z7(3) + Z7(5) == Z7(1)
F7 = GF(7)
assert F7(3) * F7(5) == F7(1)
assert Z7(3).inverse_of_unit() == Z7(5)
assert Z7(3) / Z7(5) == Z7(2)
F11 = GF(11)
assert F11(3)**5 == F11(1)
F9 = GF(9)
z = F9.gen()
assert F9.cardinality() == 9
assert z.parent() is F9
assert z**9 == z
assert len(list(F9)) == 9
assert len([str(x) for x in F9]) == 9
Z9 = Integers(9)
assert Z9(4).inverse_of_unit() == Z9(7)
print('sagelite-node-ok modular arithmetic smoke')"
run_node_import "real-double algebraic dependency smoke" "from sage.all import RDF, sqrt
r = sqrt(RDF(2))
assert str(r.algebraic_dependency(5)) == 'x^2 - 2'
print('sagelite-node-ok real-double algebraic dependency smoke')"
run_node_import "real and complex field abstract base smoke" "import sage.all
import sage.rings.abc
from sage.rings.complex_mpfr import ComplexField, ComplexField_class
from sage.rings.real_mpfr import RealField, RealField_class
CC = ComplexField()
RR = RealField()
assert isinstance(RR, sage.rings.abc.RealField)
assert sage.rings.abc.RealField.__subclasses__() == [RealField_class]
assert isinstance(CC, sage.rings.abc.ComplexField)
assert sage.rings.abc.ComplexField.__subclasses__() == [ComplexField_class]
print('sagelite-node-ok real and complex field abstract base smoke')"
run_node_import "Gosper constant homography smoke" "from sage.rings.continued_fraction import continued_fraction
from sage.rings.continued_fraction_gosper import gosper_iterator
cf = continued_fraction(([1, 2], [3, 4]))
it = iter(gosper_iterator(6, -9, -2, 3, cf))
assert list(it) == [-3]
assert it.output_preperiod_length == 1
assert cf.apply_homography(6, -9, -2, 3).value() == -3
print('sagelite-node-ok Gosper constant homography smoke')"
run_node_import "integer and rational helper smoke" "from sage.all import ZZ, QQ, lcm
g, s, t = ZZ(5).xgcd(ZZ(12))
assert g == ZZ(1)
assert s * ZZ(5) + t * ZZ(12) == g
assert ZZ(255).digits(16) == [15, 15]
assert ZZ(10).digits(2) == [0, 1, 0, 1]
assert ZZ(255).bits() == [1, 1, 1, 1, 1, 1, 1, 1]
assert ZZ(123456).str(16) == '1e240'
assert ZZ(12345).quo_rem(ZZ(97)) == (ZZ(127), ZZ(26))
assert ZZ(144).sqrtrem() == (ZZ(12), ZZ(0))
assert ZZ(145).sqrtrem() == (ZZ(12), ZZ(1))
assert ZZ(97).is_prime()
assert not ZZ(221).is_prime()
assert ZZ(-12345).abs() == ZZ(12345)
assert (-ZZ(12)).sign() == -1
assert ZZ(0).sign() == 0
assert ZZ(12).sign() == 1
assert ZZ(0).is_zero()
assert ZZ(1).is_one()
assert ZZ(1).is_unit()
assert ZZ(-1).is_unit()
assert not ZZ(7).is_unit()
assert ZZ(6).divides(ZZ(42))
assert not ZZ(6).divides(ZZ(43))
assert ZZ(-3).divisors() == [ZZ(1), ZZ(3)]
assert ZZ(28).divisors() == [ZZ(1), ZZ(2), ZZ(4), ZZ(7), ZZ(14), ZZ(28)]
assert ZZ(2).powermod(10, 17) == ZZ(4)
assert ZZ(2).powermod(ZZ(20), ZZ(17)) == ZZ(16)
assert ZZ(2).inverse_mod(ZZ(5)) == ZZ(3)
assert ZZ(35).gcd(ZZ(21)) == ZZ(7)
assert ZZ(35).lcm(ZZ(21)) == ZZ(105)
assert ZZ(-17).quo_rem(ZZ(5)) == (ZZ(-4), ZZ(3))
assert lcm([ZZ(6), ZZ(10), ZZ(15)]) == ZZ(30)
assert QQ(-45, 28).abs() == QQ(45, 28)
assert QQ(-45, 28).floor() == -2
assert QQ(-45, 28).ceil() == -1
assert QQ(45, 28).floor() == 1
assert QQ(45, 28).ceil() == 2
assert QQ(7, 9).numerator() == 7
assert QQ(7, 9).denominator() == 9
assert QQ(12, 18).numerator() == 2
assert QQ(12, 18).denominator() == 3
assert QQ(0).is_zero()
assert QQ(1).is_one()
assert not QQ(2).is_one()
assert QQ(-7, 3).sign() == -1
assert QQ(0).sign() == 0
assert QQ(7, 3).sign() == 1
assert QQ(2, 3) < QQ(3, 4)
assert QQ(-5, 7) < QQ(0)
assert QQ(9, 12) == QQ(3, 4)
assert QQ(5, 6) > QQ(4, 5)
assert QQ(7, 10) * QQ(15, 14) == QQ(3, 4)
assert QQ(5, 6) / QQ(10, 9) == QQ(3, 4)
print('sagelite-node-ok integer and rational helper smoke')"
run_node_import "extended integer helper smoke" "from sage.all import ZZ, lcm, binomial
from sage.arith.misc import CRT_list, valuation
assert lcm([ZZ(4), ZZ(6), ZZ(14)]) == ZZ(84)
assert CRT_list([2, 3, 2], [3, 5, 7]) == ZZ(23)
assert valuation(ZZ(3)**10 * ZZ(5)**2, 3) == 10
assert binomial(ZZ(-5), 3) == ZZ(-35)
print('sagelite-node-ok extended integer helper smoke')"
run_node_import "polynomial helper smoke" "from sage.all import ZZ, QQ, PolynomialRing
from sage.arith.functions import LCM_list
from sage.structure.sequence import Sequence
R = PolynomialRing(QQ, 'x')
x = R.gen()
assert (x**3 - 2*x + 1).derivative().list() == [QQ(-2), QQ(0), QQ(3)]
assert (x**4 - 1)(QQ(2)) == QQ(15)
assert x.degree() == 1
assert ((x + 2)**4).list() == [QQ(16), QQ(32), QQ(24), QQ(8), QQ(1)]
ZZt = PolynomialRing(ZZ, 't')
t = ZZt.gen()
assert (t**4 - 1).quo_rem(t**2 - 1) == (t**2 + 1, 0)
assert (2*t + 4).lcm(2*t**2) == 2*t**3 + 4*t**2
assert LCM_list(Sequence((2*t + 4, 2*t**2, 2))) == 2*t**3 + 4*t**2
assert (2*x + 4).lcm(2*x**2) == x**3 + 2*x**2
g = t**3 + 2*t + 5
assert g.degree() == 3
assert g.leading_coefficient() == ZZ(1)
assert g.constant_coefficient() == ZZ(5)
assert ((t - 1)**4)(ZZ(3)) == ZZ(16)
h = x**5 - x + 1
assert h.truncate(3) == 1 - x
assert h.shift(2) == x**7 - x**3 + x**2
assert h.reverse(degree=5) == x**5 - x**4 + 1
p = (x + 1)**5
assert p[3] == QQ(10)
assert p.truncate(4).degree() == 3
f = x**3 - 2*x + 1
assert f(x + 1) == x**3 + 3*x**2 + x
assert f.map_coefficients(lambda c: c * 2) == 2*x**3 - 4*x + 2
assert (x**2 + 2*x + 1).subs(x=QQ(3)) == QQ(16)
ZZz = PolynomialRing(ZZ, 'z')
z = ZZz.gen()
assert (z**3 - z)(z + 1) == z**3 + 3*z**2 + 2*z
print('sagelite-node-ok polynomial helper smoke')"
run_node_import "finite-field polynomial smoke" "from sage.all import GF, PolynomialRing, ZZ, set_random_seed
S = PolynomialRing(GF(7), 't')
t = S.gen()
assert (t**3 + 2*t + 1).derivative() == 3*t**2 + 2
assert (t**2 + 1)(GF(7)(3)) == GF(7)(3)
f = t**4 - 1
q, r = (t**4 + 3*t**2 + 2).quo_rem(t**2 + 1)
assert q == t**2 + 2
assert r == 0
assert f.list() == [GF(7)(6), GF(7)(0), GF(7)(0), GF(7)(0), GF(7)(1)]
assert (t + 3)**3 == t**3 + 2*t**2 + 6*t + 6
S5 = PolynomialRing(GF(5), 'u')
u = S5.gen()
assert (u**3 + 4*u + 2)(u + 1) == u**3 + 3*u**2 + 2*u + 2
assert (u**2 + 3*u + 4).subs(u=GF(5)(2)) == GF(5)(4)
F25 = GF(25, 'a')
from sage.rings.finite_rings.finite_field_givaro import FiniteField_givaro
assert isinstance(F25, FiniteField_givaro)
F25_functor, F25_base = F25.construction()
assert F25_functor(F25_base) is F25
a = F25.gen()
F17 = GF(17)
assert F17.multiplicative_generator() == 3
assert sorted(F17(13)._nth_root_common(ZZ(4), True, 'Johnston', False)) == [3, 5, 12, 14]
F125 = GF(5**3, 'g')
g = F125.gen()
assert g.trace() == 0
assert (g**2 + g + 1).trace() == 2
from sage.rings.finite_rings.element_base import FinitePolyExtElement
F361 = GF(19**2, 'h')
h = F361.gen()
assert FinitePolyExtElement.charpoly(h**20, 'x', algorithm='matrix') == (h**20).charpoly('x')
F9_square = GF(9, 's', implementation='givaro', modulus='primitive')
s = F9_square.gen()
assert not s.is_square()
assert (s**2).is_square()
assert F9_square(0).is_square()
F19_4 = GF(19**4, 'q')
assert F19_4.random_element().parent() is F19_4
assert F19_4.random_element(prob=0) == 0
assert all(value.parent() is F19_4 for value in F19_4.some_elements())
assert GF(27, 'v').vector_space(map=False).dimension() == 3
Frob125 = F125.frobenius_endomorphism()
assert Frob125(g) == g**5
F16 = GF(2**4, 'd')
assert F16.dual_basis(basis=None, check=False) == [F16.gen()**3 + 1, F16.gen()**2, F16.gen(), 1]
from sage.rings.finite_rings.finite_field_base import FiniteField as FiniteFieldBase
for implementation in ('givaro', 'ntl'):
    F8_iter = GF(8, 'i', implementation=implementation)
    i = F8_iter.gen()
    assert list(FiniteFieldBase.__iter__(F8_iter)) == [
        F8_iter(0), F8_iter(1), i, i + 1,
        i**2, i**2 + 1, i**2 + i, i**2 + i + 1,
    ]
assert GF(997).multiplicative_generator() == 7
K25_extension = GF((5, 2), 'u')
L625_extension = K25_extension.extension(2, 'v')
assert L625_extension(K25_extension.gen()).minpoly() == K25_extension.gen().minpoly()
assert GF(3**8, 'a').subfield(4).order() == 3**4
F7_4 = GF(7**4, 'e')
e = F7_4.gen()
F7_4_basis = [
    4*e**3,
    2*e**3 + e**2 + 3*e + 5,
    3*e**3 + 5*e**2 + 4*e + 2,
    2*e**3 + 2*e**2 + 2,
]
F7_4_dual = F7_4.dual_basis(F7_4_basis, check=True)
assert all(
    (x*y).trace() == (1 if i == j else 0)
    for i, x in enumerate(F7_4_basis)
    for j, y in enumerate(F7_4_dual)
)
F7_8 = GF(7**8, 'r')
r = F7_8.gen()
F7_8_basis = [r**i for i in range(8)]
F7_8_dual = F7_8.dual_basis(F7_8_basis, check=False)
assert F7_8.dual_basis(F7_8_dual) == F7_8_basis
F49 = GF(7**2, 'a')
a49 = F49.gen()
f49 = F49.modulus()
assert str(F49['x'](f49).factor()) == '(x + a + 6) * (x + 6*a)'
F4 = GF(4)
A2 = GF(2).algebraic_closure()
prime_embedding = GF(2).embeddings(F4)
assert len(prime_embedding) == 1 and prime_embedding[0](1) == F4(1)
closure_embedding = GF(4, 'b').an_embedding(A2)
assert closure_embedding.domain() == GF(4, 'b')
assert closure_embedding.codomain() is A2
closure_embeddings = F4.embeddings(A2)
assert [str(phi(F4.gen())) for phi in closure_embeddings] == ['z2', 'z2 + 1']
set_random_seed(31337)
F1024 = GF((2, 10), 'a')
R1024 = PolynomialRing(F1024, 'x')
f1024 = R1024.random_element(degree=10)
assert f1024.roots() == [(F1024.gen()**9 + F1024.gen()**8 +
                          F1024.gen()**6 + F1024.gen()**4 +
                          F1024.gen()**2, 1)]
assert g.__pari__().type() == 't_FFELT'
assert str(g.__pari__()) == 'g'
renamed_givaro = (3*g**2 + 2*g + 4).__pari__('b')
assert renamed_givaro.type() == 't_FFELT'
assert str(renamed_givaro) == '3*b^2 + 2*b + 4'
S25 = PolynomialRing(F25, 'w')
w = S25.gen()
assert type(w).__module__ == 'sage.rings.polynomial.polynomial_zz_pex'
assert (w + a)**2 == w**2 + 2*a*w + a**2
K25 = S25.fraction_field()
try:
    F25(K25.gen())
except TypeError as error:
    assert str(error) == 'unable to coerce ' + repr(type(K25.gen()))
else:
    raise AssertionError('unsupported coercion unexpectedly succeeded')
K = GF(11**4, 'z', implementation='pari_ffelt')
z = K.gen()
p_root = z**3 + 7*z**2 + 6*z + 10
assert str(p_root) == 'z^3 + 7*z^2 + 6*z + 10'
assert p_root.__pari__().type() == 't_FFELT'
K9 = GF(9, 'a', implementation='pari_ffelt')
K9_functor, K9_base = K9.construction()
assert K9_functor(K9_base) is K9
from sage.misc.sage_unittest import TestSuite
TestSuite(K9).run()
reserved_pari_name = GF(25, 'I', implementation='pari_ffelt').gen()
try:
    reserved_pari_name.__pari__()
except ValueError as error:
    assert str(error) == 'variable name illegal in PARI'
else:
    raise AssertionError('reserved PARI finite-field name was accepted')
S2 = PolynomialRing(GF(2), 'v')
v = S2.gen()
assert type(v).__module__ == 'sage.rings.polynomial.polynomial_gf2x'
assert (v**4 + v + 1) * (v**2 + 1) == v**6 + v**4 + v**3 + v**2 + v + 1
from sage.matrix.constructor import matrix
from sage.misc.persist import dumps, loads
A2 = matrix(GF(2), [[1, 0, 1], [0, 1, 1]])
assert type(A2).__module__ == 'sage.matrix.matrix_mod2_dense'
assert loads(dumps(A2)) == A2
A2.set_immutable()
A2_copy = loads(dumps(A2))
assert A2_copy == A2 and A2_copy.is_immutable()
print('sagelite-node-ok finite-field polynomial smoke')"
run_node_import "p-adic lattice pickle smoke" "from sage.all import ZpLC
from sage.misc.persist import dumps, loads
R = ZpLC(5)
a = R(-3)
a_copy = loads(dumps(a))
assert a_copy == a
assert a_copy.parent() is R
print('sagelite-node-ok p-adic lattice pickle smoke')"
run_node_import "FLINT p-adic defining polynomial smoke" "from sage.all import PolynomialRing, Zq
K = Zq(125, names='a')
a = K.gen()
S = PolynomialRing(K, 'x')
x = S.gen()
W = K.extension(x**3 - 25*x**2 - 5*a*x + 5, names='w')
w = W.gen()
assert str(w._poly_rep()) == 'x'
assert W(5)._poly_rep() == 5
coeff_ring = W.random_element()._poly_rep().parent().base_ring()
assert coeff_ring._prec_type() == 'floating-point'
print('sagelite-node-ok FLINT p-adic defining polynomial smoke')"
run_node_import "p-adic local NTL context and numeric log smoke" "from sage.all import PolynomialRing, Qp, ZZ, ZpCA, ZpFM
from sage.rings.padics.padic_generic_element import _AHE_coefficients, _findprec, _polylog_c
S = PolynomialRing(ZZ, 'x')
x = S.gen()
f = x**4 + 15*x**2 + 625*x - 5
for base in (ZpCA(5, 5), ZpFM(5, 5)):
    extension = base.extension(f, names='w')
    w = extension.gen()
    assert extension(f[0]) == f[0]
    assert w.parent() is extension
assert len(_AHE_coefficients(ZZ(2), ZZ(9), 1)) == 9
assert _findprec(1, 1, 2, 2) == 5
assert abs(_polylog_c(1, 2) - 4.52876637294490) < 1e-14
assert Qp(13)(-1).polylog(6) == 0
print('sagelite-node-ok p-adic local NTL context and numeric log smoke')"
run_node_import "p-adic subspace and minimal polynomial smoke" "from sage.all import O, PolynomialRing, Qp, QqCR, VectorSpace, ZZ
V = VectorSpace(Qp(5), 2)
W = V.span([[1, 0]])
assert V([1, 0]) in W
assert V([0, 1]) not in W
assert V([O(5**5), 1]) not in W
R = PolynomialRing(Qp(5), 't')
t = R.gen()
f = 5 + 3*t + t**4 + 25*t**10
g = f._factor_of_degree(4)
assert (f % g).is_zero()
try:
    f._factor_of_degree(3)
except Exception as error:
    assert type(error).__name__ == 'PrecisionError'
    assert str(error) == 'cannot divide by something indistinguishable from zero'
else:
    raise AssertionError('invalid p-adic factor degree did not fail')
K = QqCR(ZZ(2)**3, 5, names='a')
a = K.gen()
S = PolynomialRing(K, 'x')
x = S.gen()
L = K.extension(x**4 - 2*a, names='pi')
pi = L.gen()
assert str(pi.minimal_polynomial()) == '(1 + O(2^5))*x^4 + a*2 + a*2^2 + a*2^3 + a*2^4 + a*2^5 + O(2^6)'
print('sagelite-node-ok p-adic subspace and minimal polynomial smoke')"
run_node_import "CPython static-type getattr smoke" "from contextlib import redirect_stdout
from io import StringIO
from sage.cpython.debug import getattr_debug
with redirect_stdout(StringIO()):
    reverse = getattr_debug(list, 'reverse')
assert reverse is list.reverse
print('sagelite-node-ok CPython static-type getattr smoke')"
run_node_import "NTL GF2X delivery smoke" "from sage.all import GF, PolynomialRing, pari, polygen, set_random_seed
from sage.libs.ntl import all as ntl
from sage.rings.finite_rings import element_ntl_gf2e
from sage.rings.finite_rings.finite_field_ntl_gf2e import FiniteField_ntl_gf2e
context = ntl.GF2EContext(ntl.GF2X([1, 1, 0, 1, 1, 0, 0, 0, 1]))
value = ntl.GF2E([1, 0, 1, 0, 1], context)
ntl.GF2XHexOutput(True)
assert repr(value) == '0x51'
ntl.GF2XHexOutput(False)
R = PolynomialRing(GF(2), 'x')
x = R.gen()
generic = ntl.GF2X(x**5 + x**2 + 1)
assert repr(generic) == '[1 0 1 0 0 1]'
assert generic == polygen(GF(2))**5 + polygen(GF(2))**2 + 1
extension_value = GF(2**8, 'a').gen()**20
assert repr(ntl.GF2X(extension_value)) == '[0 0 1 0 1 1 0 1]'
K = GF(2**20, 'a')
assert isinstance(K, FiniteField_ntl_gf2e)
a = K.gen()
T = PolynomialRing(K, 't')
t = T.gen()
assert repr((a + 1) * t) == '(a + 1)*t'
assert repr(K(pari('Mod(1,2)*a^20'))) == 'a^10 + a^9 + a^7 + a^6 + a^5 + a^4 + a + 1'
construction, base = K.construction()
assert construction(base) is K
assert repr(K._pari_modulus()) == 'Mod(1, 2)*a^20 + Mod(1, 2)*a^10 + Mod(1, 2)*a^9 + Mod(1, 2)*a^7 + Mod(1, 2)*a^6 + Mod(1, 2)*a^5 + Mod(1, 2)*a^4 + Mod(1, 2)*a + Mod(1, 2)'
set_random_seed(6397)
random_field = GF(2**17, 'r', modulus='random')
assert repr(random_field.modulus()) == 'x^17 + x^16 + x^15 + x^10 + x^8 + x^6 + x^4 + x^3 + x^2 + x + 1'
print('sagelite-node-ok NTL GF2X delivery smoke')"
run_node_import "generic linear group delivery smoke" "from sage.all import GL, SL, ZZ, Integers
from sage.matrix.constructor import matrix
G = GL(2, Integers(6))
try:
    G(G.matrix_space().diagonal_matrix([2, 1]))
except TypeError as err:
    assert str(err) == 'matrix must be invertible'
else:
    raise AssertionError('noninvertible modular matrix was accepted')
S, T = SL(2, ZZ).gens()
assert S.matrix() == matrix(ZZ, [[0, 1], [-1, 0]])
assert T.matrix() == matrix(ZZ, [[1, 1], [0, 1]])
assert SL(2, ZZ).subgroup([T**2]).gen(0).matrix() == (T**2).matrix()
assert G.order() == len(list(G))
H = SL(2, Integers(6))
assert H.order() == len(list(H))
print('sagelite-node-ok generic linear group delivery smoke')"
run_node_import "q-binomial Python parent delivery smoke" "import sage.all
from sage.combinat.q_analogues import q_binomial
r = q_binomial(3, 2, 1)
assert r == 3
assert type(r) is int
print('sagelite-node-ok q-binomial Python parent delivery smoke')"
run_node_import "weak reverse plane partition shape smoke" "import sage.all
from sage.combinat.hillman_grassl import WeakReversePlanePartitions
S = WeakReversePlanePartitions([3, 1])
assert S is WeakReversePlanePartitions((3, 1))
assert str(S) == 'Weak Reverse Plane Partitions of shape [3, 1]'
assert [[0, 1, 2], [1]] in S
assert [[0, 1], [1]] not in S
a = S.an_element()
assert repr(a) == '[[0, 0, 0], [0]]'
assert a.parent() is S
print('sagelite-node-ok weak reverse plane partition shape smoke')"
run_node_import "pairwise maximal subsets delivery smoke" "import sage.all
from sage.arith.misc import gcd
from sage.combinat.subsets_pairwise import PairwiseCompatibleSubsets
from sage.sets.set import Set
def predicate(x, y): return gcd(x, y) == 1
P = PairwiseCompatibleSubsets([4, 5, 6, 8, 9], predicate, maximal=True)
expected = {frozenset((4, 5, 9)), frozenset((5, 6)), frozenset((5, 8, 9))}
assert {frozenset(s) for s in P} == expected
assert P.cardinality() == 3
assert Set([4, 5]) not in P
assert Set([4, 5, 9]) in P
assert P != PairwiseCompatibleSubsets([4, 5, 6, 8, 9], predicate)
print('sagelite-node-ok pairwise maximal subsets delivery smoke')"
run_node_import "cyclic permutation delivery smoke" "import sage.all
from sage.combinat.permutation import CyclicPermutations
C = CyclicPermutations([1, 2, 3, 3])
assert C.cardinality() == 3
assert C.cardinality() == len(C.list())
assert C(C.an_element()) == C.an_element()
assert all(C.rank(C.unrank(i)) == i for i in range(C.cardinality()))
assert CyclicPermutations([1, 1, 1]).cardinality() == 1
assert CyclicPermutations([]).cardinality() == 0
try:
    C((1, 2))
except ValueError:
    pass
else:
    raise AssertionError('invalid cyclic permutation unexpectedly accepted')
print('sagelite-node-ok cyclic permutation delivery smoke')"
run_node_import "fast vector halving delivery smoke" "import sage.all
from sage.combinat.fast_vector_partitions import vector_halve
assert vector_halve([1, 2, 3, 4, 5, 6, 7, 8, 9]) == [0, 2, 3, 4, 5, 6, 7, 8, 9]
assert vector_halve([2, 4, 6, 8, 5, 6, 7, 8, 9]) == [1, 2, 3, 4, 2, 6, 7, 8, 9]
print('sagelite-node-ok fast vector halving delivery smoke')"
run_node_import "incompatible word concatenation delivery smoke" "import sage.all
from sage.combinat.words.word import Word
y = Word([5, 3, 5, 8, 7])
z = Word('12223', alphabet='123')
result = z + y
assert repr(result) == 'word: 1222353587'
assert list(result) == ['1', '2', '2', '2', '3', 5, 3, 5, 8, 7]
print('sagelite-node-ok incompatible word concatenation delivery smoke')"
run_node_import "unknown-length word conjugacy smoke" "import sage.all
from sage.combinat.words.word import Word
z = Word([2] * 100)
assert z.is_conjugate_with(Word(iter([2] * 100), length='unknown'))
assert not z.is_conjugate_with(Word(iter([2] * 99), length='unknown'))
assert not z.is_conjugate_with(Word(iter([2] * 101), length='unknown'))
assert z.is_conjugate_with(
    Word(iter([2] * 100), length='unknown', caching=False)
)
print('sagelite-node-ok unknown-length word conjugacy smoke')"
run_node_import "empty species arithmetic smoke" "import sage.all
from sage.combinat.species.library import CharacteristicSpecies, EmptySpecies
empty = EmptySpecies()
characteristic = CharacteristicSpecies(2)
assert characteristic + empty is characteristic
assert empty + characteristic is characteristic
weighted_empty = EmptySpecies(weight=2)
assert characteristic * weighted_empty is weighted_empty
assert weighted_empty * characteristic is weighted_empty
print('sagelite-node-ok empty species arithmetic smoke')"
run_node_import "real characteristic Sturmian factor smoke" "import sage.all
from sage.all import QQ
from sage.combinat.words.word_generators import words
from sage.rings.real_mpfr import RealField
slope = RealField(200)('0.31415926535897932384626433832795028841971693993751')
word = words.CharacteristicSturmianWord(slope)[:100]
assert len(word) == 100
assert word.is_sturmian_factor()
assert repr(words.CharacteristicSturmianWord(QQ(4) / 5)) == 'word: 11110'
assert repr(words.CharacteristicSturmianWord(QQ(5) / 14)) == 'word: 01001001001001'
def cf():
    yield 0
    yield 2
    while True:
        yield 1
F = words.CharacteristicSturmianWord(cf())
Fib = words.FibonacciWord()
assert repr(F) == 'word: 0100101001001010010100100101001001010010...'
assert F[:10000] == Fib[:10000]
assert repr(words.CharacteristicSturmianWord(cf(), 'rs')) == 'word: rsrrsrsrrsrrsrsrrsrsrrsrrsrsrrsrrsrsrrsr...'
print('sagelite-node-ok real characteristic Sturmian factor smoke')"
run_node_import "real trigonometric evaluation smoke" "import sage.all
from sage.functions.trig import arccos, arcsin, tan
from sage.rings.real_mpfr import RealField
RR = RealField(53)
assert repr(tan(RR('3.1415'))) == '-0.0000926535900581913'
assert repr(tan(RR('3.1415') / 4)) == '0.999953674278156'
assert repr(arcsin(RR('0.5'))) == '0.523598775598299'
assert repr(arccos(RR('0.5'))) == '1.04719755119660'
print('sagelite-node-ok real trigonometric evaluation smoke')"
run_node_import "real hyperbolic evaluation smoke" "import sage.all
from sage.functions.hyperbolic import asinh, atanh, cosh, coth, csch, sech, sinh, tanh
from sage.functions.trig import tan
from sage.rings.real_mpfr import RealField
RR = RealField(53)
x = RR('3.1415')
assert repr(sinh(x)) == '11.5476653707437'
assert repr(cosh(x)) == '11.5908832931176'
assert repr(tanh(x)) == '0.996271386633702'
assert repr(tan(x / 4)) == '0.999953674278156'
assert repr(coth(x)) == '1.00374256795520'
assert repr(sech(x)) == '0.0862747018248192'
assert repr(csch(x)) == '0.0865975907592133'
assert repr(asinh(RR('0.5'))) == '0.481211825059603'
assert repr(atanh(RR('0.5'))) == '0.549306144334055'
print('sagelite-node-ok real hyperbolic evaluation smoke')"
run_node_import "real ring category epsilon smoke" "from sage.rings.complex_mpfr import ComplexField
from sage.rings.real_mpfr import RealField
complex_field = ComplexField(53)
real_field = RealField(53)
assert complex_field.is_subring(complex_field)
assert repr(complex_field.epsilon()) == '2.22044604925031e-16'
assert repr(RealField(10).epsilon()) == '0.0020'
assert repr(real_field['x'].epsilon()) == '2.22044604925031e-16'
print('sagelite-node-ok real ring category epsilon smoke')"
run_node_import "real error function evaluation smoke" "from sage.functions.error import erf, erfc
from sage.rings.complex_mpfr import ComplexField
from sage.rings.real_mpfr import RealField
C53 = ComplexField(53)
C100 = ComplexField(100)
C1000 = ComplexField(1000)
R53 = RealField(53)
R100 = RealField(100)
assert repr(erf(C100(2, 3))) == '-20.829461427614568389103088452 + 8.6873182714701631444280787545*I'
assert repr(R53(3).erf()) == '0.999977909503001'
assert repr(C53(erf(C1000(2, 3)))) == '-20.8294614276146 + 8.68731827147016*I'
assert repr(erfc(R100(1) / 2)) == '0.47950012218695346231725334611'
print('sagelite-node-ok real error function evaluation smoke')"
run_node_import "real parent numeric predicates smoke" "from sage.all import CC, RR, RLF
assert [RR._is_numerical(), CC._is_numerical()] == [True, True]
assert [RR._is_real_numerical(), RLF._is_real_numerical()] == [True, True]
assert CC._is_real_numerical() is False
print('sagelite-node-ok real parent numeric predicates smoke')"
run_node_import "real element core semantics smoke" "from sage.all import CC, QQ, RR, ZZ, parent
q = QQ(3) / 5
q._set_parent(CC)
assert str(parent(q)) == 'Complex Field with 53 bits of precision'
try:
    q._set_parent(float)
except TypeError as error:
    assert str(error) == 'Cannot convert type to sage.structure.parent.Parent'
else:
    raise AssertionError('setting an element parent to float unexpectedly succeeded')
assert repr((QQ(2) / 3).numerical_approx()) == '0.666666666666667'
assert repr(ZZ(0).n(algorithm='foo')) == '0.000000000000000'
assert repr((QQ(2) / 3).n()) == '0.666666666666667'
assert repr(RR(-1).abs()) == '1.00000000000000'
print('sagelite-node-ok real element core semantics smoke')"
run_node_import "real coercion semantics smoke" "import io
import operator
from contextlib import redirect_stdout
from sage.all import CC, QQ, RR, ZZ, RealField, parent, polygen
from sage.rings.real_mpfr import RR as RR_parent
from sage.structure.coerce import parent_is_numerical
from sage.structure.element import get_coercion_model

assert [parent_is_numerical(R) for R in [RR, CC]] == [True, True]
x = polygen(RR)
p = x**3 + 2*x - 1
assert repr(p(float('1.2'))) == '3.12800000000000'
assert repr(p(int('2'))) == '11.0000000000000'
cm = get_coercion_model()
R100 = RealField(100)
explanation = io.StringIO()
with redirect_stdout(explanation):
    cm.explain(R100, float, operator.add)
assert explanation.getvalue() == 'Right operand is numeric, will attempt coercion in both directions.\\nUnknown result parent.\\n'
assert parent(R100(1) + float(1)) is float
assert cm.common_parent(ZZ, QQ, RR) is RR_parent
real_fields = [RealField(prec) for prec in range(10, 101, 10)]
assert cm.common_parent(*real_fields) is real_fields[0]
left, right = cm.discover_coercion(RR, QQ)
assert left is None
assert right.domain() is QQ
assert right.codomain() is RR_parent
print('sagelite-node-ok real coercion semantics smoke')"
run_node_import "continued fraction real approximation smoke" "from sage.all import QQ, RealField, RealNumber, continued_fraction
from sage.repl.preparse import preparse
from sage.rings.real_mpfr import RealLiteral

assert repr(continued_fraction(QQ(1) / 2).n()) == '0.500000000000000'
assert repr(continued_fraction([0, 4]).n()) == '0.250000000000000'
assert repr(continued_fraction([12, 1, 3, 4, 2, 2, 3, 1, 2]).n(digits=4)) == '12.76'
assert continued_fraction(QQ(12) / 7).n(digits=13) == (QQ(12) / 7).n(digits=13)
assert continued_fraction(-QQ(14) / 333).n(digits=21) == (-QQ(14) / 333).n(digits=21)
for prec in [17, 24, 53, 128, 256]:
    for rnd in ['RNDN', 'RNDD', 'RNDU', 'RNDZ', 'RNDA']:
        R = RealField(prec=prec, rnd=rnd)
        assert R(continued_fraction(QQ(17) / 389)) == R(QQ(17) / 389)
a = continued_fraction(-QQ(17) / 389)
assert float(a) == float(-QQ(17) / 389)
literal = eval(preparse('1.575709393346379'))
assert type(literal) is RealLiteral
print('sagelite-node-ok continued fraction real approximation smoke')"
run_node_import "real multivariate polynomial construction smoke" "import sage.all
from sage.rings.complex_mpfr import ComplexField
from sage.rings.integer_ring import ZZ
from sage.rings.polynomial.polynomial_ring_constructor import PolynomialRing
from sage.rings.real_mpfr import RealField

CC = ComplexField()
RR = RealField()

R_real = PolynomialRing(RR, names=('x', 'y'))
try:
    ZZ(R_real(RR('0.5')))
except TypeError as err:
    assert str(err) == 'Attempt to coerce non-integral RealNumber to Integer'
else:
    raise AssertionError('non-integral real polynomial unexpectedly coerced to ZZ')

R_complex = PolynomialRing(CC, names=('x', 'y'))
x, y = R_complex.gens()
i = CC(0, 1)
F = ((0.759099196558145 + 0.845425869641446*i)*x**3
     + (84.8317207268542 + 93.8840848648033*i)*x**2*y
     + (3159.07040755858 + 3475.33037377779*i)*x*y**2
     + (39202.5965389079 + 42882.5139724962*i)*y**3)
assert F.parent() is R_complex
assert F.degree() == 3
assert len(F.dict()) == 4
assert all(coefficient.parent() is CC for coefficient in F.coefficients())
print('sagelite-node-ok real multivariate polynomial construction smoke')"
run_node_import "rational field real embeddings smoke" "import sage.all
from sage.rings.complex_mpfr import ComplexField
from sage.rings.infinity import Infinity
from sage.rings.rational_field import QQ
from sage.rings.real_mpfr import RealField

RR = RealField()
one_seventh = QQ(1) / QQ(7)
assert str(RealField(9).pi()) == '3.1'
assert QQ(RR(one_seventh)) - one_seventh == 0

completion = QQ.completion(Infinity, 53)
assert completion is RR

real_places = QQ.places()
assert len(real_places) == 1
assert real_places[0].codomain() is RR
assert real_places[0](QQ(3) / QQ(2)) == RR('1.5')

complex_place = QQ.places(prec=200, all_complex=True)[0]
assert complex_place.codomain() is ComplexField(200)
assert complex_place(QQ(3) / QQ(2)) == ComplexField(200)('1.5')

complex_embedding = QQ.complex_embedding()
assert complex_embedding.codomain() is ComplexField(53)
assert complex_embedding(one_seventh) == ComplexField(53)(one_seventh)

complex_embedding_20 = QQ.complex_embedding(20)
assert complex_embedding_20.codomain() is ComplexField(20)
assert complex_embedding_20(one_seventh) == ComplexField(20)(one_seventh)
print('sagelite-node-ok rational field real embeddings smoke')"
run_node_import "real exponential and Lambert W smoke" "import sage.all
from sage.functions.log import exp, lambert_w
from sage.rings.real_mpfr import RealField

R100 = RealField(100)
exponential = exp(R100(2))
assert exponential.parent() is R100
assert exponential.precision() == 100
assert str(exponential) == '7.3890560989306502272304274606'

lambert = lambert_w(R100(1))
assert lambert.parent() is R100
assert lambert.precision() == 100
assert str(lambert) == '0.56714329040978387299996866221'
print('sagelite-node-ok real exponential and Lambert W smoke')"
run_node_import "rational real methods smoke" "import sage.all
from sage.rings.rational_field import QQ
from sage.rings.real_double import RDF
from sage.rings.real_mpfr import RealField

R = RealField()
R100 = RealField(100)
assert str((QQ(355) / QQ(113)).continued_fraction().n(digits=10)) == '3.141592920'

a = QQ(25) / QQ(6)
assert [str(a.local_height(p)) for p in (2, 3, 5)] == [
    '0.693147180559945',
    '1.09861228866811',
    '0.000000000000000',
]
a = QQ(6) / QQ(25)
assert str(a.local_height_arch()) == '0.000000000000000'
assert str((1 / a).local_height_arch()) == '1.42711635564015'
assert str((1 / a).local_height_arch(100)) == '1.4271163556401457483890413081'
a = QQ(5) / QQ(6)
assert str(a.global_height_non_arch()) == '1.79175946922805'
assert str(a.global_height_arch()) == '0.000000000000000'

assert str(R(QQ(1) / QQ(7))) == '0.142857142857143'
assert str(R(QQ(1) / QQ(8))) == '0.125000000000000'
assert str(R(QQ(1) / QQ(6))) == '0.166666666666667'
assert str(R100(QQ(333) / QQ(106))) == '3.1415094339622641509433962264'
r = RDF(QQ(-17) / QQ(89))
assert abs(R(r).exact_rational() - QQ(-17) / QQ(89)) <= R(r.ulp()) / 2

assert str((QQ(124) / QQ(345)).log(5, 100)) == '-0.63578895682825611710391773754'
assert str((QQ(125) / QQ(8)).log(QQ(5) / QQ(2), prec=53)) == '3.00000000000000'
assert str((QQ(1) / QQ(3)).gamma(prec=100)) == '2.6789385347077476336556929410'
assert str((QQ(1) / QQ(2)).gamma(prec=100)) == '1.7724538509055160272981674833'
print('sagelite-node-ok rational real methods smoke')"
run_node_import "real Wigner evaluation smoke" "import sage.all
from sage.functions.wigner import gaunt, wigner_3j, wigner_9j
from sage.rings.real_mpfr import RealField
RR = RealField(53)
assert str(wigner_3j(2500, 2500, 5000, 2488, 2400, -4888, prec=64)) == '7.60424456883448589e-12'
try:
    wigner_9j(1, 1, 1, RR('0.5'), 1, RR('1.5'), RR('0.5'), 1, RR('2.5'), prec=64)
except ValueError as error:
    assert str(error) == 'j values must be integer or half integer and fulfill the triangle relation'
else:
    raise AssertionError('invalid Wigner 9-j inputs were accepted')
for args in (
    (RR('1.2'), 0, RR('1.2'), 0, 0, 0),
    (1, 0, 1, RR('1.1'), 0, RR('-1.1')),
):
    try:
        gaunt(*args)
    except TypeError as error:
        assert str(error) == 'Attempt to coerce non-integral RealNumber to Integer'
    else:
        raise AssertionError('non-integral Gaunt inputs were accepted')
print('sagelite-node-ok real Wigner evaluation smoke')"
run_node_import "category parameter refinement delivery smoke" "from sage.all import Algebras, CDF, Fields, GF, GroupAlgebras, Mod, Modules, QQ, Rings, VectorSpaces, ZZ, cartesian_product, oo
from sage.categories.bimodules import Bimodules
from sage.functions.bessel import bessel_I, bessel_J, bessel_K, bessel_Y
from sage.functions.exp_integral import Ei, exp_integral_e, exp_integral_e1, log_integral, log_integral_offset, sin_integral
from sage.functions.gamma import gamma, gamma_inc_lower
from sage.functions.orthogonal_polys import chebyshev_T, chebyshev_U, gen_legendre_P, gen_legendre_Q
from sage.functions.other import frac, real_nth_root
from sage.misc.sage_input import SIE_literal_stringrep, SageInputBuilder, sage_input
from sage.rings.complex_mpfr import ComplexField
from sage.rings.infinity import InfinityRing, UnsignedInfinityRing, check_comparison
from sage.rings.real_double import RDF
from sage.rings.real_mpfr import RealField, RealNumber
from sage.schemes.projective.projective_space import ProjectiveSpace
assert VectorSpaces(Fields())._subcategory_hook_(Algebras(Fields().Finite())) is True
assert Modules(Rings())._subcategory_hook_(Modules(GroupAlgebras(Rings()))) is True
assert VectorSpaces(Fields())._subcategory_hook_(Algebras(QQ)) is True
assert QQ['x'] in Algebras(Fields())
assert repr(Bimodules.an_instance()) == 'Category of bimodules over Rational Field on the left and Real Field with 53 bits of precision on the right'
CC = ComplexField()
RR = RealField()
assert repr(UnsignedInfinityRing(CC(oo))) == 'Infinity'
assert UnsignedInfinityRing.has_coerce_map_from(CC) is True
complex_infinity = CC(0, oo)
assert repr((InfinityRing(CC(oo)), InfinityRing(CC(-oo)))) == '(+Infinity, -Infinity)'
try:
    InfinityRing(complex_infinity)
except ValueError as error:
    assert str(error) == 'infinite but not with +/- phase'
else:
    raise AssertionError('complex infinity unexpectedly coerced to signed infinity')
try:
    InfinityRing(CDF(complex_infinity))
except ValueError as error:
    assert str(error) == 'infinite but not with +/- phase'
else:
    raise AssertionError('double complex infinity unexpectedly coerced to signed infinity')
assert InfinityRing.has_coerce_map_from(CC) is False
assert complex_infinity < CC(1)
for real_ring in (RR, RealField(200)):
    check_comparison(real_ring)
real_zero_vector = (RR**0)()
assert real_zero_vector.dot_product(real_zero_vector) == RR.zero()
assert real_zero_vector.parent().base_ring() is RR
assert Bimodules(CC, ZZ).element_class is Bimodules(RR, ZZ).element_class
assert VectorSpaces(CC)._subcategory_hook_(Algebras(QQ)) is False
C = cartesian_product([ZZ, QQ, CC])
assert len(C.random_element()) == 3
A = cartesian_product([ZZ, RR])
factors = A((1, RR('1.23'))).cartesian_factors()
assert factors == (ZZ(1), RR('1.23'))
assert type(factors) is tuple
assert repr(cartesian_product([QQ, ZZ, RR]).one()) == '(1, 1, 1.00000000000000)'
C = cartesian_product([QQ, ZZ, RR, GF(5)])
c = C([2, -1, 2, 2])
assert repr(c) == '(2, -1, 2.00000000000000, 2)'
assert repr(~c) == '(1/2, -1, 0.500000000000000, 3)'
try:
    ~C([0, 2, 2, 2])
except ZeroDivisionError as error:
    assert str(error) == 'rational division by zero'
else:
    raise AssertionError('noninvertible Cartesian product element was accepted')
assert repr(~C([2, 2, 2, 2])) == '(1/2, 1/2, 0.500000000000000, 3)'
P = ProjectiveSpace(QQ, 1, 'x')
P2 = ProjectiveSpace(CC, 1, 'y')
assert repr(P2) == 'Projective Space of dimension 1 over Complex Field with 53 bits of precision'
assert P2(CC)._coerce_map_from_(P(QQ)) is False
fractional_part = frac(RR('5.4'))
assert repr(fractional_part) == '0.400000000000000'
assert type(fractional_part) is RealNumber
sib = SageInputBuilder()
assert repr(sib.result(sib(RealField(200)(1.5), True))) == '1.5000000000000000000000000000000000000000000000000000000000000'
assert repr(sib.result(sib(RealField(200)(1.5), 2))) == '1.5'
assert repr(sage_input(float(42), preparse=True, verify=True)) == '# Verified\nfloat(42)'
assert repr(sage_input((ZZ(2), RR('3.5'), 'Hi'), verify=True)) == \"# Verified\n(2, 3.5, 'Hi')\"
assert isinstance(sib(RR('3.14159'), True), SIE_literal_stringrep)
assert repr(sib((RR('3.5'), -ZZ(2)))) == '{tuple: ({atomic:3.5}, {unop:- {atomic:2}})}'
positive_cube_root = real_nth_root(RR('2.'), 3)
negative_cube_root = real_nth_root(RR('-2.'), 3)
high_precision_square_root = real_nth_root(RealField(100)(2), 2)
assert repr(positive_cube_root) == '1.25992104989487'
assert repr(negative_cube_root) == '-1.25992104989487'
assert repr(high_precision_square_root) == '1.4142135623730950488016887242'
assert positive_cube_root.parent() is RR
assert negative_cube_root.parent() is RR
assert high_precision_square_root.parent().precision() == 100
exp_e = exp_integral_e(1, RealField(100)(1))
exp_e1 = exp_integral_e1(RealField(100)(1))
exp_e1_half = exp_integral_e1(RealField(200)('0.5'))
log_i = log_integral(RealField(200)('1e6'))
log_i_offset = log_integral_offset(RealField(200)('1e6'))
sin_i = sin_integral(RealField(200)('1e23'))
ei = Ei(RealField(300)('1.1'))
assert repr(exp_e) == '0.21938393439552027367716377546'
assert repr(exp_e1) == '0.21938393439552027367716377546'
assert repr(exp_e1_half) == '0.55977359477616081174679593931508523522684689031635351524829'
assert repr(log_i) == '78627.549159462181919862910747947261161321874382421767074759'
assert repr(log_i_offset) == '78626.503995682064427078066159058066548185351766843615873183'
assert repr(sin_i) == '1.5707963267948966192313288218697837425815368604836679189519'
assert repr(ei) == '2.16737827956340282358378734233807621497112737591639704719499002090327541763352339357795426'
assert exp_e.parent().precision() == 100
assert exp_e1.parent().precision() == 100
assert exp_e1_half.parent().precision() == 200
assert log_i.parent().precision() == 200
assert log_i_offset.parent().precision() == 200
assert sin_i.parent().precision() == 200
assert ei.parent().precision() == 300
R113 = RealField(113)
bessel_argument = R113('8.935761195587725798762818805462843676e-01')
bessel_argument_200 = RealField(200)(bessel_argument)
for order in range(-10, 11):
    assert bessel_J(R113(order), bessel_argument) == R113(bessel_J(order, bessel_argument_200))
bessel_y_200 = bessel_Y(0, RealField(200)(1))
bessel_i_200 = bessel_I(0, RealField(200)(1))
bessel_k_200 = bessel_K(0, RealField(200)(1))
bessel_k_128 = bessel_K(0, RealField(128)(1))
assert repr(bessel_y_200) == '0.088256964215676957982926766023515162827817523090675546711044'
assert repr(bessel_i_200) == '1.2660658777520083355982446252147175376076703113549622068081'
assert repr(bessel_k_200) == '0.42102443824070833333562737921260903613621974822666047229897'
assert repr(bessel_k_128) == '0.42102443824070833333562737921260903614'
bessel_y_53 = bessel_Y(RealField(200)(1), RR(1))
bessel_y_order_200 = bessel_Y(RealField(200)(1), 1)
assert repr(bessel_y_53) == '-0.781212821300289'
assert repr(bessel_y_order_200) == '-0.78121282130028871654715000004796482054990639071644460784383'
assert bessel_y_53.parent().precision() == 53
assert bessel_y_order_200.parent().precision() == 200
assert RR(-1).gamma().is_NaN()
assert RDF(-1).gamma().is_NaN()
assert repr(gamma_inc_lower(3, RR(2))) == '0.646647167633873'
assert repr(gamma_inc_lower(0, RR(2))) == '+infinity'
gamma_100 = gamma(RealField(100)('2.5'))
assert repr(gamma_100) == '1.3293403881791370204736256125'
assert gamma_100.parent().precision() == 100
assert RealField(1024).precision() == 1024
assert repr(chebyshev_T._evalf_(10, 3)) == '2.26195370000000e7'
assert repr(chebyshev_T._evalf_(10, 3, parent=RealField(75))) == '2.261953700000000000000e7'
assert repr(chebyshev_T._evalf_(5, RR('0.3'))) == '0.998880000000000'
for function in (chebyshev_T, chebyshev_U):
    try:
        function._evalf_(RR('1.5'), Mod(8, 9))
    except TypeError as error:
        assert str(error) == f'cannot evaluate {function} with parent Ring of integers modulo 9'
    else:
        raise AssertionError(f'{function} accepted a modular argument')
assert repr(chebyshev_T(RR('1234.5'), RDF('2.1'))) == '5.48174256255782e735'
try:
    chebyshev_T._evalf_(ZZ(10)**6, RR('0.1'))
except Exception as error:
    assert type(error).__name__ == 'NoConvergence'
    assert str(error) == 'Hypergeometric series converges too slowly. Try increasing maxterms.'
else:
    raise AssertionError('large Chebyshev evaluation unexpectedly converged')
assert repr(chebyshev_T(ZZ(10)**6, RR('0.1'))) == '0.636384327171504'
assert abs(gen_legendre_P.eval_gen_poly(1, 1, RR('0.5')) - RR('-0.866025403784439')) < RR('1e-14')
assert repr(gen_legendre_Q(2, 1, ComplexField(70)(3))) == '-39.985946443425296223 + 0.016511473614919329585*I'
print('sagelite-node-ok category parameter refinement delivery smoke')"
run_node_import "real set membership smoke" "from sage.all import QQ, ZZ
from sage.rings.complex_mpfr import ComplexField
from sage.rings.real_mpfr import RealField
from sage.sets.set import Set
CC = ComplexField()
RR = RealField()
real_set = Set(RR)
assert real_set.an_element() == RR.one()
assert Set([RR('2.5'), 4, 5, 6]).difference(Set(ZZ)) == Set([RR('2.5')])
rational_real_intersection = Set(QQ).intersection(real_set)
assert 5 in rational_real_intersection
complex_zero = CC.zero()
assert complex_zero not in rational_real_intersection
assert complex_zero not in Set(QQ).difference(Set(ZZ))
assert complex_zero not in Set(QQ).symmetric_difference(Set(ZZ))
print('sagelite-node-ok real set membership smoke')"
run_node_import "real metric space semantics smoke" "from sage.all import QQ
from sage.categories.metric_spaces import MetricSpaces
from sage.rings.complex_mpfr import ComplexField
from sage.rings.real_mpfr import RealField
CC = ComplexField()
RR = RealField()
assert CC.dist(3, 2) == RR.one()
real_plane = RR.cartesian_product(RR)
assert real_plane in MetricSpaces()
assert real_plane in MetricSpaces().Complete()
rational_real_plane = QQ.cartesian_product(RR)
assert rational_real_plane in MetricSpaces()
assert rational_real_plane not in MetricSpaces().Complete()
print('sagelite-node-ok real metric space semantics smoke')"
run_node_import "real field arithmetic semantics smoke" "import sage.all
from sage.categories.fields import Fields
from sage.rings.complex_mpfr import ComplexField
from sage.rings.polynomial.polynomial_ring_constructor import PolynomialRing
from sage.rings.real_mpfr import RealField
CC = ComplexField()
RR = RealField()
assert Fields()(RR) is RR
assert RR.fraction_field() is RR
assert CC.fraction_field() is CC
R = PolynomialRing(RR, 'x')
x = R.gen()
assert repr((x**3).gcd(x**5 + 1)) == '1.00000000000000'
assert (x**3).gcd(x**5 + x**2) == x**2
assert RR('15.0').gcd(RR('12.0')) == RR(3)
assert RR('15.0').lcm(RR('12.0')) == RR(60)
assert RR('12.0').xgcd(RR('8.0')) == (RR(4), RR(1), RR(-1))
try:
    RR.zero().factor()
except ArithmeticError as error:
    assert str(error) == 'factorization of 0.000000000000000 is not defined'
else:
    raise AssertionError('zero real factorization unexpectedly succeeded')
print('sagelite-node-ok real field arithmetic semantics smoke')"
run_node_import "Lie algebra additive identity delivery smoke" "from sage.all import LieAlgebras, QQ
L = LieAlgebras(QQ).example()
x, y = L.lie_algebra_generators()
assert 0 + x == x
assert sum((x, y)) == x + y
assert sum((x, -x)) == L.zero()
print('sagelite-node-ok Lie algebra additive identity delivery smoke')"
run_node_import "set element construction delivery smoke" "import sage.all
from sage.sets.non_negative_integers import NonNegativeIntegers
from sage.rings.integer import Integer
from sage.sets.set import Set
S = Set([1, 2, 3])
assert S(Integer(2)) == Integer(2)
try:
    S(Integer(4))
except ValueError as error:
    assert str(error) == '4 not in {1, 2, 3}'
else:
    raise AssertionError('nonmember construction unexpectedly succeeded')
nested = Set([Set([]), Set([1])])
assert nested(nested.an_element()) in nested
NN = NonNegativeIntegers(facade=False)
n = NN.from_integer(Integer(5))
assert n.parent() is NN
assert type(n) is NN.element_class
print('sagelite-node-ok set element construction delivery smoke')"
run_node_import "generic complex root delivery smoke" "from sage.all import ZZ, polygen
from sage.rings.polynomial.complex_roots import complex_roots
x = polygen(ZZ)
roots = complex_roots(x**5 - x - 1)
assert len(roots) == 5
assert all(multiplicity == 1 for _, multiplicity in roots)
print('sagelite-node-ok generic complex root delivery smoke')"
run_node_import "WASI doctest tag introspection delivery smoke" "from sage.all import QQ
from sage.misc.sageinspect import sage_getdoc
P = QQ['x,y']
x, y = P.gens()
I = P * [x, y]
doc = sage_getdoc(I.groebner_basis)
assert doc.startswith(\"WARNING: the enclosing module is marked 'needs sage.libs.singular',\\nso doctests may not pass.\")
print('sagelite-node-ok WASI doctest tag introspection delivery smoke')"
run_node_import "CPython 3.14 doc normalization smoke" "import sage.all
from sage.misc.sageinspect import sage_getdoc
from sage.rings.integer import Integer
from sage.sets.set_from_iterator import Decorator
def undocumented():
    pass
class Documented:
    '''
    docs
    '''
assert sage_getdoc(undocumented) == ''
assert sage_getdoc(Documented) == 'docs\\n'
d = Decorator()
d.f = Integer.is_prime
doc = sage_getdoc(d)
assert doc.lstrip().startswith('Test whether \"self\" is prime.')
assert 'Calls the PARI' in doc
print('sagelite-node-ok CPython 3.14 doc normalization smoke')"
run_node_import "structure native delivery smoke" "from copy import copy
from sage.all import PolynomialRing, QQ, ZZ
from sage.structure.coerce_maps import CallableConvertMap, NamedConvertMap, TryMap
named = NamedConvertMap(ZZ, QQ, '_rational_')
assert named == copy(named)
callable_map = CallableConvertMap(ZZ, QQ, lambda parent, value: QQ(value))
fallback = TryMap(callable_map, QQ.coerce_map_from(ZZ), error_types=(ValueError,))
assert callable_map == copy(callable_map)
assert fallback == copy(fallback)
R = PolynomialRing(QQ, names=('x', 'y'))
S = PolynomialRing(QQ, names=('x', 'y', 'z'))
assert R.one().gcd(R(2), algorithm='modular') == R.one()
assert R.one().gcd(S.one(), 'modular') == S.one()
print('sagelite-node-ok structure native delivery smoke')"
run_node_import "vector-space homspace delivery smoke" "from sage.all import MatrixSpace, QQ
from sage.misc.sage_unittest import TestSuite
from sage.modules.vector_space_morphism import VectorSpaceMorphism
H = MatrixSpace(QQ, ['a', 'b'], 2)
sample = H.an_element()
assert isinstance(sample, VectorSpaceMorphism)
assert sample.is_zero()
TestSuite(H).run()
print('sagelite-node-ok vector-space homspace delivery smoke')"
run_node_import "Drinfeld modular-form ring delivery smoke" "from sage.all import Frac, GF
from sage.modular.drinfeld_modform.ring import DrinfeldModularForms
A = GF(2)['T']
K = Frac(A)
T = K.gen()
M = DrinfeldModularForms(K, 3)
assert M._repr_().startswith('Ring of Drinfeld modular forms of rank 3 over Fraction Field of Univariate Polynomial Ring in T over Finite Field of size 2')
for operation in (
    lambda: M.coefficient_form(1, K(1) / (T + 1)),
    lambda: M.coefficient_forms(K(1) / T),
):
    try:
        operation()
    except ValueError as error:
        assert str(error) == 'a must be an integral element'
    else:
        raise AssertionError('non-integral coefficient input was accepted')
print('sagelite-node-ok Drinfeld modular-form ring delivery smoke')"
run_node_import "generic matrix backend delivery smoke" "import sys
from sage.all import Matrix, MatrixSpace, QQ, ZZ, random_matrix
from sage.matrix.matrix_generic_dense import Matrix_generic_dense

try:
    Matrix(ZZ, sys.maxsize, sys.maxsize)
except RuntimeError as error:
    assert str(error) == 'matrix dimensions are too large'
else:
    raise AssertionError('oversized dense matrix was accepted')

for matrix, num_bound, den_bound in (
    (random_matrix(QQ, 4, 10, den_bound=10), 2, 10),
    (random_matrix(QQ, 4, 10), 2, 2),
):
    assert all(
        -num_bound <= entry.numerator() <= num_bound
        and 1 <= entry.denominator() <= den_bound
        for entry in matrix.list()
    )

A = Matrix_generic_dense(MatrixSpace(ZZ, 3), range(9))
assert A.gcd() == 1
F, B = A.frobenius_form(2)
assert A == B**(-1) * F * B
print('sagelite-node-ok generic matrix backend delivery smoke')"
run_node_import "polynomial matrix quotient delivery smoke" "from sage.all import GF, PolynomialRing
from sage.matrix.constructor import matrix
R = PolynomialRing(GF(7), 'x')
x = R.gen()
B = matrix(R, [[x + 1, 0], [0, x - 1]])
A = matrix(R, [[(x + 1)**2, (x - 1)*(x + 2)]])
Q, remainder = A._right_quo_rem_solve(B)
assert Q == matrix(R, [[x + 1, x + 2]])
assert remainder.is_zero()
print('sagelite-node-ok polynomial matrix quotient delivery smoke')"
run_node_import "native integer rational matrix backend smoke" "from sage.all import QQ, ZZ
from sage.matrix.constructor import identity_matrix, matrix
A = matrix(QQ, [[QQ(1)/2, QQ(1)/3], [QQ(2)/5, QQ(3)/7]])
Z = matrix(ZZ, [[1, 2], [3, 5]])
assert type(A).__module__ == 'sage.matrix.matrix_rational_dense'
assert type(Z).__module__ == 'sage.matrix.matrix_integer_dense'
assert A.det() == QQ(17)/210
assert A.det(algorithm='pari') == QQ(17)/210
assert A.inverse(algorithm='flint') * A == identity_matrix(QQ, 2)
assert A.inverse(algorithm='pari') * A == identity_matrix(QQ, 2)
assert A.inverse(algorithm='iml') * A == identity_matrix(QQ, 2)
assert A.charpoly(algorithm='generic') == A.charpoly(algorithm='flint')
assert A.minpoly(algorithm='generic') == A.minpoly(algorithm='linbox')
assert A.adjugate() * A == A.det() * identity_matrix(QQ, 2)
assert A.echelon_form(algorithm='multimodular') == A.echelon_form(algorithm='flint:multimodular')
assert Z.det() == ZZ(-1)
D = matrix(ZZ, 5, [1,2,3,4,5,4,6,3,2,1,7,9,7,5,2,1,4,6,7,8,3,2,4,6,7])
D._clear_cache()
assert D.determinant(algorithm='pari') == ZZ(-21)
D._clear_cache()
assert D._det_pari(1) == ZZ(-21)
assert D._rank_pari() == 5
assert matrix(ZZ, 3, list(range(1, 10)))._rank_pari() == 2
assert matrix(ZZ, 2, 3, [1,2,3,2,4,6])._rank_pari() == 1
assert matrix(ZZ, 0, 0)._rank_pari() == 0
S = matrix(ZZ, 3, list(range(9)))
SD, SU, SV = S.smith_form()
assert SD.diagonal() == [1, 3, 0]
assert SU * S * SV == SD
T = matrix(ZZ, 3, 2, list(range(6)))
TD, TU, TV = T.smith_form()
assert TD.diagonal() == [1, 2]
assert TU * T * TV == TD
assert S.smith_form(transformation=False) == SD
E = matrix(ZZ, [[3, 0, 1], [0, 1, 0]])
assert E.elementary_divisors() == [1, 1]
assert E.transpose().elementary_divisors() == [1, 1, 0]
for nr, nc in ((2, 0), (0, 2), (0, 0)):
    E = matrix(ZZ, nr, nc)
    ED, EU, EV = E.smith_form()
    assert EU * E * EV == ED
K_input = matrix(ZZ, [[4, 7, 9, 7, 5, 0],
                      [1, 0, 5, 8, 9, 1],
                      [0, 1, 0, 1, 9, 7],
                      [4, 7, 6, 5, 1, 4]])
K_format, K = K_input._right_kernel_matrix(algorithm='pari')
assert K_format == 'computed-pari-int'
assert K == matrix(ZZ, [[26, -31, 30, -21, -2, 10],
                        [-47, -13, 48, -14, -11, 18]])
assert K_input * K.transpose() == matrix(ZZ, 4, 2)
for nr, nc in ((18, 11), (60, 55)):
    K_format, K = matrix(ZZ, nr, nc)._right_kernel_matrix()
    assert K_format == 'computed-pari-int'
    assert K == identity_matrix(ZZ, nc)
L_input = matrix(ZZ, 4, 3, [1,2,3,2,4,6,7,0,1,-1,-2,-3])
L, L_transform = L_input.LLL(algorithm='pari', transformation=True)
assert L_transform * L_input == L
assert L[:2] == matrix(ZZ, 2, 3)
assert L_input._cache == {'rank': 2}
L_input._clear_cache()
assert L_input.LLL(algorithm='pari')[:2] == matrix(ZZ, 2, 3)
assert L_input._cache == {'rank': 2}
assert Z.charpoly(algorithm='flint') == Z.charpoly(algorithm='generic')
assert Z.charpoly(algorithm='linbox') == Z.charpoly(algorithm='generic')
F, U = Z.frobenius_form(2)
assert Z == U.inverse() * F * U
assert Z.frobenius_form() == F
assert Z.frobenius_form(1) == [Z.charpoly()]
H_input = matrix(ZZ, 3, [1, 2, 3, 4, 5, 6, 7, 8, 9])
H_expected = matrix(ZZ, [[1, 2, 3], [0, 3, 6], [0, 0, 0]])
assert all(H_input.hermite_form(algorithm=name) == H_expected
           for name in ('pari', 'pari0', 'pari1', 'pari4'))
assert H_input._hnf_pari(3) == H_expected
assert H_input._hnf_pari(0, include_zero_rows=False) == H_expected[:2]
H_ntl_input = matrix(ZZ, 3, [1, 2, 3, 4, 5, 6, 7, 8, 9])
try:
    H_ntl_input.hermite_form(algorithm='ntl')
except ValueError as error:
    assert str(error) == 'ntl only computes HNF for square matrices of full rank.'
else:
    raise AssertionError('rank-deficient NTL HNF must raise ValueError')
H_full_rank = matrix(ZZ, 3, [0, 2, 3, 4, 5, 6, 7, 8, 9])
assert H_full_rank.hermite_form(algorithm='ntl') == matrix(ZZ, [[1, 0, 0], [0, 1, 0], [0, 0, 3]])
print('sagelite-node-ok native integer rational matrix backend smoke')"
run_node_import "quadratic form native matrix helper smoke" "from sage.all import Matrix, ZZ
from sage.quadratic_forms.extras import extend_to_primitive
from sage.quadratic_forms.quadratic_form import QuadraticForm
Z = Matrix(ZZ, 2, [1, 2, 3, 5])
assert Z.__pari__() is not None
A = Matrix(ZZ, 3, 2, range(6))
D = extend_to_primitive(A)
assert D[:, :2] == A
assert abs(D.det()) == 2
assert QuadraticForm(ZZ, 2, [1, 2, 3]).adjoint_primitive().coefficients() == [3, -2, 1]
print('sagelite-node-ok quadratic form native matrix helper smoke')"
run_node_import "scalar-extension map parent smoke" "from sage.all import QQ, ZZ
from sage.combinat.free_module import CombinatorialFreeModule
X = CombinatorialFreeModule(ZZ, ('x',))
Y = CombinatorialFreeModule(QQ, ('x',))
X.module_morphism(on_basis=Y.monomial, codomain=Y).register_as_coercion()
phi = Y.coerce_map_from(X)
assert phi is not None
assert phi(X.monomial('x')) == Y.monomial('x')
print('sagelite-node-ok scalar-extension map parent smoke')"
run_node_import "exterior differential delivery smoke" "from sage.all import QQ, ZZ, ExteriorAlgebra
from sage.misc.persist import dumps, loads
E = ExteriorAlgebra(QQ, ['x', 'y', 'z'])
x, y, z = E.gens()
s_coeff = {(0, 1): z, (1, 2): x, (2, 0): y}
boundary = E.boundary(s_coeff)
coboundary = E.coboundary(s_coeff)
assert loads(dumps(boundary)) is boundary
assert loads(dumps(coboundary)) is coboundary
sl2_coeff = {(0, 1): z, (2, 1): -2*y, (2, 0): 2*x}
assert str(E.boundary(sl2_coeff).chain_complex(R=ZZ).homology()[1]) == 'C2 x C2'
assert str(E.coboundary(sl2_coeff).chain_complex(R=ZZ).homology()[2]) == 'C2 x C2'
print('sagelite-node-ok exterior differential delivery smoke')"
run_node_import "Weyl display and nested-generator smoke" "from sage.all import QQ
from sage.algebras.weyl_algebra import DifferentialWeylAlgebra
from sage.repl.display.fancy_repr import SomeIPythonRepr
from sage.rings.infinity import infinity
from sage.rings.polynomial.infinite_polynomial_ring import InfinitePolynomialRing
from sage.rings.polynomial.polynomial_ring_constructor import PolynomialRing
R = PolynomialRing(QQ, 't')
t = R.gen()
D = DifferentialWeylAlgebra(R)
t, dt = D.gens()
factors = (dt**3*t**3 + dt**2*t**4).factor_differentials()
assert SomeIPythonRepr().format_string(factors) == '{(0,): 12*t^2 + 6, (1,): 8*t^3 + 18*t, (2,): t^4 + 9*t^2, (3,): t^3}'
Rx = InfinitePolynomialRing(QQ, names=('x',))
Rxy = InfinitePolynomialRing(Rx, names=('y',))
Wxy = DifferentialWeylAlgebra(Rxy)
assert Wxy.base_ring() is Rx
assert Wxy.variable_names() == ('y', 'dy')
assert DifferentialWeylAlgebra(Rxy, n=infinity) is Wxy
print('sagelite-node-ok Weyl display and nested-generator smoke')"
run_node_import "finite-field matrix smoke" "from sage.all import GF
from sage.matrix.constructor import identity_matrix, matrix
from sage.matrix.matrix_space import MatrixSpace
F7 = GF(7)
A = matrix(F7, [[1, 2], [3, 4]])
assert A.det() == F7(5)
assert A.inverse() * A == identity_matrix(F7, 2)
rhs = matrix(F7, 2, 1, [1, 0])
assert A * A.solve_right(rhs) == rhs
lhs = matrix(F7, 1, 2, [1, 0])
assert A.solve_left(lhs) * A == lhs
assert A + identity_matrix(F7, 2) == matrix(F7, [[2, 2], [3, 5]])
assert 2 * A == matrix(F7, [[2, 4], [6, 1]])
assert A.trace() == F7(5)
assert A.charpoly()(A) == matrix(F7, [[0, 0], [0, 0]])
assert A.rank() == 2
assert A.echelon_form() == matrix(F7, [[1, 0], [0, 1]])
C = matrix(F7, [[1, 2], [2, 4]])
assert C.rank() == 1
M = MatrixSpace(F7, 2)
B = M([1, 2, 3, 4])
assert B.parent() is M
assert B**2 == M([0, 3, 1, 1])
assert B * M.identity_matrix() == B
assert B + M.zero() == B
assert B[0, 1] == F7(2)
assert B[1, 0] == F7(3)
assert B.list() == [F7(1), F7(2), F7(3), F7(4)]
assert B.transpose()[0, 1] == F7(3)
assert M.one() == identity_matrix(F7, 2)
assert M.identity_matrix() == identity_matrix(F7, 2)
assert M.zero() == matrix(F7, [[0, 0], [0, 0]])
assert B * M.one() == B
assert M.one() * B == B
assert B - B == M.zero()
N = MatrixSpace(F7, 2, 3)
D = N([1, 2, 3, 4, 5, 6])
assert D.parent() is N
assert D.base_ring() is F7
assert D.nrows() == 2
assert D.ncols() == 3
assert D + N.zero() == D
G = matrix(F7, [[1, 2, 0], [0, 1, 3], [4, 0, 1]])
assert G.det() == F7(4)
assert G.trace() == F7(3)
assert G**2 == matrix(F7, [[1, 4, 6], [5, 1, 6], [1, 1, 1]])
assert G.charpoly()(G) == matrix(F7, 3, 3, [0, 0, 0, 0, 0, 0, 0, 0, 0])
assert G.rank() == 3
assert G.inverse() * G == identity_matrix(F7, 3)
rhs3 = matrix(F7, 3, 1, [1, 2, 3])
assert G * G.solve_right(rhs3) == rhs3
lhs3 = matrix(F7, 1, 3, [3, 2, 1])
assert G.solve_left(lhs3) * G == lhs3
print('sagelite-node-ok finite-field matrix smoke')"
run_node_import "multivariate polynomial smoke" "from sage.all import QQ, PolynomialRing
R = PolynomialRing(QQ, ('x', 'y'))
x, y = R.gens()
f = (x + y + 1)**2
assert f.coefficient({x: 1, y: 1}) == QQ(2)
assert f.subs({x: 1, y: 2}) == QQ(16)
g = (x + y + 1)**3
assert g.degree() == 3
assert g.derivative(x).coefficient({x: 1, y: 1}) == QQ(6)
assert g.derivative(y).subs({x: 1, y: 2}) == QQ(48)
assert g.monomial_coefficient(x**2*y) == QQ(3)
assert (g - (x + y + 1)**3).is_zero()
T = PolynomialRing(QQ, ('a', 'b', 'c'))
a, b, c = T.gens()
h = (a + 2*b + 3*c + 1)**2
assert h.degree() == 2
assert h.monomial_coefficient(a*b) == QQ(4)
assert h.monomial_coefficient(b*c) == QQ(12)
assert h.subs({a: 1, b: 2, c: 3}) == QQ(225)
assert h.derivative(c).subs({a: 1, b: 2, c: 3}) == QQ(90)
assert (h - (a + 2*b + 3*c + 1)**2).is_zero()
print('sagelite-node-ok multivariate polynomial smoke')"
run_node_import "fast callable interpreter smoke" "from sage.all import QQ, PolynomialRing
from sage.ext.fast_callable import ExpressionTreeBuilder, fast_callable
from sage.ext.fast_eval import fast_float
from sage.functions.all import ceil, cos, sin
K = PolynomialRing(QQ, ('x', 'y', 'z'))
x, y, z = K.gens()
zero = K(0)
compiled = fast_callable(zero)
assert compiled(0, 0, 0) == QQ(0)
assert sin != cos and sin != ceil and cos != ceil
assert len({sin, cos, ceil}) == 3
etb = ExpressionTreeBuilder(vars=('x',), domain=float)
etb_x = etb.var('x')
assert str(etb.call(sin, etb_x)) == 'sin(v_0)'
assert fast_float(K(0)).op_list() == [('load_const', 0.0), 'return']
assert fast_float(K(17)).op_list() == [('load_const', 0.0), ('load_const', 17.0), 'add', 'return']
assert fast_float(y).op_list() == [('load_const', 0.0), ('load_const', 1.0), ('load_arg', 1), ('ipow', 1), 'mul', 'add', 'return']
print('sagelite-node-ok fast callable interpreter smoke')"
run_node_import "Laurent polynomial smoke" "from sage.all import ZZ, QQ, LaurentPolynomialRing
R = LaurentPolynomialRing(QQ, 't')
t = R.gen()
f = t**2 + 2 + t**-1
assert f * t == t**3 + 2*t + 1
assert f.degree() == 2
assert f.valuation() == -1
h = f + t**-2
assert h.valuation() == -2
g = f * t**2
assert g.exponents() == [1, 2, 4]
assert g.dict() == {1: QQ(1), 2: QQ(2), 4: QQ(1)}
assert g.coefficients() == [QQ(1), QQ(2), QQ(1)]
assert (t + t**-1)**2 == t**2 + 2 + t**-2
rational = (t + 1) / (t**2 + t + 1)
assert str(rational) == '(t + 1)/(t^2 + t + 1)'
assert rational * (t**2 + t + 1) == t + 1
M = LaurentPolynomialRing(QQ, ('x', 'y'))
x, y = M.gens()
P = M.polynomial_ring()
assert P(x**2 + x*y + 1) == P.gen(0)**2 + P.gen(0)*P.gen(1) + 1
try:
    P(x**-1 + y)
except ValueError as err:
    assert 'negative exponent' in str(err)
else:
    raise AssertionError('negative Laurent exponent unexpectedly converted to polynomial')
ML = M.localization(x + 1)
xi = ML(~x)
assert M(xi) == ~x
Z = ZZ['z']
z = Z.gen()
L = Z.localization((z**2 + 1, 7))
assert L._extra_units == (Z(7), z**2 + 1)
LF = L.fraction_field()
phi = LF.coerce_map_from(L)
assert phi(L(ZZ(1) / ZZ(7))) == ZZ(1) / ZZ(7)
P0 = ZZ['u']
u = P0.gen()
P1 = P0.fraction_field()['v']
v = P1.gen()
nested = (u / (u**2 + 1))*v + 1 / (u**3 + 1)
target = ZZ['u,v'].fraction_field()
ut, vt = target.gens()
assert target(nested) == (
    (ut**4*vt + ut**2 + ut*vt + 1) /
    (ut**5 + ut**3 + ut**2 + 1)
)
G = ZZ['a,b']
a, b = G.gens()
GK = G.fraction_field()
T = GK['w']
w = T.gen()
parameter = (a + b) / (a**2 + b + 1)
left = (parameter*w + 1)**2
right = (w + parameter)**2
assert left.gcd(right) == T.one()
assert (left*(w-a)).gcd(right*(w-a)) == w - a
print('sagelite-node-ok Laurent polynomial smoke')"
run_node_import "Hamming code smoke" "import sage.all
from sage.all import GF
from sage.coding.hamming_code import HammingCode
H = HammingCode(GF(2), 3)
assert H.length() == 7
assert H.dimension() == 4
assert H.minimum_distance() == 3
print('sagelite-node-ok Hamming code smoke')"
run_node_import "number theory helper smoke" "from sage.rings.integer_ring import ZZ
from sage.arith.misc import CRT, valuation
g, s, t = ZZ(240).xgcd(ZZ(46))
assert g == ZZ(2)
assert s * ZZ(240) + t * ZZ(46) == g
assert CRT(2, 3, 5, 7) == ZZ(17)
assert valuation(ZZ(360), 2) == 3
assert ZZ(84).gcd(ZZ(30)) == ZZ(6)
assert ZZ(84).lcm(ZZ(30)) == ZZ(420)
print('sagelite-node-ok number theory helper smoke')"
run_node_import "functional helper smoke" "import sage.all
from sage.misc.flatten import flatten
from sage.misc.functional import cyclotomic_polynomial
assert flatten([[1, [2]], 3]) == [1, 2, 3]
phi5 = cyclotomic_polynomial(5, 'x')
assert phi5.degree() == 4
assert phi5(1) == 5
print('sagelite-node-ok functional helper smoke')"
run_node_import "cyclotomic real value smoke" "import sage.all
from sage.rings.polynomial.cyclotomic import cyclotomic_value
from sage.rings.real_mpfr import RealField
RR = RealField()
assert str(cyclotomic_value(30, RR('-1.0'))) == '1.00000000000000'
print('sagelite-node-ok cyclotomic real value smoke')"
run_node_import "real MPFR feature presence smoke" "import sage.all
from sage.features.sagemath import sage__rings__real_mpfr
result = sage__rings__real_mpfr().is_present()
assert bool(result)
assert repr(result) == \"FeatureTestResult('sage.rings.real_mpfr', True)\"
print('sagelite-node-ok real MPFR feature presence smoke')"
run_node_import "integer real coercion smoke" "import sage.all
from sage.rings.integer import Integer
from sage.rings.real_mpfr import RealField
value = Integer(3) + RealField()('4.0')
assert str(value) == '7.00000000000000'
high_precision = RealField(200)(Integer(9390823))
assert high_precision.parent().precision() == 200
assert str(high_precision) == '9.3908230000000000000000000000000000000000000000000000000000e6'
print('sagelite-node-ok integer real coercion smoke')"
run_node_import "integer real power smoke" "import sage.all
from sage.rings.integer import Integer
from sage.rings.real_mpfr import RealField
value = Integer(2) ** RealField()('1.5')
assert str(value) == '2.82842712474619'
print('sagelite-node-ok integer real power smoke')"
run_node_import "integer real shift diagnostics smoke" "import sage.all
from sage.rings.integer import Integer
from sage.rings.real_mpfr import RealField
shift = RealField()('2.5')
for operator, operation in [
    ('<<', lambda: Integer(1) << shift),
    ('>>', lambda: Integer(1) >> shift),
]:
    try:
        operation()
    except TypeError as err:
        assert str(err) == f'unsupported operands for {operator}: 1, 2.50000000000000'
    else:
        raise AssertionError(f'{operator} accepted a non-integral real shift')
print('sagelite-node-ok integer real shift diagnostics smoke')"
run_node_import "real field morphism smoke" "import sage.all
from sage.rings.real_mpfr import RealField
R53 = RealField()
R200 = RealField(200)
try:
    R53.hom(R200)
except TypeError as err:
    assert str(err) == (
        'natural coercion morphism from Real Field with 53 bits of precision '
        'to Real Field with 200 bits of precision not defined'
    )
else:
    raise AssertionError('unexpected real-field precision-raising morphism')
lower = R53.hom(RealField(15))
assert str(lower(R53('2.5'))) == '2.500'
assert str(lower(R53.pi())) == '3.142'
print('sagelite-node-ok real field morphism smoke')"
run_node_import "real preparse literals smoke" "import sage.all
from sage.all import RealNumber, ellipsis_range
from sage.repl.preparse import preparse
namespace = {
    'Ellipsis': Ellipsis,
    'RealNumber': RealNumber,
    'ellipsis_range': ellipsis_range,
}
sqrt_value = eval(preparse('15.10.sqrt()'), namespace)
assert str(sqrt_value) == '3.88587184554509'
range_value = eval(preparse('[1.0..2.0]'), namespace)
assert [str(value) for value in range_value] == [
    '1.00000000000000',
    '2.00000000000000',
]
print('sagelite-node-ok real preparse literals smoke')"
run_node_import "real literal rename diagnostic smoke" "import sage.all
from sage.all import RealNumber
from sage.repl.preparse import preparse
from sage.rings.real_mpfr import RealLiteral
literal = eval(preparse('3.14'), {'RealNumber': RealNumber})
assert type(literal) is RealLiteral
try:
    literal.rename('pi')
except NotImplementedError as err:
    assert str(err) == 'object does not support renaming: 3.14000000000000'
else:
    raise AssertionError('real literal unexpectedly supported renaming')
print('sagelite-node-ok real literal rename diagnostic smoke')"
run_node_import "spike function real epsilon smoke" "import sage.all
from sage.all import Integer, RealNumber
from sage.functions.spike_function import spike_function
from sage.repl.preparse import preparse
namespace = {
    'Integer': Integer,
    'RealNumber': RealNumber,
    'spike_function': spike_function,
}
spike = eval(
    preparse('spike_function([(-3,4), (-1,1), (2,3)], 0.001)'),
    namespace,
)
assert str(spike.eps) == '0.00100000000000000'
print('sagelite-node-ok spike function real epsilon smoke')"
run_node_import "real field object module lookup smoke" "import sage.all
from sage.misc.sageinspect import find_object_modules
assert find_object_modules(sage.all.RR(0).parent()) == {
    'sage.rings.real_mpfr': ['RR'],
}
print('sagelite-node-ok real field object module lookup smoke')"
run_node_import "immutable real matrix copy smoke" "from copy import copy
from sage.all import Integer, RR, RealNumber, matrix
from sage.repl.preparse import preparse
real_field = RR(0).parent()
namespace = {
    'Integer': Integer,
    'RR': real_field,
    'RealNumber': RealNumber,
    'matrix': matrix,
}
A = eval(preparse('matrix(RR,2,[1,10,3.5,2])'), namespace)
A.set_immutable()
B = copy(A)
assert B is not A
assert B == A
assert B.is_mutable()
print('sagelite-node-ok immutable real matrix copy smoke')"
run_node_import "frieze real field change-ring smoke" "from sage.combinat.path_tableaux.frieze import FriezePattern
from sage.rings.real_mpfr import RealField
frieze = FriezePattern([1, 2, 7, 5, 3, 7, 4, 1]).change_ring(RealField())
assert repr(frieze) == (
    '[0.000000000000000, 1.00000000000000, 2.00000000000000, '
    '7.00000000000000, 5.00000000000000, 3.00000000000000, '
    '7.00000000000000, 4.00000000000000, 1.00000000000000, '
    '0.000000000000000]'
)
assert frieze.parent().base_ring() is frieze[0].parent()
print('sagelite-node-ok frieze real field change-ring smoke')"
run_node_import "weak dictionary complex-field copy smoke" "from copy import copy
from sage.all import CC, QQ, ZZ
from sage.misc.weak_dict import WeakValueDictionary
complex_field = CC(0).parent()
D = WeakValueDictionary()
D[1] = QQ
D[2] = ZZ
D[None] = complex_field
E = copy(D)
assert E is not D
assert set(E.items()) == set(D.items())
assert E[None] is complex_field
print('sagelite-node-ok weak dictionary complex-field copy smoke')"
run_node_import "formal sums over real fields smoke" "from sage.all import Integer, RR
from sage.misc.latex import latex
from sage.repl.preparse import preparse
from sage.structure.formal_sum import FormalSum, FormalSums
formal_sum = eval(
    preparse('FormalSum([(1,2), (5, 8/9), (-3, 7)])'),
    {
        'FormalSum': FormalSum,
        'Integer': Integer,
    },
)
assert latex(formal_sum) == r'2 + 5\cdot \frac{8}{9} - 3\cdot 7'
real_field = RR(0).parent()
action = FormalSums(real_field).get_action(real_field)
assert repr(action) == (
    'Right scalar multiplication by Real Field with 53 bits of precision '
    'on Abelian Group of all Formal Finite Sums over Real Field with 53 bits of precision'
)
print('sagelite-node-ok formal sums over real fields smoke')"
run_node_import "spectrum over real field smoke" "from sage.all import RR
from sage.schemes.generic.spec import SpecFunctor
real_field = RR(0).parent()
spectrum = SpecFunctor()(real_field)
assert repr(spectrum) == 'Spectrum of Real Field with 53 bits of precision'
print('sagelite-node-ok spectrum over real field smoke')"
run_node_import "affine real point-set smoke" "from sage.all import QQ, RR
from sage.schemes.affine.affine_space import AffineSpace
real_field = RR(0).parent()
plane = AffineSpace(2, QQ)
points = plane(real_field)
assert repr(points) == (
    'Set of rational points of Affine Space of dimension 2 '
    'over Real Field with 53 bits of precision'
)
print('sagelite-node-ok affine real point-set smoke')"
run_node_import "affine complex plane smoke" "from sage.all import CC
from sage.schemes.affine.affine_space import AffineSpace
complex_field = CC(0).parent()
plane = AffineSpace(complex_field, 2, names=('x', 'y'))
assert repr(plane) == (
    'Affine Space of dimension 2 over Complex Field with 53 bits of precision'
)
assert tuple(map(str, plane.gens())) == ('x', 'y')
assert plane.base_ring() is complex_field
print('sagelite-node-ok affine complex plane smoke')"
run_node_import "product projective complex space smoke" "from sage.all import CC
from sage.schemes.product_projective.space import ProductProjectiveSpaces
complex_field = CC(0).parent()
space = ProductProjectiveSpaces([1, 2], complex_field, 'z')
assert repr(space) == (
    'Product of projective spaces P^1 x P^2 '
    'over Complex Field with 53 bits of precision'
)
assert tuple(map(str, space.gens())) == ('z0', 'z1', 'z2', 'z3', 'z4')
assert tuple(space.dimension_relative_components()) == (1, 2)
assert space.base_ring() is complex_field
print('sagelite-node-ok product projective complex space smoke')"
run_node_import "complex Laurent series pickle smoke" "from sage.all import CC
from sage.misc.persist import loads
from sage.rings.laurent_series_ring import LaurentSeriesRing
complex_field = CC(0).parent()
ring = LaurentSeriesRing(complex_field, 'q')
assert repr(ring) == (
    'Laurent Series Ring in q over Complex Field with 53 bits of precision'
)
assert repr(ring.gen()) == '1.00000000000000*q'
assert ring.base_ring() is complex_field
assert loads(ring.dumps()) == ring
print('sagelite-node-ok complex Laurent series pickle smoke')"
run_node_import "complex power series pickle smoke" "from sage.all import CC, PowerSeriesRing
from sage.misc.persist import loads
complex_field = CC(0).parent()
ring = PowerSeriesRing(complex_field, 'q')
generator = ring.gen()
assert repr(ring) == (
    'Power Series Ring in q over Complex Field with 53 bits of precision'
)
assert generator.parent() is ring
assert ring.base_ring() is complex_field
assert loads(generator.dumps()) == generator
print('sagelite-node-ok complex power series pickle smoke')"
run_node_import "multivariate power series real base extension smoke" "from sage.all import PowerSeriesRing, QQ, RR
real_field = RR(0).parent()
ring = PowerSeriesRing(QQ, names=('t', 'u', 'v'))
extended = ring.base_extend(real_field)
assert repr(ring) == (
    'Multivariate Power Series Ring in t, u, v over Rational Field'
)
assert repr(extended) == (
    'Multivariate Power Series Ring in t, u, v '
    'over Real Field with 53 bits of precision'
)
assert extended.base_ring() is real_field
assert tuple(map(str, extended.gens())) == ('t', 'u', 'v')
print('sagelite-node-ok multivariate power series real base extension smoke')"
run_node_import "real-field map slot restoration smoke" "from sage.all import QQ, RR, ZZ
from sage.categories.homset import Hom
from sage.categories.map import Map
from sage.categories.rings import Rings
real_field = RR(0).parent()
f = Map(Hom(QQ, ZZ, Rings()))
f._update_slots_test({'_domain': real_field, '_codomain': QQ})
assert f.domain() is real_field
assert f.codomain() is QQ
assert f._repr_type_str is None
f._update_slots_test({
    '_repr_type_str': 'restored-map',
    '_domain': real_field,
    '_codomain': QQ,
})
assert f._repr_type_str == 'restored-map'
assert f.domain() is real_field
assert f.codomain() is QQ
print('sagelite-node-ok real-field map slot restoration smoke')"
run_node_import "poor-man map real-field composition smoke" "from sage.all import CC, RR, ZZ, factorial, sqrt
from sage.categories.poor_man_map import PoorManMap
real_field = RR(0).parent()
complex_field = CC(0).parent()
g = PoorManMap(factorial, domain=ZZ, codomain=ZZ)
h = PoorManMap(sqrt, domain=real_field, codomain=complex_field)
try:
    g * h
except ValueError as error:
    assert str(error) == (
        'the codomain Complex Field with 53 bits of precision '
        'does not coerce into the domain Integer Ring'
    )
else:
    raise AssertionError('incompatible poor-man map composition must fail')
composition = h * g
assert repr(composition) == (
    'A map from Integer Ring to Complex Field with 53 bits of precision'
)
assert composition.domain() is ZZ
assert composition.codomain() is complex_field
print('sagelite-node-ok poor-man map real-field composition smoke')"
run_node_import "multi-filtered vector-space real-field smoke" "from sage.all import QQ, RR
from sage.modules.multi_filtered_vector_space import MultiFilteredVectorSpace
real_field = RR(0).parent()
changed = MultiFilteredVectorSpace(3, base_ring=QQ).change_ring(real_field)
direct = MultiFilteredVectorSpace(123, base_ring=real_field)
assert repr(changed) == 'Unfiltered RR^3'
assert repr(direct) == 'Unfiltered RR^123'
assert changed.base_ring() is real_field
assert direct.base_ring() is real_field
assert changed.dimension() == 3
assert direct.dimension() == 123
print('sagelite-node-ok multi-filtered vector-space real-field smoke')"
run_node_import "fraction-field complex Laurent common-parent smoke" "from sage.all import CC, QQ, LaurentPolynomialRing, PolynomialRing
from sage.structure.element import coercion_model
rational_fraction = PolynomialRing(QQ, 't').fraction_field()
complex_laurent = LaurentPolynomialRing(CC, 't')
common = coercion_model.common_parent(rational_fraction, complex_laurent)
assert common is complex_laurent.fraction_field()
assert repr(common) == (
    'Fraction Field of Univariate Polynomial Ring in t '
    'over Complex Field with 53 bits of precision'
)
print('sagelite-node-ok fraction-field complex Laurent common-parent smoke')"
run_node_import "real fraction-field reduction smoke" "from sage.rings.polynomial.polynomial_ring_constructor import PolynomialRing
from sage.rings.real_mpfr import RealField
real_field = RealField(10)
ring = PolynomialRing(real_field, 'x')
x = ring.gen()
value = (x**2 + 2*x + 1) / (x + 1)
assert repr(value) == '(x^2 + 2.0*x + 1.0)/(x + 1.0)'
value.reduce()
assert repr(value) == 'x + 1.0'
assert value.parent().base_ring() is real_field
print('sagelite-node-ok real fraction-field reduction smoke')"
run_node_import "integer real square root smoke" "import sage.all
from sage.rings.integer import Integer
from sage.rings.complex_mpfr import ComplexNumber
from sage.rings.real_mpfr import RealNumber
value = Integer(2).sqrt(prec=10)
assert value.parent().precision() == 10
assert str(value) == '1.4'
high_precision = Integer(2).sqrt(prec=100)
assert high_precision.parent().precision() == 100
assert str(high_precision) == '1.4142135623730950488016887242'
all_high_precision = Integer(2).sqrt(prec=100, all=True)
assert [value.parent().precision() for value in all_high_precision] == [100, 100]
assert [str(value) for value in all_high_precision] == [
    '1.4142135623730950488016887242',
    '-1.4142135623730950488016887242',
]
assert type(Integer(5).sqrt(prec=53)) is RealNumber
assert type(Integer(-5).sqrt(prec=53)) is ComplexNumber
assert type(Integer(0).sqrt(prec=53)) is RealNumber
print('sagelite-node-ok integer real square root smoke')"
run_node_import "real parent smoke" "import sage.all
from sage.rings.real_mpfr import RealField
from sage.structure.element import parent
value = RealField()('42.0')
assert parent(value) is value.parent()
assert str(parent(value)) == 'Real Field with 53 bits of precision'
print('sagelite-node-ok real parent smoke')"
run_node_import "integer real logarithm smoke" "import sage.all
from sage.rings.integer import Integer
from sage.rings.real_mpfr import RealField
value = Integer(124).log(5, 100)
assert str(value) == '2.9950093311241087454822446806'
large = Integer(3) ** 100000
assert str(large.log(3, 53)) == '100000.000000000'
assert str((large + 1).log(3, 53)) == '100000.000000000'
very_high = (large + 1).log(3, 1000)
assert very_high.parent().precision() == 1000
assert very_high == 100000
assert str(large.log(RealField()('2.5'), prec=53)) == '119897.784671579'
print('sagelite-node-ok integer real logarithm smoke')"
run_node_import "integer exact real logarithm smoke" "import sage.all
from sage.rings.integer import Integer
value = Integer(125).log(5, prec=53)
assert str(value) == '3.00000000000000'
print('sagelite-node-ok integer exact real logarithm smoke')"
run_node_import "explicit FLINT integer polynomial delivery" "from sage.all import ZZ, PolynomialRing
R = PolynomialRing(ZZ, 'x', implementation='FLINT')
x = R.gen()
assert type(x).__module__ == 'sage.rings.polynomial.polynomial_integer_dense_flint'
assert (x + 1) * (x - 1) == x**2 - 1
assert (x**10 - 1).factor().value() == x**10 - 1
print('sagelite-node-ok explicit FLINT integer polynomial delivery')"

run_node_import "unsupported FLINT polynomial imports fail closed" "import sage.all
import sage.rings.polynomial.polynomial_integer_dense_flint
modules = [
    'sage.rings.polynomial.polynomial_rational_flint',
    'sage.rings.polynomial.polynomial_zmod_flint',
]
for module in modules:
    try:
        __import__(module)
    except ImportError as err:
        assert 'disabled on CoWasm WASI' in str(err)
    else:
        raise AssertionError(f'{module} should fail closed on WASI')
print('sagelite-node-ok unsupported FLINT polynomial imports fail closed')"

run_node_import "cypari2 PARI runtime smoke" "from cypari2 import Pari, PariError, objtogen
from cypari2 import _pari_runtime_probe as pari_probe
assert pari_probe.eval_long('2+3') == 5
assert pari_probe.eval_long('primepi(10000)') == 1229
assert pari_probe.eval_long('factorback(factor(360))') == 360
assert pari_probe.eval_long('znorder(Mod(2,101))') == 100
assert pari_probe.eval_long('polisirreducible(x^2+1)') == 1
assert pari_probe.eval_long('ellcard(ellinit([0,-1]), 5)') == 6
assert pari_probe.check_error_recovery() == 'caught=e_INV recovered=221'
assert str(objtogen([1, 2, 3])) == '[1, 2, 3]'
pari = Pari()
assert str(pari('2+3')) == '5'
assert pari(5).__hash__() == pari(5).__hash__()
assert str(pari('primepi(10^6)')) == '78498'
assert str(pari('factorback(factor(360))')) == '360'
assert str(pari('znorder(Mod(2,101))')) == '100'
assert str(pari('polisirreducible(x^2+1)')) == '1'
assert str(pari('ellcard(ellinit([0,-1]), 5)')) == '6'
f = pari('y^2 + 6')
y = f.variable()
assert str(y) == 'y'
assert f.change_variable_name('y') is f
renamed = f.change_variable_name('x')
assert str(renamed) == 'x^2 + 6'
assert renamed is not f
assert str(f) == 'y^2 + 6'
quartic = pari('y^4 - 3*y + 7')
quartic_basis = quartic.nfbasis()
quartic_nf = pari([quartic, quartic_basis]).nfinit()
assert quartic.poldegree() > 1
assert str(quartic_basis) == '[1, y, y^2, y^3]'
assert str(quartic_nf[:4]) == '[y^4 - 3*y + 7, [0, 2], 85621, 1]'
quartic_diff = quartic_nf.nf_get_diff()
assert [[int(quartic_diff[row, column]) for column in range(4)] for row in range(4)] == [
    [85621, 66591, 35930, 14526], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]
]
assert str(quartic_nf.nf_get_zk() * quartic_diff) == '[85621, y + 66591, y^2 + 35930, y^3 + y^2 + 14524]'
quartic_different_basis = quartic_nf.nf_get_zk() * quartic_diff
assert [int(value.poldegree(value.variables()[0])) if value.variables() else 0 for value in quartic_different_basis] == [0, 1, 2, 3]
assert quartic_nf.nf_get_sign() == [0, 2]
cubic = pari('y^3 - 17')
cubic_nf = pari([cubic, cubic.nfbasis()]).nfinit()
assert str(cubic_nf.nf_get_zk()) == '[1, 1/3*y^2 - 1/3*y + 1/3, y]'
assert str(cubic_nf.getattr('zk')) == '[1, 1/3*y^2 - 1/3*y + 1/3, y]'
assert cubic_nf.nf_get_sign() == [1, 1]
from sage.rings.number_field.number_field import NumberField
from sage.rings.polynomial.polynomial_ring_constructor import PolynomialRing
from sage.rings.rational_field import QQ
Qx = PolynomialRing(QQ, 'x')
x = Qx.gen()
quadratic_field = NumberField(x**2 + 23, 'a')
quadratic_generator = quadratic_field.gen()
quadratic_different = quadratic_field.different()
assert quadratic_different.__class__.__name__ == 'NumberFieldFractionalIdeal'
assert quadratic_different.number_field() is quadratic_field
assert quadratic_different is quadratic_field.different()
assert quadratic_different.norm() == 23
assert repr(quadratic_different) == 'Fractional ideal (a)'
quadratic_different_square = quadratic_different * quadratic_different
assert quadratic_different_square.number_field() is quadratic_field
assert quadratic_different_square.norm() == 529
assert repr(quadratic_different_square) == 'Fractional ideal (23)'
quadratic_different_quotient = quadratic_different_square / quadratic_different
assert quadratic_different_quotient.number_field() is quadratic_field
assert quadratic_different_quotient.norm() == 23
assert repr(quadratic_different_quotient) == 'Fractional ideal (a)'
assert repr(quadratic_different / quadratic_different) == 'Fractional ideal (1)'
quadratic_different_square_inverse = ~quadratic_different_square
assert quadratic_different_square_inverse.norm() == QQ(1) / 529
assert repr(quadratic_different_square_inverse) == 'Fractional ideal (1/23)'
assert repr(quadratic_different_square_inverse * quadratic_different_square) == 'Fractional ideal (1)'
quadratic_different_cube_via_pari = quadratic_field.ideal(
    quadratic_field.pari_nf().idealpow(quadratic_different, 3)
)
assert quadratic_different_cube_via_pari.number_field() is quadratic_field
assert quadratic_different_cube_via_pari.norm() == 12167
assert repr(quadratic_different_cube_via_pari) == 'Fractional ideal (23*a)'
assert repr(quadratic_field.ideal(quadratic_field.pari_nf().idealpow(quadratic_different, 0))) == 'Fractional ideal (1)'
assert repr(quadratic_field.ideal(quadratic_field.pari_nf().idealpow(quadratic_different, -1))) == 'Fractional ideal (1/23*a)'
quadratic_intersection = quadratic_field.ideal(
    quadratic_field.pari_nf().idealintersect(quadratic_different, quadratic_different_square)
)
assert quadratic_intersection.number_field() is quadratic_field
assert quadratic_intersection.norm() == 529
assert repr(quadratic_intersection) == 'Fractional ideal (23)'
assert repr(quadratic_field.ideal(quadratic_field.pari_nf().idealintersect(quadratic_field.ideal(1), quadratic_different))) == 'Fractional ideal (a)'
quadratic_inverse_via_pari = quadratic_field.ideal(
    quadratic_field.pari_nf().idealinv(quadratic_different)
)
assert quadratic_inverse_via_pari.number_field() is quadratic_field
assert quadratic_inverse_via_pari.norm() == 1/23
assert repr(quadratic_inverse_via_pari) == 'Fractional ideal (1/23*a)'
assert repr(quadratic_inverse_via_pari * quadratic_different) == 'Fractional ideal (1)'
quadratic_inverse_numden = quadratic_field.pari_nf().idealnumden(quadratic_inverse_via_pari)
quadratic_inverse_numerator = quadratic_field.ideal(quadratic_inverse_numden[0])
quadratic_inverse_denominator = quadratic_field.ideal(quadratic_inverse_numden[1])
assert repr(quadratic_inverse_numerator) == 'Fractional ideal (1)'
assert repr(quadratic_inverse_denominator) == 'Fractional ideal (a)'
assert repr(quadratic_inverse_numerator / quadratic_inverse_denominator) == 'Fractional ideal (1/23*a)'
quadratic_principal_large = quadratic_field.ideal(quadratic_generator * 23**5)
quadratic_principal_reduced = quadratic_principal_large.reduce_equiv()
assert quadratic_principal_reduced.number_field() is quadratic_field
assert repr(quadratic_principal_reduced) == 'Fractional ideal (1)'
two_generator_field = NumberField(x**2 + 5, 'c')
two_generator = two_generator_field.gen()
two_generator_ideal = two_generator_field.ideal([two_generator + 2, 9])
assert two_generator_ideal.gens_two() == (9, two_generator + 2)
assert two_generator_ideal == two_generator_field.ideal(two_generator + 2)
assert two_generator_ideal != two_generator_field.ideal(3)
assert two_generator_field.ideal([
    two_generator + 5, two_generator + 8
]).gens_two() == (3, two_generator + 2)
assert two_generator_field.ideal(0).gens_two() == (0, 0)
assert two_generator_field.ideal(12).gens_two() == (12, 0)
quadratic_valuation_prime = quadratic_field.factor(23)[0][0]
assert quadratic_different_square.valuation(quadratic_valuation_prime) == 2
assert quadratic_field.ideal(1).valuation(quadratic_valuation_prime) == 0
assert repr(
    quadratic_field.ideal(0).valuation(quadratic_valuation_prime)
) == '+Infinity'
primality_field = NumberField(x**2 - 17, 'd')
assert primality_field.ideal(5).is_prime()
assert not primality_field.ideal(13).is_prime()
assert not primality_field.ideal(17).is_prime()
uniformizer_field = NumberField(x**2 + 5, 'u')
uniformizer_prime, _ = uniformizer_field.ideal(3).prime_factors()
negative_uniformizer = uniformizer_field.uniformizer(
    uniformizer_prime, 'negative'
)
assert repr(negative_uniformizer) == '1/2*u + 1/2'
assert uniformizer_field.ideal(negative_uniformizer).valuation(
    uniformizer_prime
) == 1
assert negative_uniformizer.valuation(uniformizer_prime) == 1
assert uniformizer_field(1).valuation(uniformizer_prime) == 0
assert repr(uniformizer_field(0).valuation(uniformizer_prime)) == '+Infinity'
quadratic_two_ideal = quadratic_field.ideal(2)
quadratic_three_ideal = quadratic_field.ideal(3)
assert quadratic_field.pari_nf().idealispower(quadratic_two_ideal, 3) == 0
assert quadratic_field.pari_nf().idealispower(quadratic_two_ideal**3, 3) == 1
quadratic_one_mod_three = quadratic_two_ideal.element_1_mod(quadratic_three_ideal)
assert quadratic_one_mod_three == -2
assert quadratic_one_mod_three in quadratic_two_ideal
assert 1 - quadratic_one_mod_three in quadratic_three_ideal
quadratic_non_coprime_ideal = quadratic_field.ideal(quadratic_generator + 1)
quadratic_coprime_multiplier = quadratic_non_coprime_ideal.idealcoprime(
    quadratic_three_ideal
)
assert quadratic_coprime_multiplier in (
    -QQ(1)/6 * quadratic_generator + QQ(1)/6,
    QQ(1)/6 * quadratic_generator - QQ(1)/6,
)
assert (quadratic_coprime_multiplier * quadratic_non_coprime_ideal).is_coprime(
    quadratic_three_ideal
)
quadratic_crt = quadratic_field.idealchinese(
    [quadratic_field.ideal(5), quadratic_field.ideal(7)],
    [quadratic_generator, 1],
)
assert quadratic_crt == QQ(7)/2 * quadratic_generator - QQ(5)/2
assert quadratic_crt - quadratic_generator in quadratic_field.ideal(5)
assert quadratic_crt - 1 in quadratic_field.ideal(7)
assert quadratic_field.disc() == -23
other_quadratic_field = NumberField(x**2 - 123, 'b')
assert other_quadratic_field.different().norm() == 492
assert repr(other_quadratic_field.different()) == 'Fractional ideal (2*b)'
assert (other_quadratic_field.different()**2).norm() == 242064
assert repr(other_quadratic_field.different()**2) == 'Fractional ideal (492)'
other_quadratic_quotient = (other_quadratic_field.different()**2) / other_quadratic_field.different()
assert other_quadratic_quotient.number_field() is other_quadratic_field
assert other_quadratic_quotient.norm() == 492
assert repr(other_quadratic_quotient) == 'Fractional ideal (2*b)'
other_quadratic_square_inverse = ~(other_quadratic_field.different()**2)
assert other_quadratic_square_inverse.norm() == QQ(1) / 242064
assert repr(other_quadratic_square_inverse) == 'Fractional ideal (1/492)'
other_quadratic_cube_via_pari = other_quadratic_field.ideal(
    other_quadratic_field.pari_nf().idealpow(other_quadratic_field.different(), 3)
)
assert other_quadratic_cube_via_pari.number_field() is other_quadratic_field
assert other_quadratic_cube_via_pari.norm() == 119095488
assert repr(other_quadratic_cube_via_pari) == 'Fractional ideal (984*b)'
assert repr(other_quadratic_field.ideal(other_quadratic_field.pari_nf().idealpow(other_quadratic_field.different(), -1))) == 'Fractional ideal (1/246*b)'
other_quadratic_intersection = other_quadratic_field.ideal(
    other_quadratic_field.pari_nf().idealintersect(
        other_quadratic_field.different(), other_quadratic_field.different()**2
    )
)
assert other_quadratic_intersection.number_field() is other_quadratic_field
assert other_quadratic_intersection.norm() == 242064
assert repr(other_quadratic_intersection) == 'Fractional ideal (492)'
assert repr(other_quadratic_field.ideal(other_quadratic_field.pari_nf().idealintersect(other_quadratic_field.ideal(1), other_quadratic_field.different()))) == 'Fractional ideal (2*b)'
other_quadratic_inverse_via_pari = other_quadratic_field.ideal(
    other_quadratic_field.pari_nf().idealinv(other_quadratic_field.different())
)
assert other_quadratic_inverse_via_pari.number_field() is other_quadratic_field
assert other_quadratic_inverse_via_pari.norm() == 1/492
assert repr(other_quadratic_inverse_via_pari) == 'Fractional ideal (1/246*b)'
assert repr(other_quadratic_inverse_via_pari * other_quadratic_field.different()) == 'Fractional ideal (1)'
other_quadratic_inverse_numden = other_quadratic_field.pari_nf().idealnumden(other_quadratic_inverse_via_pari)
other_quadratic_inverse_numerator = other_quadratic_field.ideal(other_quadratic_inverse_numden[0])
other_quadratic_inverse_denominator = other_quadratic_field.ideal(other_quadratic_inverse_numden[1])
assert repr(other_quadratic_inverse_numerator) == 'Fractional ideal (1)'
assert repr(other_quadratic_inverse_denominator) == 'Fractional ideal (2*b)'
assert repr(other_quadratic_inverse_numerator / other_quadratic_inverse_denominator) == 'Fractional ideal (1/246*b)'
assert other_quadratic_field.disc() == 492
alpha = (y / 6).Mod(f)
assert str(alpha) == 'Mod(1/6*y, y^2 + 6)'
assert str(alpha.modreverse()) == 'Mod(6*y, y^2 + 1/6)'
try:
    pari('1/0')
except PariError as err:
    assert 'impossible inverse' in str(err)
else:
    raise AssertionError('PARI division by zero did not raise PariError')
assert str(pari('13*17')) == '221'
g = pari(360)
assert int(g) == 360
assert int(pari(2).Mod(101).znorder()) == 100
F = g.factor()
assert F.ncols() == 2
assert F.nrows() == 3
product = 1
for i in range(F.nrows()):
    product *= int(F[i, 0]) ** int(F[i, 1])
assert product == 360
p, e = F
assert [int(p[i]) for i in range(len(p))] == [2, 3, 5]
assert [int(e[i]) for i in range(len(e))] == [3, 2, 1]
assert str(objtogen('2+3')) == '5'
print('sagelite-node-ok cypari2 PARI runtime smoke')"

run_node_import "number field discriminant boundary" "import sage.all
from sage.rings.number_field.number_field import NumberField
from sage.rings.polynomial.polynomial_ring_constructor import PolynomialRing
from sage.rings.rational_field import QQ
x = PolynomialRing(QQ, 'x').gen()
field = NumberField(x**3 + x**2 - 2*x + 8, 'd')
assert field.discriminant() == -503
assert field.disc() == -503
print('sagelite-node-ok number field discriminant boundary')"

run_node_import "number field roots of unity boundary" "import sage.all
from sage.rings.number_field.number_field import NumberField
from sage.rings.polynomial.polynomial_ring_constructor import PolynomialRing
from sage.rings.rational_field import QQ
x = PolynomialRing(QQ, 'x').gen()
field = NumberField(x**2 + 1, 'i')
assert field.zeta_order() == 4
assert field.number_of_roots_of_unity() == 4
assert field.primitive_root_of_unity() == field.gen()
assert field.roots_of_unity() == [field.gen(), -1, -field.gen(), 1]
print('sagelite-node-ok number field roots of unity boundary')"

run_node_import "number field isomorphism boundary" "import sage.all
from sage.rings.number_field.number_field import NumberField
from sage.rings.polynomial.polynomial_ring_constructor import PolynomialRing
from sage.rings.rational_field import QQ
x = PolynomialRing(QQ, 'x').gen()
base_field = NumberField(x**2 + 1, 'a')
isomorphic_field = NumberField(x**2 + 4, 'b')
nonisomorphic_field = NumberField(x**2 + 5, 'c')
assert base_field.is_isomorphic(isomorphic_field)
assert not base_field.is_isomorphic(nonisomorphic_field)
result, maps = base_field.is_isomorphic(isomorphic_field, True)
assert result and len(maps) == 2
print('sagelite-node-ok number field isomorphism boundary')"

run_node_import "bounded norm number field ideals boundary" "import sage.all
from sage.rings.number_field.number_field import NumberField
from sage.rings.polynomial.polynomial_ring_constructor import PolynomialRing
from sage.rings.rational_field import QQ
x = PolynomialRing(QQ, 'x').gen()
field = NumberField(x**2 + 23, 'a')
ideals = field.ideals_of_bdd_norm(5)
assert list(ideals) == [1, 2, 3, 4, 5]
assert [len(ideals[n]) for n in ideals] == [1, 2, 2, 3, 0]
assert [[I.norm() for I in ideals[n]] for n in ideals] == [
    [1], [2, 2], [3, 3], [4, 4, 4], []
]
print('sagelite-node-ok bounded norm number field ideals boundary')"

run_node_import "Sage PARI factorization boundary" "from sage.rings.integer_ring import ZZ
from sage.rings.factorint_pari import factor_using_pari
assert factor_using_pari(ZZ(360)) == [(ZZ(2), 3), (ZZ(3), 2), (ZZ(5), 1)]
assert factor_using_pari(ZZ(2**31 - 1)) == [(ZZ(2147483647), 1)]
print('sagelite-node-ok Sage PARI factorization boundary')"

run_node_import "Sage PARI rational converter boundary" "from sage.all import QQ
from sage.libs.pari import pari
from sage.libs.pari.convert_sage import new_gen_from_rational
q = QQ(1) / QQ(7)
g = new_gen_from_rational(q)
assert str(g) == '1/7'
assert str(pari(q)) == '1/7'
assert QQ(pari(q)) == q
print('sagelite-node-ok Sage PARI rational converter boundary')"

run_node_import "Sage PARI finite-field ownership boundary" "from sage.all import FiniteField, PolynomialRing
p = 13189065031705623239
Fq = FiniteField(p**3, 'a')
owned = Fq(9288).__pari__()
assert str(owned) == '9288'
Fq_X = PolynomialRing(Fq, 'x')
pol = Fq_X('x^9 + 13189065031705622723*x^7 + 13189065031705622723*x^6 + 9288*x^5 + 18576*x^4 + 13189065031705590731*x^3 + 13189065031705497851*x^2 + 13189065031705497851*x + 13189065031705581443')
roots = [root for root, _multiplicity in pol.roots()]
reconstructed = Fq_X.one()
for root in roots:
    reconstructed *= Fq_X.gen() - root
assert reconstructed == pol
from sage.rings.finite_rings.hom_finite_field import FrobeniusEndomorphism_finite_field
K125 = FiniteField(5**3, 't')
try:
    FrobeniusEndomorphism_finite_field(K125, K125.gen())
except TypeError as error:
    assert str(error) == 'n (=t) is not an integer'
else:
    raise AssertionError('finite-field Frobenius accepted a non-integer power')
from sage.rings.finite_rings.hom_finite_field import FiniteFieldHomomorphism_generic
section_domain = FiniteField(3**7, 's')
section_codomain = FiniteField(3**21, 'S')
embedding = FiniteFieldHomomorphism_generic(section_domain.Hom(section_codomain))
assert embedding.section()(embedding(section_domain.gen())) == section_domain.gen()
from sage.categories.homset import End
homset_field = FiniteField(25, 'h')
h = homset_field.gen()
assert [phi(h) for phi in End(homset_field)] == [4*h + 1, h]
root_field = FiniteField(4, 'r')
r = root_field.gen()
assert root_field(1).nth_root(0, all=True) == [r, r + 1, root_field(1)]
try:
    homset_field(0).multiplicative_order()
except ArithmeticError as error:
    assert str(error) == 'multiplicative order of 0 not defined'
else:
    raise AssertionError('zero unexpectedly had a multiplicative order')
invariant_field = FiniteField(3**4, 'm')
invariant_element = invariant_field.gen()**20
assert str(invariant_element.charpoly('y')) == 'y^4 + 2*y^2 + 1'
assert str(invariant_element.minpoly('y')) == 'y^2 + 1'
print('sagelite-node-ok Sage PARI finite-field ownership boundary')"

: >"$followups_file"
cat >>"$followups_file" <<'EOFOLLOWUPS'
sagelite-followup: rational polynomial roots over QQ exit before the Node.js polynomial helper smoke marker when promoted to the standalone import ladder.
sagelite-followup: integer matrix right_kernel exits before the Node.js linear algebra smoke marker when promoted to the standalone import ladder.
sagelite-followup: free-module basis and diagonal_matrix promotion need sage.rings.polynomial.plural packaged before Sequence-backed constructors can enter the standalone smoke.
sagelite-followup: rectangular finite-field matrix row/column materialization triggers a dynamic-load malloc import LinkError when promoted to the Electron-shaped smoke.
sagelite-followup: finite-field matrix row/column views, submatrix extraction, deletion, and row/column mutation pass isolated Electron-shaped probes but trigger the same dynamic-load malloc LinkError in the combined packaged smoke.
EOFOLLOWUPS
run_node_import \
  "initialized FLINT fmpz_poly_sage helper import" \
  "from sage.rings.integer_ring import ZZ
from sage.rings.rational_field import QQ
print('sagelite-node-start initialized FLINT fmpz_poly_sage helper import')
import sage.libs.flint.fmpz_poly_sage
print('sagelite-node-ok initialized FLINT fmpz_poly_sage helper import')"
run_node_import \
  "libbraiding wrapper smoke" \
  "import sage.libs.braiding as braiding
assert callable(braiding.leftnormalform)
print('sagelite-node-ok libbraiding wrapper smoke')"
run_node_import \
  "lrcalc Python extension smoke" \
  "import lrcalc
assert lrcalc.lrcoef([2, 1], [1], [2]) == 1
print('sagelite-node-ok lrcalc Python extension smoke')"
run_node_import \
  "basic graph polynomial and GAP-free ordering smoke" \
  "import sage.rings.all
from sage.all import BipartiteGraph, DiGraph, GF, Matrix, digraphs, graphs
from sage.graphs.graph import Graph
from sage.graphs.graph_generators_pyx import RandomGNP
assert graphs.PathGraph(3).order() == 3
assert digraphs.Complete(3).order() == 3
random_graph = RandomGNP(12, .25, seed=0)
assert random_graph.order() == 12
assert random_graph.size() > 0
assert random_graph.edges(sort=True, labels=False) == RandomGNP(12, .25, seed=0).edges(sort=True, labels=False)
assert graphs.RandomGNP(12, .25, seed=0).edges(sort=True, labels=False) == random_graph.edges(sort=True, labels=False)
gray_graph = graphs.GrayGraph()
assert gray_graph.order() == 54
assert gray_graph.size() == 81
ordering_matrix = Matrix(GF(2), [[0, 1], [1, 0]])
row_ordering, column_ordering = ordering_matrix.doubly_lexical_ordering()
assert repr(row_ordering) == '(1,2)'
assert repr(column_ordering) == '()'
assert row_ordering.dict() == {1: 2, 2: 1}
ordering_matrix.permute_rows_and_columns(row_ordering, column_ordering)
assert ordering_matrix == Matrix(GF(2), [[1, 0], [0, 1]])
assert not graphs.CycleGraph(6).is_chordal_bipartite()
is_chordal, certificate = graphs.Grid2dGraph(2, 6).is_chordal_bipartite(certificate=True)
assert is_chordal
assert len(certificate) == 16
G = Graph([(1, 2), (2, 3)])
assert G.is_connected()
assert DiGraph(G).order() == 3
assert BipartiteGraph(graphs.CycleGraph(4)).order() == 4
assert str(G.chromatic_polynomial()) == 'x^3 - 2*x^2 + x'
assert str(G.chromatic_polynomial(algorithm='Python')) == 'x^3 - 2*x^2 + x'
assert str(G.matching_polynomial()) == 'x^3 - 2*x'
assert G.spanning_trees_count() == 1
assert G.rank_decomposition()[0] == 1
print('sagelite-node-ok basic graph polynomial and GAP-free ordering smoke')"

run_node_import \
  "simplicial complex catalog startup smoke" \
  "from sage.all import MomentAngleComplex, Simplex, SimplicialComplex, simplicial_complexes
assert Simplex((0, 1)).dimension() == 1
assert SimplicialComplex([[0, 1]]).dimension() == 1
assert simplicial_complexes.Sphere(2).dimension() == 2
assert str(simplicial_complexes.SurfaceOfGenus(3)) == 'Triangulation of an orientable surface of genus 3'
assert str(MomentAngleComplex(simplicial_complexes.KleinBottle())).startswith('Moment-angle complex of Simplicial complex')
print('sagelite-node-ok simplicial complex catalog startup smoke')"

run_node_import \
  "simplicial set catalog startup smoke" \
  "from sage.all import simplicial_sets
eta = simplicial_sets.HopfMap()
assert eta.domain().dimension() == 3
assert eta.codomain().dimension() == 2
print('sagelite-node-ok simplicial set catalog startup smoke')"

run_node_import \
  "cell complex catalog import smoke" \
  "from sage.topology.cubical_complex import cubical_complexes
from sage.topology.delta_complex import delta_complexes
assert delta_complexes.Sphere(3).dimension() == 3
assert cubical_complexes.Torus().dimension() == 2
print('sagelite-node-ok cell complex catalog import smoke')"

run_node_import \
  "planarity backend delivery smoke" \
  "from sage.all import graphs
cycle = graphs.CycleGraph(5)
assert cycle.is_planar(set_embedding=True)
assert set(cycle._embedding) == set(cycle)
planar, obstruction = graphs.CompleteBipartiteGraph(3, 3).is_planar(kuratowski=True)
assert not planar
assert obstruction is not None
print('sagelite-node-ok planarity backend delivery smoke')"

run_node_import \
  "graph genus extension delivery smoke" \
  "from sage.all import graphs
from sage.graphs.genus import simple_connected_graph_genus
assert simple_connected_graph_genus(graphs.CycleGraph(5)) == 0
assert simple_connected_graph_genus(graphs.CompleteGraph(5)) == 1
print('sagelite-node-ok graph genus extension delivery smoke')"

run_node_import \
  "Bliss canonical labeling backend smoke" \
  "from sage.all import Graph, graphs
from sage.graphs.bliss import canonical_form
petersen = graphs.PetersenGraph()
canonical = canonical_form(petersen, return_graph=True)
assert canonical.is_isomorphic(petersen)
relabeled = Graph([(vertex + 10, neighbor + 10) for vertex, neighbor in petersen.edge_iterator(labels=False)])
assert canonical_form(petersen) == canonical_form(relabeled)
print('sagelite-node-ok Bliss canonical labeling backend smoke')"

run_node_import \
  "Cliquer exact clique-search backend smoke" \
  "from sage.all import graphs
from sage.graphs.cliquer import all_cliques, clique_number, max_clique
petersen = graphs.PetersenGraph()
assert clique_number(petersen) == 2
assert len(max_clique(petersen)) == 2
assert list(all_cliques(graphs.CompleteGraph(4), 3, 3)) == [
    [1, 2, 3],
    [0, 1, 2],
    [0, 1, 3],
    [0, 2, 3],
]
assert petersen.clique_number() == 2
print('sagelite-node-ok Cliquer exact clique-search backend smoke')"

run_node_import \
  "TDLib exact tree decomposition backend smoke" \
  "from sage.all import graphs
from sage.graphs.graph_decompositions.tdlib import get_width, treedecomposition_exact
path_decomposition = treedecomposition_exact(graphs.PathGraph(7))
cycle_decomposition = treedecomposition_exact(graphs.CycleGraph(7))
assert get_width(path_decomposition) == 1
assert get_width(cycle_decomposition) == 2
print('sagelite-node-ok TDLib exact tree decomposition backend smoke')"

run_node_import \
  "Gabow edge connectivity smoke" \
  "from sage.all import digraphs
from sage.graphs.edge_connectivity import GabowEdgeConnectivity
complete = digraphs.Complete(5)
assert GabowEdgeConnectivity(complete).edge_connectivity() == 4
print('sagelite-node-ok Gabow edge connectivity smoke')"

run_node_import \
  "modular decomposition without permutation groups smoke" \
  "import sage.all
from sage.graphs.graph_decompositions.modular_decomposition import (
    NodeType,
    nested_tuple_to_tree,
    relabel_tree,
    tree_to_nested_tuple,
)
tree = nested_tuple_to_tree((NodeType.SERIES, 1, 2, (NodeType.PARALLEL, 3, 4)))
relabeled = relabel_tree(tree, lambda vertex: vertex + 4)
assert tree_to_nested_tuple(relabeled) == (
    NodeType.SERIES, [5, 6, (NodeType.PARALLEL, [7, 8])]
)
print('sagelite-node-ok modular decomposition without permutation groups smoke')"

run_node_import \
  "in-memory graph database smoke" \
  "import sage.all
from sage.graphs.graph_database import GraphDatabase, GraphQuery
database = GraphDatabase()
assert sorted(database.get_skeleton()) == ['aut_grp', 'degrees', 'graph_data', 'misc', 'spectrum']
query = GraphQuery(database, display_cols=['graph6'], num_vertices=3)
assert query.number_of() == 4
assert [graph.graph6_string() for graph in query] == ['B?', 'BG', 'BW', 'Bw']
print('sagelite-node-ok in-memory graph database smoke')"

run_wasi_sdk_python_import \
  "GLPK mixed-integer delivery smoke" \
  "import sage.all
from sage.numerical.mip import MixedIntegerLinearProgram
p = MixedIntegerLinearProgram(maximization=True, solver='GLPK')
x = p.new_variable(binary=True)
p.set_objective(3*x[0] + 2*x[1])
p.add_constraint(2*x[0] + x[1], max=2)
assert p.solve() == 3.0
values = p.get_values(x)
assert values[0] == 1.0 and values[1] == 0.0
print('sagelite-wasi-sdk-ok GLPK mixed-integer delivery smoke')"

run_node_import \
  "GLPK graph optimization smoke" \
  "from sage.all import graphs
g = 3 * graphs.PetersenGraph()
n = g.order() // 3
family = [[i, i + n, i + 2*n] for i in range(n)]
representatives = g.independent_set_of_representatives(family)
assert representatives is not None and len(representatives) == n
for color in range(3):
    color_class = [v % n for v in representatives if v // n == color]
    assert g.subgraph(color_class).size() == 0
print('sagelite-node-ok GLPK graph optimization smoke')"

run_node_import \
  "graph convexity delivery smoke" \
  "from sage.all import graphs
g = graphs.PetersenGraph()
convexity = g.convexity_properties()
assert convexity.hull([1, 3]) == [1, 2, 3]
assert convexity.hull([3, 7]) == [2, 3, 7]
print('sagelite-node-ok graph convexity delivery smoke')"

run_node_import \
  "graph LaTeX color delivery smoke" \
  "from sage.all import graphs, latex
g = graphs.PathGraph(2)
g.set_latex_options(vertex_color='#ff0000', vertex_fill_color=(0.25, 0.5, 1.0), edge_color='blue')
rendered = latex(g)
assert r'\\definecolor{cv0}{rgb}{1.0,0.0,0.0}' in rendered
assert r'\\definecolor{cfv0}{rgb}{0.25,0.5,1.0}' in rendered
assert r'\\definecolor{cv0v1}{rgb}{0.0,0.0,1.0}' in rendered
print('sagelite-node-ok graph LaTeX color delivery smoke')"

run_node_import \
  "high-byte string literal delivery smoke" \
  "from sage.misc.sage_input import sage_input
value = '\\200\\300\\234'
assert value == ''.join(chr(codepoint) for codepoint in (0x80, 0xc0, 0x9c))
sage_input(value, verify=True)
print('sagelite-node-ok high-byte string literal delivery smoke')"

electron_resources_dir="$dist_dir/electron-resources"
electron_bundle_log="$dist_dir/electron-bundle.log"
electron_manifest_schema_version=349
electron_manifest_resource_kind="cowasm-sagelite-electron-resources"
electron_manifest_python_abi="cpython-314-wasm32-wasi"
electron_manifest_python_platform="wasi"
electron_manifest_smoke_contract="exact-arithmetic-polynomial-helpers-finite-field-polynomial-finite-field-matrix-linear-arithmetic-charpoly-matrix-space-finite-field-matrix-rank-multivariate-polynomial-laurent-polynomial-derivatives-matrix-rank-free-module-abelian-group-hamming-code-distance-power-tableau-set-partition-perfect-matching-derangements-subwords-finite-set-maps-tuples-partition-permutation-statistics-larger-enumeration-partition-enumeration-partition-composition-methods-permutation-enumeration-tableau-subset-integer-vector-enumeration-combinatorics-cardinality-combinat-list-roundtrip-signed-composition-integer-lists-crt-valuation-quotient-ring-modular-inverse-integer-rational-helpers-integer-methods-signed-integer-rational-helpers-extended-integer-helpers-combinat-monoid-functional-set-family-positive-integers-cypari2-pari-error-recovery-sage-pari-boundary-resource-root-env-version-manifest-self-contained-sorted-side-modules-sorted-required-resources-source-tree-state-version-required-combinat-resource-files-v64-extended-linear-polynomial-set-family-indexing-v65-integer-gcd-lcm-v66-integer-quotient-ring-operations-v67-matrix-solve-right-v68-matrix-solve-left-v69-finite-field-polynomial-quotient-list-power-v70-extended-matrix-solve-v71-rational-left-solve-v72-integer-rational-arithmetic-v73-matrix-power-stack-augment-v74-integer-xgcd-quotient-family-v75-polynomial-coefficients-power-v76-matrix-views-change-ring-v77-matrix-polynomial-partition-accessors-v78-polynomial-dict-partition-composition-accessors-v79-free-module-matrix-polynomial-accessors-v80-rational-matrix-inverse-v81-integer-comparison-v82-integer-bits-polynomial-truncation-v83-polynomial-composition-substitution-v84-finite-field-matrix-solve-v85-finite-field-matrix-space-v86-finite-field-matrix-accessors-v87-finite-field-matrix-space-arithmetic-v88-finite-field-matrix-space-identity-zero-v89-trivariate-polynomial-derivative-substitution-v90-finite-field-matrix-parent-indexing-v91-rational-numerator-denominator-v92-laurent-polynomial-accessors-v93-required-laurent-mpair-resource-v94-rational-3x3-matrix-v95-rational-matrix-solve-view-v96-matrix-row-column-mutation-v97-matrix-row-column-assignment-v98-matrix-row-column-combination-v99-finite-field-3x3-matrix-v100-finite-field-3x3-solve-v101-finite-field-3x3-charpoly-rank-v102-integer-zero-one-predicates-v103-rational-comparison-integer-divisibility-v104-rational-normalization-sign-v105-conway-polynomial-resource-v106-libbraiding-wrapper-v107-lrcalc-python-resource-v108-optional-gap-free-finite-field-coercion-v109"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-double-algebraic-dependency-v110-gosper-constant-homography-v111-laurent-localization-v112-laurent-fraction-normalization-v113"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-padic-lattice-pickle-v114"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-polynomial-integer-lcm-content-v115"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-exterior-differential-delivery-v116"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-weyl-display-and-nested-generators-v117"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-cpython-static-type-getattr-v118"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-ntl-gf2x-delivery-v119"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-generic-linear-group-delivery-v120"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-q-binomial-python-parent-delivery-v121"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-scalar-extension-map-parent-v122"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-weak-rpp-shape-delivery-v123"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-integer-list-envelope-delivery-v124"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pairwise-maximal-subsets-delivery-v125"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-cyclic-permutation-delivery-v126"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-fast-vector-halving-delivery-v127"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-incompatible-word-concatenation-delivery-v128"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-category-parameter-refinement-delivery-v129"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-set-element-construction-delivery-v130"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-generic-complex-root-delivery-v131"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-wasi-doctest-tag-introspection-delivery-v132"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-high-byte-string-literal-delivery-v133"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-cpython314-doc-and-structure-native-delivery-v134"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-vector-space-homspace-delivery-v135"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-drinfeld-modform-ring-delivery-v136"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-generic-matrix-backend-delivery-v137"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-polynomial-matrix-quotient-delivery-v138"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-native-integer-rational-matrix-backends-v139"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-rational-matrix-backend-completeness-v140"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-quadratic-form-native-matrix-helpers-v141"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-integer-matrix-frobenius-delivery-v142"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-integer-matrix-hnf-delivery-v143"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-integer-matrix-determinant-delivery-v144"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-integer-matrix-pari-rank-delivery-v145"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-integer-matrix-smith-delivery-v146"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-integer-matrix-right-kernel-delivery-v147"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-integer-matrix-pari-lll-delivery-v148"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-integer-matrix-elementary-divisors-v149"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-sparse-free-module-basis-matrix-v150"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-symbolic-function-identity-v151"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-random-gnp-generator-v152"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-gap-free-graph-ordering-v153"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-glpk-mip-delivery-v154"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-graph-convexity-delivery-v155"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-graph-latex-color-delivery-v156"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-nauty-wasi-subprocess-delivery-v157"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-nauty-doctest-reopen-v158"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-nauty-large-output-delivery-v159"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-nauty-genktreeg-delivery-v160"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-nauty-gentreeg-delivery-v161"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-nauty-directed-generators-delivery-v162"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-raw-wasi-subprocess-streaming-v163"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-raw-wasi-piped-stdin-v164"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-raw-wasi-subprocess-signals-v165"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-doctest-mode-v166"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-tested-module-name-v167"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-graph-database-resource-v168"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-planarity-backend-delivery-v169-edge-connectivity-v170"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-modular-decomposition-lazy-groups-v171"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-graph-genus-extension-delivery-v172"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-bliss-canonical-labeling-v173"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-tdlib-tree-decomposition-v174"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-flint-integer-polynomial-delivery-v175"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-cliquer-exact-clique-search-v176"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-ntl-gf2e-link-delivery-v177-ntl-gf2e-context-pari-v178-ntl-gf2e-default-randstate-v179-givaro-default-backend-v180-givaro-construction-key-v181"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-flint-padic-defining-polynomial-v182"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-padic-local-ntl-context-numeric-log-v183"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-constant-polynomial-localization-v184"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-recursive-fraction-polynomial-v185"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-fraction-polynomial-gcd-v186"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-lie-additive-identity-v187"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-ffelt-ownership-v188"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-ffelt-reserved-name-v189"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-finite-field-construction-flags-v190"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-finite-field-section-roots-v191"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-finite-field-givaro-invariants-v192"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-givaro-pari-conversion-v193"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-finite-field-trace-v194"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-prime-field-generator-fallback-v195"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-finite-field-core-square-charpoly-v196"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-finite-field-core-vector-space-v197"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-finite-field-core-iteration-v198"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-finite-field-pari-free-methods-v199"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-givaro-module-pari-init-v200"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-integer-range-real-literal-v201"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-set-iterator-instancedoc-v202"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-literal-srange-v203"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-bimodules-real-field-v204"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-cartesian-real-elements-v205"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-category-complex-base-v206"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-category-bimodules-real-v207"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-polygonal-real-coercion-v208"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-integer-lists-real-coercion-v209"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-generic-numerical-approx-v210"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-disjoint-set-real-literal-v211"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-fixtures-real-repr-v212"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-complex-abc-v213"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-cyclotomic-real-value-v214"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-mpfr-feature-presence-v215"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-integer-real-coercion-v216"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-integer-realfield-coercion-v217"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-structure-real-parent-v218"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-integer-real-logarithm-v219"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-integer-exact-real-logarithm-v220"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-integer-real-power-v221"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-integer-real-square-root-v222"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-integer-high-precision-square-roots-v223"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-integer-square-root-types-v224"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-integer-high-precision-logarithms-v225"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-integer-real-shift-diagnostics-v226"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-field-morphisms-v227"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-preparse-literals-v228"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-literal-rename-diagnostic-v229"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-spike-function-real-epsilon-v230"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-field-object-module-lookup-v231"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-immutable-real-matrix-copy-v232"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-frieze-real-field-change-ring-v233"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-weak-dictionary-complex-copy-v234"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-formal-sums-real-field-v235"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-spectrum-real-field-v236"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-affine-real-point-set-v237"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-affine-complex-plane-v238"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-product-projective-complex-space-v239"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-complex-laurent-series-pickle-v240"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-complex-power-series-pickle-v241"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-multivariate-power-series-real-base-extension-v242"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-field-map-slot-restoration-v243"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-poor-man-map-real-composition-v244"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-multi-filtered-vector-space-real-field-v245"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-fraction-field-complex-laurent-common-parent-v246"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-fraction-field-reduction-v247"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-finite-word-real-sturmian-factor-v248"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-trigonometric-evaluation-v249"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-hyperbolic-evaluation-v250"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-ring-category-epsilon-v251"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-error-function-evaluation-v252"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-parent-numeric-predicates-v253"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-element-core-semantics-v254"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-coercion-semantics-v255"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-continued-fraction-real-approximation-v256"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-multivariate-polynomial-construction-v257"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-rational-field-real-embeddings-v258"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-exp-lambert-evaluation-v259"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-rational-real-methods-v260"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-wigner-evaluation-v261"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-characteristic-sturmian-construction-v262"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-cartesian-magma-real-inversion-v263"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-complex-projective-coercion-v264"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-fractional-part-v265"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-sage-input-real-literals-v266"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-nth-root-v267"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-exponential-integrals-v268"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-bessel-evaluation-v269"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-gamma-evaluation-v270"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-orthogonal-polynomial-evaluation-v271"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-free-module-zero-vector-v272"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-infinity-coercion-v273"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-set-membership-v274"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-metric-space-semantics-v275"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-field-arithmetic-semantics-v276"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-functional-semantics-v277"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-pushout-semantics-v278"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-sparse-polynomial-semantics-v279"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-part-literal-semantics-v280"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-tested-module-symbolic-binomial-v281"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-complex-manifold-categories-v282"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-argument-evaluation-v283"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-quaternion-polynomial-semantics-v284"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-set-facade-conversion-v285"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-real-pushout-concrete-field-v286"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-continued-fraction-rounding-long-test-v287"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-continued-fraction-symbolic-quotient-v288"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-padic-subspace-minimal-polynomial-v289"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-padic-polynomial-factor-precision-v290"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-finite-word-unknown-length-conjugacy-v291"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-empty-species-arithmetic-v292"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-integer-list-backend-pickle-identity-v293"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-polynomial-structure-maps-v294"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-polynomial-variable-rename-v295"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-init-v296"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-integral-basis-v297"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-signature-v298"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-different-v299"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-ideal-norm-v300"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-ideal-display-v301"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-ideal-multiplication-v302"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-ideal-division-v303"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-ideal-power-v304"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-ideal-intersection-v305"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-ideal-inversion-v306"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-ideal-numden-v307"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-ideal-add-to-one-v308"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-ideal-chinese-v309"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-ideal-coprime-v310"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-ideal-reduction-v311"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-ideal-two-generators-v312"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-ideal-valuation-v313"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-ideal-primality-v314"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-ideal-approximation-v315"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-ideal-power-test-v316"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-element-valuation-v317"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-discriminant-v318"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-isomorphism-v319"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-bounded-ideals-v320"
electron_manifest_smoke_contract="${electron_manifest_smoke_contract}-pari-number-field-roots-of-unity-v321"
electron_manifest_resource_root_env_name="COWASM_SAGELITE_RESOURCE_ROOT"
electron_manifest_source_revision_file="$build_dir/.cowasm-sagelite-source-revision"
electron_manifest_source_tree_state_file="$build_dir/.cowasm-sagelite-source-tree-state"
if [ ! -s "$electron_manifest_source_revision_file" ]; then
  record_blocker "sagelite-blocked: Sagelite source revision metadata is missing."
fi
if [ ! -s "$electron_manifest_source_tree_state_file" ]; then
  record_blocker "sagelite-blocked: Sagelite source tree state metadata is missing."
fi
electron_manifest_source_revision="$(tr -d '[:space:]' <"$electron_manifest_source_revision_file")"
if ! printf '%s\n' "$electron_manifest_source_revision" |
    grep -Eq '^[0-9a-f]{40}$'; then
  record_blocker "sagelite-blocked: Sagelite source revision metadata is not a full git commit hash."
fi
electron_manifest_source_tree_state="$(tr -d '[:space:]' <"$electron_manifest_source_tree_state_file")"
case "$electron_manifest_source_tree_state" in
  clean|dirty) ;;
  *)
    record_blocker "sagelite-blocked: Sagelite source tree state metadata must be clean or dirty."
    ;;
esac
rm -rf "$electron_resources_dir"
mkdir -p "$electron_resources_dir/deps"

stage_runtime_tree() {
  local src="$1"
  local dst="$2"
  mkdir -p "$dst"
  if ! cp -al "$src/." "$dst/" 2>/dev/null; then
    rm -rf "$dst"
    mkdir -p "$dst"
    cp -a "$src/." "$dst/"
  fi
}

stage_runtime_tree "$installed_site_packages" "$electron_resources_dir/site-packages"
cp "$python_wasm/dist/python.wasm" "$electron_resources_dir/python.wasm"
cp "$repo_dir/desktop/electron/src/sagelite-manifest-common.js" "$electron_resources_dir/sagelite-manifest-common.cjs"
cp "$src_dir/sagelite-electron-smoke.cjs" "$electron_resources_dir/sagelite-electron-smoke.cjs"
mkdir -p "$electron_resources_dir/bin"
cp "$nauty_wasi_sdk/bin/directg" "$electron_resources_dir/bin/directg"
cp "$nauty_wasi_sdk/bin/geng" "$electron_resources_dir/bin/geng"
cp "$nauty_wasi_sdk/bin/genbgL" "$electron_resources_dir/bin/genbgL"
cp "$nauty_wasi_sdk/bin/genktreeg" "$electron_resources_dir/bin/genktreeg"
cp "$nauty_wasi_sdk/bin/genposetg" "$electron_resources_dir/bin/genposetg"
cp "$nauty_wasi_sdk/bin/gentreeg" "$electron_resources_dir/bin/gentreeg"
cp "$nauty_wasi_sdk/bin/gentourng" "$electron_resources_dir/bin/gentourng"
chmod +x \
  "$electron_resources_dir/bin/directg" \
  "$electron_resources_dir/bin/geng" \
  "$electron_resources_dir/bin/genbgL" \
  "$electron_resources_dir/bin/genktreeg" \
  "$electron_resources_dir/bin/genposetg" \
  "$electron_resources_dir/bin/gentreeg" \
  "$electron_resources_dir/bin/gentourng"

runtime_dep_labels=(
  cypari2
  conway_polynomials
  primecountpy
  lrcalc
  libcxx
  cysignals
  memory_allocator
  jinja2
  packaging
  platformdirs
  gmpy2
  mpmath
  numpy
  cython
)
runtime_dep_paths=(
  "$cypari2_wasi_sdk"
  "$conway_polynomials_wasi_sdk"
  "$primecountpy_wasi_sdk"
  "$lrcalc_python_wasi_sdk"
  "$libcxx_wasi_sdk"
  "$cysignals_wasi_sdk"
  "$memory_allocator_wasi_sdk"
  "$py_jinja2"
  "$py_packaging"
  "$py_platformdirs"
  "$py_gmpy2"
  "$py_mpmath"
  "$py_numpy"
  "$py_cython"
)

electron_pythonpath_parts=("site-packages")
for i in "${!runtime_dep_labels[@]}"; do
  stage_runtime_tree "${runtime_dep_paths[$i]}" "$electron_resources_dir/deps/${runtime_dep_labels[$i]}"
  electron_pythonpath_parts+=("deps/${runtime_dep_labels[$i]}")
done

electron_required_paths=(
  "bin/directg"
  "bin/genbgL"
  "bin/geng"
  "bin/genktreeg"
  "bin/genposetg"
  "bin/gentreeg"
  "bin/gentourng"
  "site-packages/sage/__init__.py"
  "site-packages/sage/all.py"
  "python.wasm"
  "site-packages/sage/env.py"
  "site-packages/sage/version.py"
  "site-packages/sage/arith/__init__.py"
  "site-packages/sage/arith/all.py"
  "site-packages/sage/arith/functions.cpython-314-wasm32-wasi.so"
  "site-packages/sage/arith/misc.py"
  "site-packages/sage/arith/power.cpython-314-wasm32-wasi.so"
  "site-packages/sage/arith/rational_reconstruction.cpython-314-wasm32-wasi.so"
  "site-packages/sage/arith/srange.cpython-314-wasm32-wasi.so"
  "site-packages/sage/algebras/quatalg/quaternion_algebra.py"
  "site-packages/sage/misc/__init__.py"
  "site-packages/sage/misc/flatten.py"
  "site-packages/sage/misc/functional.py"
  "site-packages/sage/misc/sageinspect.py"
  "site-packages/sage/misc/misc_c.cpython-314-wasm32-wasi.so"
  "site-packages/sage/functions/__init__.py"
  "site-packages/sage/functions/all.py"
  "site-packages/sage/functions/bessel.py"
  "site-packages/sage/functions/exp_integral.py"
  "site-packages/sage/functions/gamma.py"
  "site-packages/sage/functions/other.py"
  "site-packages/sage/functions/orthogonal_polys.py"
  "site-packages/sage/functions/prime_pi.cpython-314-wasm32-wasi.so"
  "site-packages/sage/features/sagemath.py"
  "site-packages/sage/categories/__init__.py"
  "site-packages/sage/categories/action.cpython-314-wasm32-wasi.so"
  "site-packages/sage/categories/algebras.py"
  "site-packages/sage/categories/algebras_with_basis.py"
  "site-packages/sage/categories/associative_algebras.py"
  "site-packages/sage/categories/category.py"
  "site-packages/sage/categories/category_types.py"
  "site-packages/sage/categories/category_cy_helper.cpython-314-wasm32-wasi.so"
  "site-packages/sage/categories/category_singleton.cpython-314-wasm32-wasi.so"
  "site-packages/sage/categories/category_with_axiom.py"
  "site-packages/sage/categories/pushout.py"
  "site-packages/sage/categories/additive_monoids.py"
  "site-packages/sage/categories/commutative_algebras.py"
  "site-packages/sage/categories/cartesian_product.py"
  "site-packages/sage/categories/enumerated_sets.py"
  "site-packages/sage/categories/finite_dimensional_algebras_with_basis.py"
  "site-packages/sage/categories/finite_dimensional_modules_with_basis.py"
  "site-packages/sage/categories/fields.py"
  "site-packages/sage/categories/groupoid.py"
  "site-packages/sage/categories/metric_spaces.py"
  "site-packages/sage/categories/manifolds.py"
  "site-packages/sage/categories/modules.py"
  "site-packages/sage/categories/modules_with_basis.py"
  "site-packages/sage/categories/monoids.py"
  "site-packages/sage/structure/__init__.py"
  "site-packages/sage/structure/category_object.cpython-314-wasm32-wasi.so"
  "site-packages/sage/structure/element.cpython-314-wasm32-wasi.so"
  "site-packages/sage/structure/coerce.cpython-314-wasm32-wasi.so"
  "site-packages/sage/structure/factory.cpython-314-wasm32-wasi.so"
  "site-packages/sage/structure/parent.cpython-314-wasm32-wasi.so"
  "site-packages/sage/structure/parent_old.cpython-314-wasm32-wasi.so"
  "site-packages/sage/structure/sequence.py"
  "site-packages/sage/structure/unique_representation.py"
  "site-packages/sage/structure/factorization.py"
  "site-packages/sage/structure/factorization_integer.py"
  "site-packages/sage/rings/factorint.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/factorint_flint.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/factorint_pari.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/__init__.py"
  "site-packages/sage/rings/abc.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/all.py"
  "site-packages/sage/rings/continued_fraction.py"
  "site-packages/sage/rings/continued_fraction_gosper.py"
  "site-packages/sage/rings/fast_arith.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/ideal.py"
  "site-packages/sage/rings/ideal_monoid.py"
  "site-packages/sage/rings/integer.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/integer_ring.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/localization.py"
  "site-packages/sage/rings/fraction_field.py"
  "site-packages/sage/rings/fraction_field_element.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/quotient_ring.py"
  "site-packages/sage/rings/quotient_ring_element.py"
  "site-packages/sage/rings/rational.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/rational_field.py"
  "site-packages/sage/rings/finite_rings/__init__.py"
  "site-packages/sage/rings/finite_rings/all.py"
  "site-packages/sage/rings/finite_rings/element_base.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/finite_rings/finite_field_base.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/finite_rings/finite_field_constructor.py"
  "site-packages/sage/rings/finite_rings/finite_field_pari_ffelt.py"
  "site-packages/sage/rings/finite_rings/homset.py"
  "site-packages/sage/rings/finite_rings/finite_field_prime_modn.py"
  "site-packages/sage/rings/finite_rings/integer_mod.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/finite_rings/integer_mod_ring.py"
  "site-packages/sage/rings/polynomial/__init__.py"
  "site-packages/sage/rings/polynomial/all.py"
  "site-packages/sage/rings/polynomial/commutative_polynomial.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/polynomial/complex_roots.py"
  "site-packages/sage/rings/polynomial/multi_polynomial.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/polynomial/multi_polynomial_element.py"
  "site-packages/sage/rings/polynomial/multi_polynomial_ring.py"
  "site-packages/sage/rings/polynomial/multi_polynomial_ring_base.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/polynomial/multi_polynomial_sequence.py"
  "site-packages/sage/rings/polynomial/polydict.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/polynomial/laurent_polynomial.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/polynomial/laurent_polynomial_mpair.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/polynomial/laurent_polynomial_ring.py"
  "site-packages/sage/rings/polynomial/laurent_polynomial_ring_base.py"
  "site-packages/sage/rings/polynomial/polynomial_element.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/polynomial/polynomial_element_generic.py"
  "site-packages/sage/rings/polynomial/polynomial_integer_dense_flint.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/polynomial/polynomial_ring.py"
  "site-packages/sage/rings/polynomial/polynomial_ring_constructor.py"
  "site-packages/sage/rings/polynomial/polynomial_rational_flint.py"
  "site-packages/sage/rings/polynomial/polynomial_zmod_flint.py"
  "site-packages/sage/rings/polynomial/term_order.py"
  "site-packages/sage/libs/__init__.py"
  "site-packages/sage/libs/flint/__init__.py"
  "site-packages/sage/libs/flint/flint_sage.cpython-314-wasm32-wasi.so"
  "site-packages/sage/libs/flint/fmpz_poly.cpython-314-wasm32-wasi.so"
  "site-packages/sage/libs/flint/fmpz_poly_sage.cpython-314-wasm32-wasi.so"
  "site-packages/sage/libs/braiding.cpython-314-wasm32-wasi.so"
  "site-packages/sage/libs/linbox/linbox_flint_interface.cpython-314-wasm32-wasi.so"
  "site-packages/sage/misc/lazy_import.cpython-314-wasm32-wasi.so"
  "site-packages/sage/matrix/__init__.py"
  "site-packages/sage/matrix/action.cpython-314-wasm32-wasi.so"
  "site-packages/sage/matrix/all.py"
  "site-packages/sage/matrix/args.cpython-314-wasm32-wasi.so"
  "site-packages/sage/matrix/berlekamp_massey.py"
  "site-packages/sage/matrix/constructor.cpython-314-wasm32-wasi.so"
  "site-packages/sage/matrix/matrix0.cpython-314-wasm32-wasi.so"
  "site-packages/sage/matrix/matrix1.cpython-314-wasm32-wasi.so"
  "site-packages/sage/matrix/matrix2.cpython-314-wasm32-wasi.so"
  "site-packages/sage/matrix/matrix_dense.cpython-314-wasm32-wasi.so"
  "site-packages/sage/matrix/matrix_generic_dense.cpython-314-wasm32-wasi.so"
  "site-packages/sage/matrix/matrix_integer_dense.cpython-314-wasm32-wasi.so"
  "site-packages/sage/matrix/matrix_mod2_dense.cpython-314-wasm32-wasi.so"
  "site-packages/sage/matrix/matrix_modn_dense_double.cpython-314-wasm32-wasi.so"
  "site-packages/sage/matrix/matrix_modn_dense_float.cpython-314-wasm32-wasi.so"
  "site-packages/sage/matrix/matrix_polynomial_dense.cpython-314-wasm32-wasi.so"
  "site-packages/sage/matrix/matrix_rational_dense.cpython-314-wasm32-wasi.so"
  "site-packages/sage/matrix/matrix_misc.py"
  "site-packages/sage/matrix/matrix_space.py"
  "site-packages/sage/matrix/special.py"
  "site-packages/sage/modules/__init__.py"
  "site-packages/sage/modules/free_module.py"
  "site-packages/sage/modules/free_module_element.pyx"
  "site-packages/sage/modules/free_module_element.cpython-314-wasm32-wasi.so"
  "site-packages/sage/modules/free_module_homspace.py"
  "site-packages/sage/modules/module.cpython-314-wasm32-wasi.so"
  "site-packages/sage/modules/vector_space_homspace.py"
  "site-packages/sage/modular/drinfeld_modform/ring.py"
  "site-packages/sage/algebras/clifford_algebra.py"
  "site-packages/sage/algebras/weyl_algebra.py"
  "site-packages/sage/homology/chain_complex.py"
  "site-packages/sage/quadratic_forms/extras.py"
  "site-packages/sage/repl/display/fancy_repr.py"
  "site-packages/sage/repl/display/pretty_print.py"
  "site-packages/sage/groups/__init__.py"
  "site-packages/sage/groups/group.cpython-314-wasm32-wasi.so"
  "site-packages/sage/groups/abelian_gps/__init__.py"
  "site-packages/sage/groups/abelian_gps/abelian_group.py"
  "site-packages/sage/groups/abelian_gps/abelian_group_element.py"
  "site-packages/sage/groups/abelian_gps/element_base.py"
  "site-packages/sage/groups/matrix_gps/linear.py"
  "site-packages/sage/monoids/__init__.py"
  "site-packages/sage/monoids/free_abelian_monoid.py"
  "site-packages/sage/monoids/free_abelian_monoid_element.cpython-314-wasm32-wasi.so"
  "site-packages/sage/monoids/monoid.py"
  "site-packages/sage/coding/__init__.py"
  "site-packages/sage/coding/abstract_code.py"
  "site-packages/sage/coding/decoder.py"
  "site-packages/sage/coding/encoder.py"
  "site-packages/sage/coding/hamming_code.py"
  "site-packages/sage/coding/information_set_decoder.py"
  "site-packages/sage/coding/linear_code.py"
  "site-packages/sage/coding/linear_code_no_metric.py"
  "site-packages/sage/combinat/SJT.py"
  "site-packages/sage/combinat/__init__.py"
  "site-packages/sage/combinat/backtrack.py"
  "site-packages/sage/combinat/binary_tree.py"
  "site-packages/sage/combinat/combinat.py"
  "site-packages/sage/combinat/combinat_cython.cpython-314-wasm32-wasi.so"
  "site-packages/sage/combinat/combination.py"
  "site-packages/sage/combinat/combinatorial_map.py"
  "site-packages/sage/combinat/composition.py"
  "site-packages/sage/combinat/composition_signed.py"
  "site-packages/sage/combinat/derangements.py"
  "site-packages/sage/combinat/fast_vector_partitions.cpython-314-wasm32-wasi.so"
  "site-packages/sage/combinat/hillman_grassl.py"
  "site-packages/sage/combinat/integer_lists/__init__.py"
  "site-packages/sage/combinat/integer_lists/base.cpython-314-wasm32-wasi.so"
  "site-packages/sage/combinat/integer_lists/invlex.cpython-314-wasm32-wasi.so"
  "site-packages/sage/combinat/integer_lists/lists.py"
  "site-packages/sage/combinat/integer_vector.py"
  "site-packages/sage/combinat/integer_vector_weighted.py"
  "site-packages/sage/combinat/partition.py"
  "site-packages/sage/combinat/partition_tuple.py"
  "site-packages/sage/combinat/partitions.cpython-314-wasm32-wasi.so"
  "site-packages/sage/combinat/parking_functions.py"
  "site-packages/sage/combinat/perfect_matching.py"
  "site-packages/sage/combinat/permutation.py"
  "site-packages/sage/combinat/permutation_cython.cpython-314-wasm32-wasi.so"
  "site-packages/sage/combinat/q_analogues.py"
  "site-packages/sage/combinat/set_partition.py"
  "site-packages/sage/combinat/set_partition_iterator.cpython-314-wasm32-wasi.so"
  "site-packages/sage/combinat/set_partition_ordered.py"
  "site-packages/sage/combinat/skew_tableau.py"
  "site-packages/sage/combinat/species/empty_species.py"
  "site-packages/sage/combinat/species/species.py"
  "site-packages/sage/combinat/subword.py"
  "site-packages/sage/combinat/subset.py"
  "site-packages/sage/combinat/subsets_pairwise.py"
  "site-packages/sage/combinat/tableau.py"
  "site-packages/sage/combinat/tools.py"
  "site-packages/sage/combinat/tuple.py"
  "site-packages/sage/combinat/words/finite_word.py"
  "site-packages/sage/sets/__init__.py"
  "site-packages/sage/sets/disjoint_union_enumerated_sets.py"
  "site-packages/sage/sets/family.cpython-314-wasm32-wasi.so"
  "site-packages/sage/sets/finite_enumerated_set.py"
  "site-packages/sage/sets/finite_set_map_cy.cpython-314-wasm32-wasi.so"
  "site-packages/sage/sets/finite_set_maps.py"
  "site-packages/sage/sets/integer_range.py"
  "site-packages/sage/sets/non_negative_integers.py"
  "site-packages/sage/sets/positive_integers.py"
  "site-packages/sage/sets/pythonclass.cpython-314-wasm32-wasi.so"
  "site-packages/sage/sets/recursively_enumerated_set.cpython-314-wasm32-wasi.so"
  "site-packages/sage/sets/set.py"
  "site-packages/sage/misc/cachefunc.cpython-314-wasm32-wasi.so"
  "site-packages/sage/misc/persist.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/infinity.py"
  "site-packages/sage/structure/list_clone.cpython-314-wasm32-wasi.so"
  "deps/cypari2/cypari2/__init__.py"
  "deps/cypari2/cypari2/_pari_cython_probe.cpython-314-wasm32-wasi.so"
  "deps/cypari2/cypari2/_pari_runtime_probe.cpython-314-wasm32-wasi.so"
  "deps/cypari2/cypari2/gen.cpython-314-wasm32-wasi.so"
  "deps/cypari2/cypari2/handle_error.py"
  "deps/cypari2/cypari2/pari_instance.py"
  "deps/conway_polynomials/conway_polynomials/__init__.py"
  "deps/conway_polynomials/conway_polynomials/CPimport.txt.xz"
  "deps/primecountpy/primecountpy/__init__.py"
  "deps/primecountpy/primecountpy/primecount.cpython-314-wasm32-wasi.so"
  "deps/libcxx/libcxx.so"
  "deps/primecountpy/primecountpy/libcxx.so"
  "deps/cysignals/cysignals/__init__.py"
  "deps/cysignals/cysignals/signals.cpython-314-wasm32-wasi.so"
  "deps/memory_allocator/memory_allocator/__init__.py"
  "deps/memory_allocator/memory_allocator/memory_allocator.cpython-314-wasm32-wasi.so"
  "deps/gmpy2/gmpy2/__init__.py"
  "deps/gmpy2/gmpy2/gmpy2.cpython-314-wasm32-wasi.so"
  "deps/mpmath/mpmath/__init__.py"
  "deps/mpmath/mpmath/identification.py"
  "deps/jinja2/jinja2/__init__.py"
  "deps/jinja2/markupsafe/__init__.py"
  "deps/packaging/packaging/__init__.pyc"
  "deps/packaging/packaging/version.pyc"
  "deps/platformdirs/platformdirs/__init__.py"
  "deps/platformdirs/platformdirs/_xdg.py"
  "deps/platformdirs/platformdirs/api.py"
  "deps/platformdirs/platformdirs/unix.py"
  "deps/platformdirs/platformdirs/version.py"
  "deps/numpy/numpy/__init__.pyc"
  "deps/numpy/numpy/core/__init__.pyc"
  "deps/numpy/numpy/core/multiarray.pyc"
  "deps/numpy/numpy/core/_multiarray_umath.cpython-314-wasm32-wasi.so"
  "deps/cython/Cython/__init__.pyc"
  "site-packages/sagelite_database_graphs/__init__.py"
  "site-packages/sagelite_database_graphs/data/graphs/brouwer_srg_database.json"
  "site-packages/sagelite_database_graphs/data/graphs/graphs.db"
  "site-packages/sagelite_database_graphs/data/graphs/graphs.sql.gz"
  "site-packages/sagelite_database_graphs/data/graphs/isgci_sage.xml"
  "site-packages/sagelite_database_graphs/data/graphs/smallgraphs.txt"
  "sagelite-manifest-common.cjs"
  "sagelite-electron-smoke.cjs"
)

electron_side_module_list="$dist_dir/electron-resource-side-modules.txt"
electron_side_module_audit_log="$dist_dir/electron-side-module-audit.log"
find "$electron_resources_dir" -name '*.so' -type f | sort >"$electron_side_module_list"
audit_wasm_side_modules \
  "$electron_side_module_list" \
  "$electron_side_module_audit_log" \
  cpython \
  "sagelite-blocked: Electron resource side-module audit failed" \
  "sagelite-electron-side-module-audit-ok"

electron_side_module_paths=()
while IFS= read -r side_module_path; do
  electron_side_module_paths+=("${side_module_path#"$electron_resources_dir/"}")
done <"$electron_side_module_list"

if [ "${#electron_side_module_paths[@]}" -eq 0 ]; then
  record_blocker "sagelite-blocked: Electron resources are missing side module paths."
fi

electron_native_library_paths=()
while IFS= read -r native_library_path; do
  electron_native_library_paths+=("${native_library_path#"$electron_resources_dir/"}")
done < <(find "$electron_resources_dir" -name 'libcxx.so' -type f | sort)

if [ "${#electron_native_library_paths[@]}" -eq 0 ]; then
  record_blocker "sagelite-blocked: Electron resources are missing native library paths for libcxx.so."
fi

mapfile -t electron_required_paths < <(
  printf '%s\n' "${electron_required_paths[@]}" "${electron_side_module_paths[@]}" |
    sort -u
)

for required_path in "${electron_required_paths[@]}"; do
  if [ ! -e "$electron_resources_dir/$required_path" ]; then
    record_blocker "sagelite-blocked: Electron resources are missing required path $required_path."
  fi
done

{
  printf '{\n'
  printf '  "schemaVersion": %s,\n' "$electron_manifest_schema_version"
  printf '  "resourceKind": "%s",\n' "$electron_manifest_resource_kind"
  printf '  "pythonAbi": "%s",\n' "$electron_manifest_python_abi"
  printf '  "pythonPlatform": "%s",\n' "$electron_manifest_python_platform"
  printf '  "smokeContract": "%s",\n' "$electron_manifest_smoke_contract"
  printf '  "sageliteSourceRevision": "%s",\n' "$electron_manifest_source_revision"
  printf '  "sageliteSourceTreeState": "%s",\n' "$electron_manifest_source_tree_state"
  printf '  "resourceRootEnvName": "%s",\n' "$electron_manifest_resource_root_env_name"
  printf '  "pythonPath": [\n'
  for i in "${!electron_pythonpath_parts[@]}"; do
    if [ "$i" -gt 0 ]; then
      printf ',\n'
    fi
    printf '    "%s"' "${electron_pythonpath_parts[$i]}"
  done
  printf '\n  ],\n'
  printf '  "runtimeDependencyPaths": [\n'
  for i in "${!runtime_dep_labels[@]}"; do
    if [ "$i" -gt 0 ]; then
      printf ',\n'
    fi
    printf '    "deps/%s"' "${runtime_dep_labels[$i]}"
  done
  printf '\n  ],\n'
  printf '  "requiredResourcePaths": [\n'
  for i in "${!electron_required_paths[@]}"; do
    if [ "$i" -gt 0 ]; then
      printf ',\n'
    fi
    printf '    "%s"' "${electron_required_paths[$i]}"
  done
  printf '\n  ],\n'
  printf '  "requiredResourceSha256": {\n'
  for i in "${!electron_required_paths[@]}"; do
    if [ "$i" -gt 0 ]; then
      printf ',\n'
    fi
    required_path="${electron_required_paths[$i]}"
    printf '    "%s": "%s"' \
      "$required_path" \
      "$(sha256_file "$electron_resources_dir/$required_path")"
  done
  printf '\n  },\n'
  printf '  "sideModulePaths": [\n'
  for i in "${!electron_side_module_paths[@]}"; do
    if [ "$i" -gt 0 ]; then
      printf ',\n'
    fi
    printf '    "%s"' "${electron_side_module_paths[$i]}"
  done
  printf '\n  ],\n'
  printf '  "nativeLibraryPaths": [\n'
  for i in "${!electron_native_library_paths[@]}"; do
    if [ "$i" -gt 0 ]; then
      printf ',\n'
    fi
    printf '    "%s"' "${electron_native_library_paths[$i]}"
  done
  printf '\n  ]\n'
  printf '}\n'
} >"$electron_resources_dir/sagelite-electron-resources.json"

doctest_smoke_file="$probe_dir/sagelite-doctest-smoke.py"
doctest_smoke_db="$probe_dir/sagelite-doctest-smoke.sqlite3"
doctest_smoke_log="$dist_dir/doctest-smoke.log"
doctest_env_db_file="$probe_dir/sagelite-doctest-env-db.py"
doctest_env_db="$probe_dir/sagelite-doctest-env-db.sqlite3"
doctest_env_db_log="$dist_dir/doctest-env-db.log"
cat >"$doctest_smoke_file" <<'PY'
r"""
EXAMPLES::

    sage: 2 + 3
    5
    sage: 2^5
    32
    sage: GF(9).cardinality()
    9
    sage: log(QQ(125), 5)
    3
    sage: CDF(e).real()
    2.718281828459045
    sage: from sage.categories.sets_cat import EmptySetError; raise EmptySetError
    Traceback (most recent call last):
    ...
    EmptySetError
    sage: raise KeyboardInterrupt("expected interrupt smoke")
    Traceback (most recent call last):
    ...
    KeyboardInterrupt: expected interrupt smoke
    sage: raise AttributeError("suffix ellipsis detail smoke")
    Traceback (most recent call last):
    ...
    AttributeError...
    sage: raise NotImplementedError
    Traceback (most recent call last):
    ...
    NotImplementedError...
    sage: def cowasm_raise_local_exception():
    ....:     class CowasmLocalError(ValueError):
    ....:         pass
    ....:     raise CowasmLocalError("local exception smoke")
    sage: cowasm_raise_local_exception()
    Traceback (most recent call last):
    ...
    CowasmLocalError: local exception
    smoke
    sage: Subsets(3, 2).cardinality()
    3
    sage: list(IntegerVectors(2, 3))
    [[2, 0, 0], [1, 1, 0], [1, 0, 1], [0, 2, 0], [0, 1, 1], [0, 0, 2]]
    sage: list(IntegerListsLex(4, max_length=2))
    [[4], [3, 1], [2, 2], [1, 3], [0, 4]]
    sage: Word([1, 2, 3])
    word: 123
    sage: _.parent()
    Finite words over Set of Python objects of class 'object'
    sage: Permutation([3, 2, 1])
    [3, 2, 1]
    sage: Permutations(3).cardinality()
    6
    sage: Hom(ZZ, ZZ, Sets()).domain() is ZZ
    True
    sage: Set([2, 1, 2])
    {1, 2}
    sage: (GraphQuery.__name__, 'graph_data' in graph_db_info(), len(graphs_list.from_graph6([graphs.CompleteGraph(4).graph6_string()])))
    ('GraphQuery', True, 1)
    sage: from sage.structure.sequence import Sequence
    sage: Sequence([1, 2, 3], cr=True)
    [1, 2, 3]
    sage: str(Sequence([1, 2, 3], cr=True))
    '[\n1,\n2,\n3\n]'
    sage: _cowasm_display_matrix = matrix(ZZ, [[1, 2], [3, 4]]); (_cowasm_display_matrix, _cowasm_display_matrix)
    (
    [1 2]  [1 2]
    [3 4], [3 4]
    )
    sage: Sequence([_cowasm_display_matrix, _cowasm_display_matrix])
    [
    [1 2]  [1 2]
    [3 4], [3 4]
    ]
    sage: [('m', _cowasm_display_matrix)]
    [('m', [1 2]
    [3 4])]
    sage: class CowasmCountedRepr:
    ....:     calls = 0
    ....:     def __repr__(self):
    ....:         type(self).calls += 1
    ....:         return "counted repr"
    sage: [CowasmCountedRepr()]
    [counted repr]
    sage: CowasmCountedRepr.calls
    1
    sage: matrix(ZZ, 100, 100, 0)
    100 x 100 dense matrix over Integer Ring (use the '.str()' method to see the entries)
    sage: from sage.misc.html import HtmlFragment
    sage: HtmlFragment('<b>browser math</b>')
    <b>browser math</b>
    sage: print("{[2, 1]: 1, ([1], [2]): 3}")
    {([1], [2]): 3, [2, 1]: 1}
    sage: print("{'xmax': 10.0, 'xmin': 3.0, 'ymax': 0.47619047619047666, 'ymin': 0}")
    {'xmax': 10.0, 'xmin': 3.0, 'ymax': 0.4761904761904765, 'ymin': 0}
    sage: print("{'xmin': 3.0, 'xmax': 10.0, 'ymin': 0, 'ymax': 0.47619047619047666}")
    {'xmax': 10.0, 'xmin': 3.0, 'ymax': 0.476190476190..., 'ymin': 0}
    sage: ProjectiveSpace(2, QQ)
    Projective Space of dimension 2 over Rational Field
    sage: list(FiniteEnumeratedSet([1, 2, 3]))
    [1, 2, 3]
    sage: 0 in NonNegativeIntegers()
    True
    sage: R.<x> = PolynomialRing(ZZ, sparse=True); ZZ._roots_univariate_polynomial((x + 1)^2 * (x - 3))
    [(3, 1), (-1, 2)]
    sage: from sage.groups.misc_gps.argument_groups import ArgumentGroup; assert CBF._real_field() is RBF and "Exponents in Real ball field" in repr(ArgumentGroup(CBF)); R.<x> = PolynomialRing(QQbar, sparse=True); (1 + 2*x)^3 + 3*x
    8*x^3 + 12*x^2 + 9*x + 1
    sage: S.<y> = PolynomialRing(AA, sparse=True); (1 + 2*y)^3 + 3*y
    8*y^3 + 12*y^2 + 9*y + 1
    sage: float("0.3333333333333")  # abs tol 1e-12
    0.333333333334
    sage: float("0.3333333333333334")  # tol
    0.3333333333333333
    sage: import warnings; warnings.warn("\nsmoke warning", DeprecationWarning)
    doctest:warning
    ...
    DeprecationWarning:
    smoke warning
    sage: import sage.doctest; from sage.misc.stopgap import stopgap; stopgap("doctest mode smoke", 987654); sage.doctest.DOCTEST_MODE
    True
    sage: warnings.warn("inline warning", DeprecationWarning)
    doctest:warning
    ...
    DeprecationWarning: inline warning
    sage: def cowasm_repeated_warning():
    ....:     warnings.warn("repeat smoke", DeprecationWarning)
    sage: cowasm_repeated_warning()
    doctest:...: DeprecationWarning: repeat smoke
    sage: cowasm_repeated_warning()
    doctest:...: DeprecationWarning: repeat smoke
    sage: warnings.warn("setup warning", UserWarning); warnings.warn("target warning", DeprecationWarning)
    doctest:warning...:
    DeprecationWarning:
    target warning
    sage: def cowasm_extra_warning_after_target():
    ....:     warnings.warn("target first", DeprecationWarning)
    ....:     warnings.warn("extra second", UserWarning)
    ....:     return 42
    sage: cowasm_extra_warning_after_target()
    doctest:warning...:
    DeprecationWarning:
    target first
    42
    sage: "17-adic Field with capped relative precision 20"
    ...-adic Field with capped relative precision ...
    sage: class CowasmDictRepr:
    ....:     def __repr__(self):
    ....:         return "<cowasm object at 0x>"
    sage: {"b": 2, "a": CowasmDictRepr()}
    {'a': <cowasm object at ...>, 'b': 2}
    sage: {}
    {}
    sage: {((), ()): 4}
    {((), ()): 4}
    sage: ('ordinary tuple pretty fallback', {'beta': list(range(10)), 'alpha': list(range(10))})
    ('ordinary tuple pretty fallback',
     {'alpha': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      'beta': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]})
    sage: class CowasmBrokenRepr:
    ....:     def __repr__(self):
    ....:         raise ValueError("doctest repr smoke")
    sage: CowasmBrokenRepr()
    <repr(<CowasmBrokenRepr at 0x...>) failed: ValueError: doctest repr smoke>
    sage: class CowasmEmptyBrokenRepr:
    ....:     def __repr__(self):
    ....:         raise NotImplementedError()
    sage: CowasmEmptyBrokenRepr()
    <repr(<CowasmEmptyBrokenRepr at 0x...>) failed: NotImplementedError>
    sage: def cowasm_pickle_smoke(value): return value + 1
    sage: loads(dumps(cowasm_pickle_smoke))(41)
    42
    sage: ZZ.random_element()  # random
    output is intentionally unchecked
    sage: 7 + 8  # optional - cowasm_smoke
    15
    sage: 20 + 22  # needs cowasm_smoke cowasm_companion
    42
    sage: magma('2 + 2')  # optional - magma
    4
    sage: 1 / 0  # long time
    long-running failure
    sage: 1 / 0  # known bug
    deferred failure
    sage: 40 + 2  # known bug - optional-feature diagnostics use subprocess support
    42
    sage: 1 / 0  # not implemented
    deferred failure
    sage: 1 / 0  # not tested
    deferred failure
    sage: 1 / 0  # py2
    legacy Python 2 failure
    sage: # needs cowasm_smoke
    sage: 19 + 23
    42
    sage: cowasm_propagated_setup = 40
    sage: cowasm_propagated_setup + 2
    42
    sage: # needs cowasm_smoke
    sage: cowasm_nested_directive_setup = 40
    sage: print("nested first line\nnested second line")  # needs cowasm_companion
    nested first line
    nested second line
    sage: cowasm_nested_directive_setup + 2
    42
    sage: # needs cowasm_smoke
    sage: cowasm_composed_directive_setup = 40
    sage: # known bug
    sage: cowasm_composed_directive_setup + 2
    42


    sage: 6 * 7
    42
"""
PY
cat >"$doctest_env_db_file" <<'PY'
r"""
EXAMPLES::

    sage: 11 + 31
    42
"""
PY
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --sqlite "$doctest_smoke_db" "$doctest_smoke_file" \
      >"$doctest_smoke_log" 2>&1
doctest_smoke_status=$?
set -e
if [ "$doctest_smoke_status" -eq 124 ]; then
  tail -120 "$doctest_smoke_log" >&2
  record_blocker "sagelite-blocked: sage -t doctest smoke timed out after $node_import_timeout; see $doctest_smoke_log for the first runtime blocker."
fi
if [ "$doctest_smoke_status" -ne 0 ]; then
  tail -120 "$doctest_smoke_log" >&2
  record_blocker "sagelite-blocked: sage -t doctest smoke failed; see $doctest_smoke_log for the first runtime blocker."
fi
doctest_smoke_counts="$(sqlite3 "$doctest_smoke_db" "select status || '|' || total_blocks || '|' || passed_blocks || '|' || failed_blocks || '|' || skipped_blocks from runs order by id desc limit 1;")"
if [ "$doctest_smoke_counts" != "passed|84|67|0|17" ]; then
  cat "$doctest_smoke_log" >&2
  sqlite3 "$doctest_smoke_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t doctest smoke wrote unexpected SQLite counts: $doctest_smoke_counts"
fi
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  COWASM_SAGELITE_DOCTEST_DB="" \
  SAGELITE_DOCTEST_DB="$doctest_env_db" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t "$doctest_env_db_file" \
      >"$doctest_env_db_log" 2>&1
doctest_env_db_status=$?
set -e
if [ "$doctest_env_db_status" -eq 124 ]; then
  tail -120 "$doctest_env_db_log" >&2
  record_blocker "sagelite-blocked: sage -t doctest env-db smoke timed out after $node_import_timeout; see $doctest_env_db_log for the first runtime blocker."
fi
doctest_env_db_counts="$(sqlite3 "$doctest_env_db" "select status || '|' || total_blocks || '|' || passed_blocks || '|' || failed_blocks || '|' || skipped_blocks from runs order by id desc limit 1;" 2>/dev/null || true)"
if [ "$doctest_env_db_status" -ne 0 ]; then
  if [ "$doctest_env_db_counts" = "passed|1|1|0|0" ] &&
      grep -Fq "sage -t passed: 1 passed, 0 failed, 0 skipped" "$doctest_env_db_log"; then
    printf 'sagelite-node-warning: sage -t doctest env-db smoke completed before Node.js exited with status %s\n' \
      "$doctest_env_db_status" >>"$doctest_env_db_log"
  else
    tail -120 "$doctest_env_db_log" >&2
    record_blocker "sagelite-blocked: sage -t doctest env-db smoke failed; see $doctest_env_db_log for the first runtime blocker."
  fi
fi
if [ "$doctest_env_db_counts" != "passed|1|1|0|0" ]; then
  cat "$doctest_env_db_log" >&2
  sqlite3 "$doctest_env_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t doctest env-db smoke wrote unexpected SQLite counts: $doctest_env_db_counts"
fi
doctest_source_root_relative_file="$probe_dir/src/sage/source_root_relative.py"
doctest_source_root_relative_db="$probe_dir/sagelite-doctest-source-root-relative.sqlite3"
doctest_source_root_relative_log="$dist_dir/doctest-source-root-relative.log"
mkdir -p "$(dirname "$doctest_source_root_relative_file")"
cat >"$doctest_source_root_relative_file" <<'PY'
r"""
EXAMPLES::

    sage: 21 * 2
    42
"""
PY
set +e
(
  cd "$dist_dir" &&
  COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
    COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
    run_host_timeout "$node_import_timeout" \
      node "$src_dir/sagelite-node-repl.cjs" -t \
        --source-root "$probe_dir" \
        --sqlite "$doctest_source_root_relative_db" \
        src/sage/source_root_relative.py
) >"$doctest_source_root_relative_log" 2>&1
doctest_source_root_relative_status=$?
set -e
if [ "$doctest_source_root_relative_status" -eq 124 ]; then
  tail -120 "$doctest_source_root_relative_log" >&2
  record_blocker "sagelite-blocked: sage -t source-root relative doctest smoke timed out after $node_import_timeout; see $doctest_source_root_relative_log for the first runtime blocker."
fi
if [ "$doctest_source_root_relative_status" -ne 0 ]; then
  tail -120 "$doctest_source_root_relative_log" >&2
  record_blocker "sagelite-blocked: sage -t source-root relative doctest smoke failed; see $doctest_source_root_relative_log for the first runtime blocker."
fi
doctest_source_root_relative_counts="$(sqlite3 "$doctest_source_root_relative_db" "select status || '|' || total_blocks || '|' || passed_blocks || '|' || failed_blocks || '|' || skipped_blocks from runs order by id desc limit 1;")"
if [ "$doctest_source_root_relative_counts" != "passed|1|1|0|0" ]; then
  cat "$doctest_source_root_relative_log" >&2
  sqlite3 "$doctest_source_root_relative_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t source-root relative doctest smoke wrote unexpected SQLite counts: $doctest_source_root_relative_counts"
fi
doctest_source_root_relative_path_count="$(sqlite3 "$doctest_source_root_relative_db" "select count(*) from runs join files on files.run_id = runs.id join blocks on blocks.file_id = files.id where runs.source_root = '$probe_dir' and files.path = '$doctest_source_root_relative_file' and blocks.block_key like 'src/sage/source_root_relative.py:%:%';")"
if [ "$doctest_source_root_relative_path_count" != "1" ]; then
  cat "$doctest_source_root_relative_log" >&2
  sqlite3 "$doctest_source_root_relative_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t source-root relative doctest smoke did not resolve the relative source path under --source-root."
fi
doctest_sagelite_package_commit_count="$(sqlite3 "$doctest_smoke_db" "select count(*) from runs where sagelite_package_commit is not null and sagelite_package_commit = sagelite_source_commit;")"
if [ "$doctest_sagelite_package_commit_count" != "1" ]; then
  cat "$doctest_smoke_log" >&2
  sqlite3 "$doctest_smoke_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t doctest smoke did not record matching Sagelite package commit metadata."
fi
doctest_run_path_metadata_count="$(sqlite3 "$doctest_smoke_db" "select count(*) from runs where source_root = '$probe_dir' and invocation_cwd is not null and invocation_cwd != '' and resource_root = '$electron_resources_dir';")"
if [ "$doctest_run_path_metadata_count" != "1" ]; then
  cat "$doctest_smoke_log" >&2
  sqlite3 "$doctest_smoke_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t doctest smoke did not record run path metadata."
fi
doctest_block_key_count="$(sqlite3 "$doctest_smoke_db" "select count(*) from blocks where block_key like 'sagelite-doctest-smoke.py:%:%' and block_key not like '/%';")"
if [ "$doctest_block_key_count" != "84" ]; then
  cat "$doctest_smoke_log" >&2
  sqlite3 "$doctest_smoke_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t doctest smoke did not record relative stable block keys."
fi
doctest_leading_ellipsis_count="$(sqlite3 "$doctest_smoke_db" "select count(*) from blocks where status = 'passed' and expected = '...-adic Field with capped relative precision ...' || char(10) and expected not like '%COWASM_LEADING_ELLIPSIS%';")"
if [ "$doctest_leading_ellipsis_count" != "1" ]; then
  cat "$doctest_smoke_log" >&2
  sqlite3 "$doctest_smoke_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t doctest smoke did not restore protected leading ellipsis output."
fi
doctest_e_constant_count="$(sqlite3 "$doctest_smoke_db" "select count(*) from blocks where status = 'passed' and source = 'CDF(e).real()' || char(10);")"
if [ "$doctest_e_constant_count" != "1" ]; then
  cat "$doctest_smoke_log" >&2
  sqlite3 "$doctest_smoke_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t doctest smoke did not seed the numeric e constant."
fi
doctest_expected_keyboard_interrupt_count="$(sqlite3 "$doctest_smoke_db" "select count(*) from blocks where status = 'passed' and source = 'raise KeyboardInterrupt(\"expected interrupt smoke\")' || char(10) and expected like '%KeyboardInterrupt: expected interrupt smoke%';")"
if [ "$doctest_expected_keyboard_interrupt_count" != "1" ]; then
  cat "$doctest_smoke_log" >&2
  sqlite3 "$doctest_smoke_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t doctest smoke did not compare an expected KeyboardInterrupt."
fi
doctest_suffix_ellipsis_exception_count="$(sqlite3 "$doctest_smoke_db" "select count(*) from blocks where status = 'passed' and source in ('raise AttributeError(\"suffix ellipsis detail smoke\")' || char(10), 'raise NotImplementedError' || char(10)) and expected like '%Error...%';")"
if [ "$doctest_suffix_ellipsis_exception_count" != "2" ]; then
  cat "$doctest_smoke_log" >&2
  sqlite3 "$doctest_smoke_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t doctest smoke did not compare suffix-ellipsis exception expectations."
fi
doctest_inline_random_count="$(sqlite3 "$doctest_smoke_db" "select count(*) from blocks where status = 'passed' and expected_kind = 'random' and tags like '%random%' and failure_class = 'random_unchecked' and source like 'ZZ.random_element()%';")"
if [ "$doctest_inline_random_count" != "1" ]; then
  cat "$doctest_smoke_log" >&2
  sqlite3 "$doctest_smoke_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t doctest smoke did not preserve inline random metadata."
fi
doctest_inline_skip_count="$(sqlite3 "$doctest_smoke_db" "select count(*) from blocks where status = 'skipped' and skip_reason = 'optional:cowasm_smoke' and tags like '%optional:cowasm_smoke%' and source like '7 + 8%';")"
if [ "$doctest_inline_skip_count" != "1" ]; then
  cat "$doctest_smoke_log" >&2
  sqlite3 "$doctest_smoke_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t doctest smoke did not preserve inline skip metadata."
fi
doctest_file_directive_file="$probe_dir/sagelite-doctest-file-directive.py"
doctest_file_directive_db="$probe_dir/sagelite-doctest-file-directive.sqlite3"
doctest_file_directive_log="$dist_dir/doctest-file-directive.log"
cat >"$doctest_file_directive_file" <<'PY'
# sage.doctest: needs cowasm_file_header (because this fixture tests explanatory prose)
r"""
EXAMPLES::

    sage: 1 / 0
    skipped by the file-level doctest directive
"""

raise RuntimeError("file-level skipped doctests should not load module globals")
PY
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --sqlite "$doctest_file_directive_db" "$doctest_file_directive_file" \
      >"$doctest_file_directive_log" 2>&1
doctest_file_directive_status=$?
set -e
if [ "$doctest_file_directive_status" -eq 124 ]; then
  tail -120 "$doctest_file_directive_log" >&2
  record_blocker "sagelite-blocked: sage -t file-directive doctest smoke timed out after $node_import_timeout; see $doctest_file_directive_log for the first runtime blocker."
fi
if [ "$doctest_file_directive_status" -ne 0 ]; then
  tail -120 "$doctest_file_directive_log" >&2
  record_blocker "sagelite-blocked: sage -t file-directive doctest smoke failed; see $doctest_file_directive_log for the first runtime blocker."
fi
doctest_file_directive_counts="$(sqlite3 "$doctest_file_directive_db" "select status || '|' || total_blocks || '|' || passed_blocks || '|' || failed_blocks || '|' || skipped_blocks from runs order by id desc limit 1;")"
if [ "$doctest_file_directive_counts" != "passed|1|0|0|1" ]; then
  cat "$doctest_file_directive_log" >&2
  sqlite3 "$doctest_file_directive_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t file-directive doctest smoke wrote unexpected SQLite counts: $doctest_file_directive_counts"
fi
doctest_file_directive_skip_count="$(sqlite3 "$doctest_file_directive_db" "select count(*) from blocks where status = 'skipped' and skip_reason = 'optional:cowasm_file_header' and tags like '%needs:cowasm_file_header%';")"
if [ "$doctest_file_directive_skip_count" != "1" ]; then
  cat "$doctest_file_directive_log" >&2
  sqlite3 "$doctest_file_directive_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t file-directive doctest smoke did not record file-level skip metadata."
fi
doctest_parallel_a_file="$probe_dir/sagelite-doctest-parallel-a.py"
doctest_parallel_b_file="$probe_dir/sagelite-doctest-parallel-b.py"
doctest_parallel_db="$probe_dir/sagelite-doctest-parallel.sqlite3"
doctest_parallel_log="$dist_dir/doctest-parallel.log"
cat >"$doctest_parallel_a_file" <<'PY'
r"""
EXAMPLES::

    sage: 20 + 22
    42
"""
PY
cat >"$doctest_parallel_b_file" <<'PY'
r"""
EXAMPLES::

    sage: 6 * 7
    42
"""
PY
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --jobs 2 \
      --sqlite "$doctest_parallel_db" \
      "$doctest_parallel_a_file" "$doctest_parallel_b_file" \
      >"$doctest_parallel_log" 2>&1
doctest_parallel_status=$?
set -e
if [ "$doctest_parallel_status" -eq 124 ]; then
  tail -120 "$doctest_parallel_log" >&2
  record_blocker "sagelite-blocked: sage -t parallel doctest smoke timed out after $node_import_timeout; see $doctest_parallel_log for the first runtime blocker."
fi
if [ "$doctest_parallel_status" -ne 0 ]; then
  tail -120 "$doctest_parallel_log" >&2
  sqlite3 "$doctest_parallel_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t parallel doctest smoke failed; see $doctest_parallel_log for the first runtime blocker."
fi
doctest_parallel_counts="$(sqlite3 "$doctest_parallel_db" "select status || '|' || total_blocks || '|' || passed_blocks || '|' || failed_blocks || '|' || skipped_blocks from runs order by id desc limit 1;")"
if [ "$doctest_parallel_counts" != "passed|2|2|0|0" ]; then
  cat "$doctest_parallel_log" >&2
  sqlite3 "$doctest_parallel_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t parallel doctest smoke wrote unexpected SQLite counts: $doctest_parallel_counts"
fi
doctest_parallel_file_count="$(sqlite3 "$doctest_parallel_db" "select count(*) from files where status = 'passed' and total_blocks = 1 and passed_blocks = 1;")"
if [ "$doctest_parallel_file_count" != "2" ]; then
  cat "$doctest_parallel_log" >&2
  sqlite3 "$doctest_parallel_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t parallel doctest smoke did not record both file results."
fi
doctest_parallel_order="$(sqlite3 "$doctest_parallel_db" "select group_concat(path, '|') from (select path from files order by id);")"
if [ "$doctest_parallel_order" != "$doctest_parallel_a_file|$doctest_parallel_b_file" ]; then
  cat "$doctest_parallel_log" >&2
  sqlite3 "$doctest_parallel_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t parallel doctest smoke did not preserve input file order."
fi
doctest_extra_string_file="$probe_dir/sagelite-doctest-extra-string.py"
doctest_extra_string_db="$probe_dir/sagelite-doctest-extra-string.sqlite3"
doctest_extra_string_log="$dist_dir/doctest-extra-string.log"
cat >"$doctest_extra_string_file" <<'PY'
"""
Generated file notice without runnable examples.
"""

r"""
EXAMPLES::

    sage: extra_string_value = 37
    sage: extra_string_value + 5
    42
"""

def café(): """
EXAMPLES::

    sage: "\x41"
    'A'
"""
PY
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --sqlite "$doctest_extra_string_db" "$doctest_extra_string_file" \
      >"$doctest_extra_string_log" 2>&1
doctest_extra_string_status=$?
set -e
if [ "$doctest_extra_string_status" -eq 124 ]; then
  tail -120 "$doctest_extra_string_log" >&2
  record_blocker "sagelite-blocked: sage -t extra-string doctest smoke timed out after $node_import_timeout; see $doctest_extra_string_log for the first runtime blocker."
fi
if [ "$doctest_extra_string_status" -ne 0 ]; then
  tail -120 "$doctest_extra_string_log" >&2
  sqlite3 "$doctest_extra_string_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t extra-string doctest smoke failed; see $doctest_extra_string_log for the first runtime blocker."
fi
doctest_extra_string_counts="$(sqlite3 "$doctest_extra_string_db" "select status || '|' || total_blocks || '|' || passed_blocks || '|' || failed_blocks || '|' || skipped_blocks from runs order by id desc limit 1;")"
if [ "$doctest_extra_string_counts" != "passed|3|3|0|0" ]; then
  cat "$doctest_extra_string_log" >&2
  sqlite3 "$doctest_extra_string_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t extra-string doctest smoke wrote unexpected SQLite counts: $doctest_extra_string_counts"
fi
doctest_extra_string_line="$(grep -nF 'sage: extra_string_value + 5' "$doctest_extra_string_file" | head -n 1 | cut -d: -f1)"
doctest_extra_string_line_count="$(sqlite3 "$doctest_extra_string_db" "select count(*) from blocks where start_line = $doctest_extra_string_line and source like 'extra_string_value + 5%';")"
if [ "$doctest_extra_string_line_count" != "1" ]; then
  cat "$doctest_extra_string_log" >&2
  sqlite3 "$doctest_extra_string_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t extra-string doctest smoke did not preserve line numbers for extra top-level strings."
fi
doctest_unicode_column_source_count="$(sqlite3 "$doctest_extra_string_db" "select count(*) from blocks where status = 'passed' and source like '%x41%';")"
if [ "$doctest_unicode_column_source_count" != "1" ]; then
  cat "$doctest_extra_string_log" >&2
  sqlite3 "$doctest_extra_string_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t extra-string doctest smoke did not preserve raw source after a Unicode AST column."
fi
doctest_large_python_db="$probe_dir/sagelite-doctest-large-python.sqlite3"
doctest_large_python_log="$dist_dir/doctest-large-python.log"
doctest_large_python_file="$build_dir/src/sage/modules/free_module.py"
doctest_large_python_line="$(grep -nF 'sage: Q.is_integral_domain()' "$doctest_large_python_file" | head -n 1 | cut -d: -f1)"
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$build_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --timeout 30 \
      --line "$doctest_large_python_line" \
      --sqlite "$doctest_large_python_db" \
      "$doctest_large_python_file" \
      >"$doctest_large_python_log" 2>&1
doctest_large_python_status=$?
set -e
if [ "$doctest_large_python_status" -eq 124 ]; then
  tail -120 "$doctest_large_python_log" >&2
  record_blocker "sagelite-blocked: sage -t large-Python collection smoke timed out after $node_import_timeout; see $doctest_large_python_log for the first runtime blocker."
fi
if [ "$doctest_large_python_status" -ne 0 ]; then
  tail -120 "$doctest_large_python_log" >&2
  sqlite3 "$doctest_large_python_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t large-Python collection smoke failed; see $doctest_large_python_log for the first runtime blocker."
fi
doctest_large_python_counts="$(sqlite3 "$doctest_large_python_db" "select status || '|' || total_blocks || '|' || passed_blocks || '|' || failed_blocks || '|' || skipped_blocks from runs order by id desc limit 1;")"
if [ "$doctest_large_python_counts" != "passed|1|0|0|1" ]; then
  cat "$doctest_large_python_log" >&2
  sqlite3 "$doctest_large_python_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t large-Python collection smoke wrote unexpected SQLite counts: $doctest_large_python_counts"
fi
doctest_large_python_skip_count="$(sqlite3 "$doctest_large_python_db" "select count(*) from blocks where start_line = $doctest_large_python_line and status = 'skipped' and skip_reason = 'optional:sage.libs.singular' and source like 'Q.is_integral_domain()%';")"
if [ "$doctest_large_python_skip_count" != "1" ]; then
  cat "$doctest_large_python_log" >&2
  sqlite3 "$doctest_large_python_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t large-Python collection smoke did not preserve the selected optional row."
fi
doctest_pyx_split_file="$probe_dir/sagelite-doctest-pyx-split.pyx"
doctest_pyx_split_db="$probe_dir/sagelite-doctest-pyx-split.sqlite3"
doctest_pyx_split_log="$dist_dir/doctest-pyx-split.log"
cat >"$doctest_pyx_split_file" <<'PYX'
def first():
    r"""
    EXAMPLES::

        sage: pyx_leaked_value = 99
        sage: pyx_leaked_value
        99
    """

def second():
    r"""
    EXAMPLES::

        sage: 'pyx_leaked_value' in globals()
        False
    """
PYX
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --sqlite "$doctest_pyx_split_db" "$doctest_pyx_split_file" \
      >"$doctest_pyx_split_log" 2>&1
doctest_pyx_split_status=$?
set -e
if [ "$doctest_pyx_split_status" -eq 124 ]; then
  tail -120 "$doctest_pyx_split_log" >&2
  record_blocker "sagelite-blocked: sage -t pyx-split doctest smoke timed out after $node_import_timeout; see $doctest_pyx_split_log for the first runtime blocker."
fi
if [ "$doctest_pyx_split_status" -ne 0 ]; then
  tail -120 "$doctest_pyx_split_log" >&2
  sqlite3 "$doctest_pyx_split_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t pyx-split doctest smoke failed; see $doctest_pyx_split_log for the first runtime blocker."
fi
doctest_pyx_split_counts="$(sqlite3 "$doctest_pyx_split_db" "select status || '|' || total_blocks || '|' || passed_blocks || '|' || failed_blocks || '|' || skipped_blocks from runs order by id desc limit 1;")"
if [ "$doctest_pyx_split_counts" != "passed|3|3|0|0" ]; then
  cat "$doctest_pyx_split_log" >&2
  sqlite3 "$doctest_pyx_split_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t pyx-split doctest smoke wrote unexpected SQLite counts: $doctest_pyx_split_counts"
fi
doctest_pyx_split_isolated_count="$(sqlite3 "$doctest_pyx_split_db" "select count(*) from blocks where status = 'passed' and source like '''pyx_leaked_value'' in globals()%';")"
if [ "$doctest_pyx_split_isolated_count" != "1" ]; then
  cat "$doctest_pyx_split_log" >&2
  sqlite3 "$doctest_pyx_split_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t pyx-split doctest smoke did not isolate separate Cython docstring namespaces."
fi
doctest_expected_line="$(grep -nF 'sage: 2^5' "$doctest_smoke_file" | head -n 1 | cut -d: -f1)"
doctest_recorded_line="$(sqlite3 "$doctest_smoke_db" "select start_line from blocks where source like '2^5%' limit 1;")"
if [ "$doctest_recorded_line" != "$doctest_expected_line" ]; then
  cat "$doctest_smoke_log" >&2
  sqlite3 "$doctest_smoke_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t doctest smoke recorded line $doctest_recorded_line for 2^5, expected $doctest_expected_line."
fi
doctest_block_key="$(sqlite3 "$doctest_smoke_db" "select block_key from blocks where source like '2^5%' limit 1;")"
doctest_tmpdir_root="$probe_dir/sagelite-doctest-tmpdir-root"
doctest_tmpdir_db_dir="$probe_dir/sagelite-doctest-tmpdir-db"
doctest_tmpdir_db="$doctest_tmpdir_db_dir/sagelite-doctest-tmpdir.sqlite3"
doctest_tmpdir_log="$dist_dir/doctest-tmpdir.log"
mkdir -p "$doctest_tmpdir_db_dir"
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --block-key "$doctest_block_key" \
      --tmpdir "$doctest_tmpdir_root" \
      --sqlite "$doctest_tmpdir_db" "$doctest_smoke_file" \
      >"$doctest_tmpdir_log" 2>&1
doctest_tmpdir_status=$?
set -e
if [ "$doctest_tmpdir_status" -eq 124 ]; then
  tail -120 "$doctest_tmpdir_log" >&2
  record_blocker "sagelite-blocked: sage -t tmpdir doctest smoke timed out after $node_import_timeout; see $doctest_tmpdir_log for the first runtime blocker."
fi
if [ "$doctest_tmpdir_status" -ne 0 ]; then
  tail -120 "$doctest_tmpdir_log" >&2
  record_blocker "sagelite-blocked: sage -t tmpdir doctest smoke failed; see $doctest_tmpdir_log for the first runtime blocker."
fi
doctest_tmpdir_counts="$(sqlite3 "$doctest_tmpdir_db" "select status || '|' || total_blocks || '|' || passed_blocks || '|' || failed_blocks || '|' || skipped_blocks from runs order by id desc limit 1;")"
if [ "$doctest_tmpdir_counts" != "passed|1|1|0|0" ]; then
  cat "$doctest_tmpdir_log" >&2
  sqlite3 "$doctest_tmpdir_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t tmpdir doctest smoke wrote unexpected SQLite counts: $doctest_tmpdir_counts"
fi
doctest_tmpdir_metadata_count="$(sqlite3 "$doctest_tmpdir_db" "select count(*) from runs where tmp_dir_root = '$doctest_tmpdir_root' and source_root = '$probe_dir';")"
if [ "$doctest_tmpdir_metadata_count" != "1" ]; then
  cat "$doctest_tmpdir_log" >&2
  sqlite3 "$doctest_tmpdir_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t tmpdir doctest smoke did not record tmpdir metadata."
fi
doctest_block_key_db="$probe_dir/sagelite-doctest-block-key.sqlite3"
doctest_block_key_log="$dist_dir/doctest-block-key.log"
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --block-key "$doctest_block_key" \
      --sqlite "$doctest_block_key_db" "$doctest_smoke_file" \
      >"$doctest_block_key_log" 2>&1
doctest_block_key_status=$?
set -e
if [ "$doctest_block_key_status" -eq 124 ]; then
  tail -120 "$doctest_block_key_log" >&2
  record_blocker "sagelite-blocked: sage -t block-key doctest smoke timed out after $node_import_timeout; see $doctest_block_key_log for the first runtime blocker."
fi
if [ "$doctest_block_key_status" -ne 0 ]; then
  tail -120 "$doctest_block_key_log" >&2
  record_blocker "sagelite-blocked: sage -t block-key doctest smoke failed; see $doctest_block_key_log for the first runtime blocker."
fi
doctest_block_key_counts="$(sqlite3 "$doctest_block_key_db" "select status || '|' || total_blocks || '|' || passed_blocks || '|' || failed_blocks || '|' || skipped_blocks from runs order by id desc limit 1;")"
if [ "$doctest_block_key_counts" != "passed|1|1|0|0" ]; then
  cat "$doctest_block_key_log" >&2
  sqlite3 "$doctest_block_key_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t block-key doctest smoke wrote unexpected SQLite counts: $doctest_block_key_counts"
fi
doctest_block_key_match_count="$(sqlite3 "$doctest_block_key_db" "select count(*) from blocks where block_key = '$doctest_block_key' and source like '2^5%';")"
if [ "$doctest_block_key_match_count" != "1" ]; then
  cat "$doctest_block_key_log" >&2
  sqlite3 "$doctest_block_key_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t block-key doctest smoke did not rerun the requested block key."
fi
doctest_line="$(sqlite3 "$doctest_smoke_db" "select start_line from blocks where source like '2^5%' limit 1;")"
doctest_line_db="$probe_dir/sagelite-doctest-line.sqlite3"
doctest_line_log="$dist_dir/doctest-line.log"
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --line "$doctest_line" \
      --sqlite "$doctest_line_db" "$doctest_smoke_file" \
      >"$doctest_line_log" 2>&1
doctest_line_status=$?
set -e
if [ "$doctest_line_status" -eq 124 ]; then
  tail -120 "$doctest_line_log" >&2
  record_blocker "sagelite-blocked: sage -t line doctest smoke timed out after $node_import_timeout; see $doctest_line_log for the first runtime blocker."
fi
if [ "$doctest_line_status" -ne 0 ]; then
  tail -120 "$doctest_line_log" >&2
  record_blocker "sagelite-blocked: sage -t line doctest smoke failed; see $doctest_line_log for the first runtime blocker."
fi
doctest_line_counts="$(sqlite3 "$doctest_line_db" "select status || '|' || total_blocks || '|' || passed_blocks || '|' || failed_blocks || '|' || skipped_blocks from runs order by id desc limit 1;")"
if [ "$doctest_line_counts" != "passed|1|1|0|0" ]; then
  cat "$doctest_line_log" >&2
  sqlite3 "$doctest_line_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t line doctest smoke wrote unexpected SQLite counts: $doctest_line_counts"
fi
doctest_line_match_count="$(sqlite3 "$doctest_line_db" "select count(*) from blocks where start_line = $doctest_line and source like '2^5%';")"
if [ "$doctest_line_match_count" != "1" ]; then
  cat "$doctest_line_log" >&2
  sqlite3 "$doctest_line_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t line doctest smoke did not rerun the requested source line."
fi
doctest_line_setup_file="$probe_dir/sagelite-doctest-line-setup.py"
doctest_line_setup_db="$probe_dir/sagelite-doctest-line-setup.sqlite3"
doctest_line_setup_log="$dist_dir/doctest-line-setup.log"
cat >"$doctest_line_setup_file" <<'PY'
r"""
EXAMPLES::

    sage: line_setup_value = 37; line_setup_value
    37

    sage: line_setup_value += 5
    sage: line_setup_value + 5
    47
    sage: line_setup_value + 6
    48
"""
PY
doctest_line_setup_first_line="$(grep -nF 'sage: line_setup_value + 5' "$doctest_line_setup_file" | head -n 1 | cut -d: -f1)"
doctest_line_setup_line="$(grep -nF 'sage: line_setup_value + 6' "$doctest_line_setup_file" | head -n 1 | cut -d: -f1)"
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --line "$doctest_line_setup_first_line" \
      --line "$doctest_line_setup_line" \
      --sqlite "$doctest_line_setup_db" "$doctest_line_setup_file" \
      >"$doctest_line_setup_log" 2>&1
doctest_line_setup_status=$?
set -e
if [ "$doctest_line_setup_status" -eq 124 ]; then
  tail -120 "$doctest_line_setup_log" >&2
  record_blocker "sagelite-blocked: sage -t line-setup doctest smoke timed out after $node_import_timeout; see $doctest_line_setup_log for the first runtime blocker."
fi
if [ "$doctest_line_setup_status" -ne 0 ]; then
  tail -120 "$doctest_line_setup_log" >&2
  sqlite3 "$doctest_line_setup_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t line-setup doctest smoke failed; see $doctest_line_setup_log for the first runtime blocker."
fi
doctest_line_setup_counts="$(sqlite3 "$doctest_line_setup_db" "select status || '|' || total_blocks || '|' || passed_blocks || '|' || failed_blocks || '|' || skipped_blocks from runs order by id desc limit 1;")"
if [ "$doctest_line_setup_counts" != "passed|2|2|0|0" ]; then
  cat "$doctest_line_setup_log" >&2
  sqlite3 "$doctest_line_setup_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t line-setup doctest smoke wrote unexpected SQLite counts: $doctest_line_setup_counts"
fi
doctest_line_setup_match_count="$(sqlite3 "$doctest_line_setup_db" "select count(*) from blocks where start_line = $doctest_line_setup_line and source like 'line_setup_value + 6%';")"
if [ "$doctest_line_setup_match_count" != "1" ]; then
  cat "$doctest_line_setup_log" >&2
  sqlite3 "$doctest_line_setup_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t line-setup doctest smoke did not record the requested target line."
fi
doctest_line_setup_unexpected_count="$(sqlite3 "$doctest_line_setup_db" "select count(*) from blocks where start_line not in ($doctest_line_setup_first_line, $doctest_line_setup_line);")"
if [ "$doctest_line_setup_unexpected_count" != "0" ]; then
  cat "$doctest_line_setup_log" >&2
  sqlite3 "$doctest_line_setup_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t line-setup doctest smoke recorded an unselected setup block."
fi
doctest_skipped_line_file="$probe_dir/sagelite-doctest-skipped-line-setup.py"
doctest_skipped_line_db="$probe_dir/sagelite-doctest-skipped-line-setup.sqlite3"
doctest_skipped_line_log="$dist_dir/doctest-skipped-line-setup.log"
cat >"$doctest_skipped_line_file" <<'PY'
r"""
EXAMPLES::

    sage: raise RuntimeError("skipped target setup must not run")
    sage: 2^5  # needs unavailable.line_setup_backend
    32
"""
PY
doctest_skipped_line="$(grep -nF 'sage: 2^5' "$doctest_skipped_line_file" | head -n 1 | cut -d: -f1)"
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --line "$doctest_skipped_line" \
      --sqlite "$doctest_skipped_line_db" "$doctest_skipped_line_file" \
      >"$doctest_skipped_line_log" 2>&1
doctest_skipped_line_status=$?
set -e
if [ "$doctest_skipped_line_status" -eq 124 ]; then
  tail -120 "$doctest_skipped_line_log" >&2
  record_blocker "sagelite-blocked: sage -t skipped-line setup smoke timed out after $node_import_timeout; see $doctest_skipped_line_log for the first runtime blocker."
fi
if [ "$doctest_skipped_line_status" -ne 0 ]; then
  tail -120 "$doctest_skipped_line_log" >&2
  sqlite3 "$doctest_skipped_line_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t skipped-line setup smoke failed; see $doctest_skipped_line_log for the first runtime blocker."
fi
doctest_skipped_line_counts="$(sqlite3 "$doctest_skipped_line_db" "select status || '|' || total_blocks || '|' || passed_blocks || '|' || failed_blocks || '|' || skipped_blocks from runs order by id desc limit 1;")"
if [ "$doctest_skipped_line_counts" != "passed|1|0|0|1" ]; then
  cat "$doctest_skipped_line_log" >&2
  sqlite3 "$doctest_skipped_line_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t skipped-line setup smoke wrote unexpected SQLite counts: $doctest_skipped_line_counts"
fi
doctest_skipped_line_reason="$(sqlite3 "$doctest_skipped_line_db" "select skip_reason from blocks where start_line = $doctest_skipped_line;")"
if [ "$doctest_skipped_line_reason" != "optional:unavailable.line_setup_backend" ]; then
  cat "$doctest_skipped_line_log" >&2
  sqlite3 "$doctest_skipped_line_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t skipped-line setup smoke did not preserve the target skip reason: $doctest_skipped_line_reason"
fi
doctest_missing_line_db="$probe_dir/sagelite-doctest-missing-line.sqlite3"
doctest_missing_line_log="$dist_dir/doctest-missing-line.log"
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --line 999999 \
      --sqlite "$doctest_missing_line_db" "$doctest_smoke_file" \
      >"$doctest_missing_line_log" 2>&1
doctest_missing_line_status=$?
set -e
if [ "$doctest_missing_line_status" -eq 124 ]; then
  tail -120 "$doctest_missing_line_log" >&2
  record_blocker "sagelite-blocked: sage -t missing-line doctest smoke timed out after $node_import_timeout; see $doctest_missing_line_log for the first runtime blocker."
fi
if [ "$doctest_missing_line_status" -eq 0 ]; then
  cat "$doctest_missing_line_log" >&2
  sqlite3 "$doctest_missing_line_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t missing-line doctest smoke unexpectedly passed."
fi
doctest_missing_line_count="$(sqlite3 "$doctest_missing_line_db" "select count(*) from files where status = 'error' and failure_class = 'doctest_filter_miss' and failure_detail = 'no doctest block matched --line 999999';")"
if [ "$doctest_missing_line_count" != "1" ]; then
  cat "$doctest_missing_line_log" >&2
  sqlite3 "$doctest_missing_line_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t missing-line doctest smoke did not record filter-miss metadata."
fi
doctest_namespace_db="$probe_dir/sagelite-doctest-namespace.sqlite3"
doctest_namespace_log="$dist_dir/doctest-namespace.log"
doctest_namespace_file="$build_dir/src/sage/rings/rational.pyx"
doctest_namespace_line="$(grep -nF 'sage: sqrt(-2/3, prec=53)' "$doctest_namespace_file" | head -n 1 | cut -d: -f1)"
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$build_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --line "$doctest_namespace_line" \
      --sqlite "$doctest_namespace_db" "$doctest_namespace_file" \
      >"$doctest_namespace_log" 2>&1
doctest_namespace_status=$?
set -e
if [ "$doctest_namespace_status" -eq 124 ]; then
  tail -120 "$doctest_namespace_log" >&2
  record_blocker "sagelite-blocked: sage -t namespace doctest smoke timed out after $node_import_timeout; see $doctest_namespace_log for the first runtime blocker."
fi
if [ "$doctest_namespace_status" -ne 0 ]; then
  tail -120 "$doctest_namespace_log" >&2
  sqlite3 "$doctest_namespace_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t namespace doctest smoke failed; see $doctest_namespace_log for the first runtime blocker."
fi
doctest_namespace_count="$(sqlite3 "$doctest_namespace_db" "select count(*) from blocks where status = 'passed' and start_line = $doctest_namespace_line and source like 'sqrt(-2/3, prec=53)%';")"
if [ "$doctest_namespace_count" != "1" ]; then
  cat "$doctest_namespace_log" >&2
  sqlite3 "$doctest_namespace_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t namespace doctest smoke did not preserve Sage globals over module helper globals."
fi
doctest_imaginary_alias_file="$probe_dir/sagelite-doctest-imaginary-alias.py"
doctest_imaginary_alias_db="$probe_dir/sagelite-doctest-imaginary-alias.sqlite3"
doctest_imaginary_alias_log="$dist_dir/doctest-imaginary-alias.log"
cat >"$doctest_imaginary_alias_file" <<'PY'
r"""
EXAMPLES::

    sage: CC(i) == I
    True
"""
PY
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --sqlite "$doctest_imaginary_alias_db" "$doctest_imaginary_alias_file" \
      >"$doctest_imaginary_alias_log" 2>&1
doctest_imaginary_alias_status=$?
set -e
if [ "$doctest_imaginary_alias_status" -eq 124 ]; then
  tail -120 "$doctest_imaginary_alias_log" >&2
  record_blocker "sagelite-blocked: sage -t imaginary-alias doctest smoke timed out after $node_import_timeout; see $doctest_imaginary_alias_log for the first runtime blocker."
fi
if [ "$doctest_imaginary_alias_status" -ne 0 ]; then
  tail -120 "$doctest_imaginary_alias_log" >&2
  sqlite3 "$doctest_imaginary_alias_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t imaginary-alias doctest smoke failed; see $doctest_imaginary_alias_log for the first runtime blocker."
fi
doctest_imaginary_alias_count="$(sqlite3 "$doctest_imaginary_alias_db" "select count(*) from blocks where status = 'passed' and source like 'CC(i) == I%';")"
if [ "$doctest_imaginary_alias_count" != "1" ]; then
  cat "$doctest_imaginary_alias_log" >&2
  sqlite3 "$doctest_imaginary_alias_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t imaginary-alias doctest smoke did not resolve the lowercase imaginary-unit alias."
fi
doctest_cfinite_namespace_db="$probe_dir/sagelite-doctest-cfinite-namespace.sqlite3"
doctest_cfinite_namespace_log="$dist_dir/doctest-cfinite-namespace.log"
doctest_cfinite_namespace_file="$build_dir/src/sage/rings/cfinite_sequence.py"
doctest_cfinite_namespace_line="$(grep -nF 'sage: fibo = CFiniteSequence(x/(1-x-x^2))' "$doctest_cfinite_namespace_file" | head -n 1 | cut -d: -f1)"
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$build_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --optional=sage.symbolic \
      --line "$doctest_cfinite_namespace_line" \
      --sqlite "$doctest_cfinite_namespace_db" \
      "$doctest_cfinite_namespace_file" \
      >"$doctest_cfinite_namespace_log" 2>&1
doctest_cfinite_namespace_status=$?
set -e
if [ "$doctest_cfinite_namespace_status" -eq 124 ]; then
  tail -120 "$doctest_cfinite_namespace_log" >&2
  record_blocker "sagelite-blocked: sage -t C-finite namespace smoke timed out after $node_import_timeout; see $doctest_cfinite_namespace_log for the first runtime blocker."
fi
if [ "$doctest_cfinite_namespace_status" -ne 0 ]; then
  tail -120 "$doctest_cfinite_namespace_log" >&2
  sqlite3 "$doctest_cfinite_namespace_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t C-finite namespace smoke failed; see $doctest_cfinite_namespace_log for the first runtime blocker."
fi
doctest_cfinite_namespace_count="$(sqlite3 "$doctest_cfinite_namespace_db" "select count(*) from blocks where status = 'passed' and start_line = $doctest_cfinite_namespace_line and source like 'fibo = CFiniteSequence(x/(1-x-x^2))%';")"
if [ "$doctest_cfinite_namespace_count" != "1" ]; then
  cat "$doctest_cfinite_namespace_log" >&2
  sqlite3 "$doctest_cfinite_namespace_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t C-finite namespace smoke did not seed the module's polynomial generator."
fi
doctest_coxeter_namespace_db="$probe_dir/sagelite-doctest-coxeter-namespace.sqlite3"
doctest_coxeter_namespace_log="$dist_dir/doctest-coxeter-namespace.log"
doctest_coxeter_namespace_file="$build_dir/src/sage/groups/matrix_gps/coxeter_group.py"
doctest_coxeter_namespace_line="$(grep -nF "sage: W = CoxeterGroup(['D',5], implementation='reflection'); W" "$doctest_coxeter_namespace_file" | head -n 1 | cut -d: -f1)"
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$build_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --line "$doctest_coxeter_namespace_line" \
      --sqlite "$doctest_coxeter_namespace_db" \
      "$doctest_coxeter_namespace_file" \
      >"$doctest_coxeter_namespace_log" 2>&1
doctest_coxeter_namespace_status=$?
set -e
if [ "$doctest_coxeter_namespace_status" -eq 124 ]; then
  tail -120 "$doctest_coxeter_namespace_log" >&2
  record_blocker "sagelite-blocked: sage -t Coxeter namespace smoke timed out after $node_import_timeout; see $doctest_coxeter_namespace_log for the first runtime blocker."
fi
if [ "$doctest_coxeter_namespace_status" -ne 0 ]; then
  tail -120 "$doctest_coxeter_namespace_log" >&2
  sqlite3 "$doctest_coxeter_namespace_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t Coxeter namespace smoke failed; see $doctest_coxeter_namespace_log for the first runtime blocker."
fi
doctest_coxeter_namespace_count="$(sqlite3 "$doctest_coxeter_namespace_db" "select count(*) from blocks where status = 'passed' and start_line = $doctest_coxeter_namespace_line and source like 'W = CoxeterGroup(%';")"
if [ "$doctest_coxeter_namespace_count" != "1" ]; then
  cat "$doctest_coxeter_namespace_log" >&2
  sqlite3 "$doctest_coxeter_namespace_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t Coxeter namespace smoke did not seed the module's public constructor."
fi
doctest_simplicial_catalog_db="$probe_dir/sagelite-doctest-simplicial-catalog.sqlite3"
doctest_simplicial_catalog_log="$dist_dir/doctest-simplicial-catalog.log"
doctest_simplicial_catalog_file="$build_dir/src/sage/topology/simplicial_complex_catalog.py"
doctest_simplicial_catalog_line="$(grep -nF 'sage: S = simplicial_complexes.Sphere(2) # the 2-sphere' "$doctest_simplicial_catalog_file" | head -n 1 | cut -d: -f1)"
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$build_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --line "$doctest_simplicial_catalog_line" \
      --sqlite "$doctest_simplicial_catalog_db" \
      "$doctest_simplicial_catalog_file" \
      >"$doctest_simplicial_catalog_log" 2>&1
doctest_simplicial_catalog_status=$?
set -e
if [ "$doctest_simplicial_catalog_status" -eq 124 ]; then
  tail -120 "$doctest_simplicial_catalog_log" >&2
  record_blocker "sagelite-blocked: sage -t simplicial catalog smoke timed out after $node_import_timeout; see $doctest_simplicial_catalog_log for the first runtime blocker."
fi
if [ "$doctest_simplicial_catalog_status" -ne 0 ]; then
  tail -120 "$doctest_simplicial_catalog_log" >&2
  sqlite3 "$doctest_simplicial_catalog_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t simplicial catalog smoke failed; see $doctest_simplicial_catalog_log for the first runtime blocker."
fi
doctest_simplicial_catalog_count="$(sqlite3 "$doctest_simplicial_catalog_db" "select count(*) from blocks where status = 'passed' and start_line = $doctest_simplicial_catalog_line and source like 'S = simplicial_complexes.Sphere(2)%';")"
if [ "$doctest_simplicial_catalog_count" != "1" ]; then
  cat "$doctest_simplicial_catalog_log" >&2
  sqlite3 "$doctest_simplicial_catalog_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t simplicial catalog smoke did not seed the startup catalog alias."
fi
doctest_simplicial_homset_db="$probe_dir/sagelite-doctest-simplicial-homset.sqlite3"
doctest_simplicial_homset_log="$dist_dir/doctest-simplicial-homset.log"
doctest_simplicial_homset_file="$build_dir/src/sage/topology/simplicial_complex_homset.py"
doctest_simplicial_homset_line="$(grep -nF 'sage: T = SimplicialComplex([[0], [1]], immutable=True)' "$doctest_simplicial_homset_file" | head -n 1 | cut -d: -f1)"
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$build_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --line "$doctest_simplicial_homset_line" \
      --sqlite "$doctest_simplicial_homset_db" \
      "$doctest_simplicial_homset_file" \
      >"$doctest_simplicial_homset_log" 2>&1
doctest_simplicial_homset_status=$?
set -e
if [ "$doctest_simplicial_homset_status" -eq 124 ]; then
  tail -120 "$doctest_simplicial_homset_log" >&2
  record_blocker "sagelite-blocked: sage -t simplicial homset smoke timed out after $node_import_timeout; see $doctest_simplicial_homset_log for the first runtime blocker."
fi
if [ "$doctest_simplicial_homset_status" -ne 0 ]; then
  tail -120 "$doctest_simplicial_homset_log" >&2
  sqlite3 "$doctest_simplicial_homset_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t simplicial homset smoke failed; see $doctest_simplicial_homset_log for the first runtime blocker."
fi
doctest_simplicial_homset_count="$(sqlite3 "$doctest_simplicial_homset_db" "select count(*) from blocks where status = 'passed' and start_line = $doctest_simplicial_homset_line and source like 'T = SimplicialComplex(%';")"
if [ "$doctest_simplicial_homset_count" != "1" ]; then
  cat "$doctest_simplicial_homset_log" >&2
  sqlite3 "$doctest_simplicial_homset_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t simplicial homset smoke did not seed the startup constructor."
fi
doctest_simplicial_complex_moment_angle_db="$probe_dir/sagelite-doctest-simplicial-complex-moment-angle.sqlite3"
doctest_simplicial_complex_moment_angle_log="$dist_dir/doctest-simplicial-complex-moment-angle.log"
doctest_simplicial_complex_moment_angle_file="$build_dir/src/sage/topology/simplicial_complex.py"
doctest_simplicial_complex_moment_angle_setup_line="$(grep -nF 'sage: K = simplicial_complexes.KleinBottle()' "$doctest_simplicial_complex_moment_angle_file" | tail -n 1 | cut -d: -f1)"
doctest_simplicial_complex_moment_angle_line="$(grep -nF 'sage: Z = MomentAngleComplex(K); Z' "$doctest_simplicial_complex_moment_angle_file" | head -n 1 | cut -d: -f1)"
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$build_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --line "$doctest_simplicial_complex_moment_angle_setup_line" \
      --line "$doctest_simplicial_complex_moment_angle_line" \
      --sqlite "$doctest_simplicial_complex_moment_angle_db" \
      "$doctest_simplicial_complex_moment_angle_file" \
      >"$doctest_simplicial_complex_moment_angle_log" 2>&1
doctest_simplicial_complex_moment_angle_status=$?
set -e
if [ "$doctest_simplicial_complex_moment_angle_status" -eq 124 ]; then
  tail -120 "$doctest_simplicial_complex_moment_angle_log" >&2
  record_blocker "sagelite-blocked: sage -t simplicial-complex moment-angle smoke timed out after $node_import_timeout; see $doctest_simplicial_complex_moment_angle_log for the first runtime blocker."
fi
if [ "$doctest_simplicial_complex_moment_angle_status" -ne 0 ]; then
  tail -120 "$doctest_simplicial_complex_moment_angle_log" >&2
  sqlite3 "$doctest_simplicial_complex_moment_angle_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t simplicial-complex moment-angle smoke failed; see $doctest_simplicial_complex_moment_angle_log for the first runtime blocker."
fi
doctest_simplicial_complex_moment_angle_count="$(sqlite3 "$doctest_simplicial_complex_moment_angle_db" "select count(*) from blocks where status = 'passed' and start_line = $doctest_simplicial_complex_moment_angle_line and source like 'Z = MomentAngleComplex(K)%';")"
if [ "$doctest_simplicial_complex_moment_angle_count" != "1" ]; then
  cat "$doctest_simplicial_complex_moment_angle_log" >&2
  sqlite3 "$doctest_simplicial_complex_moment_angle_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t simplicial-complex moment-angle smoke did not seed the public constructor."
fi
doctest_simplicial_set_catalog_db="$probe_dir/sagelite-doctest-simplicial-set-catalog.sqlite3"
doctest_simplicial_set_catalog_log="$dist_dir/doctest-simplicial-set-catalog.log"
doctest_simplicial_set_catalog_file="$build_dir/src/sage/topology/simplicial_set_catalog.py"
doctest_simplicial_set_catalog_line="$(grep -nF 'sage: eta = simplicial_sets.HopfMap()' "$doctest_simplicial_set_catalog_file" | head -n 1 | cut -d: -f1)"
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$build_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --line "$doctest_simplicial_set_catalog_line" \
      --sqlite "$doctest_simplicial_set_catalog_db" \
      "$doctest_simplicial_set_catalog_file" \
      >"$doctest_simplicial_set_catalog_log" 2>&1
doctest_simplicial_set_catalog_status=$?
set -e
if [ "$doctest_simplicial_set_catalog_status" -eq 124 ]; then
  tail -120 "$doctest_simplicial_set_catalog_log" >&2
  record_blocker "sagelite-blocked: sage -t simplicial set catalog smoke timed out after $node_import_timeout; see $doctest_simplicial_set_catalog_log for the first runtime blocker."
fi
if [ "$doctest_simplicial_set_catalog_status" -ne 0 ]; then
  tail -120 "$doctest_simplicial_set_catalog_log" >&2
  sqlite3 "$doctest_simplicial_set_catalog_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t simplicial set catalog smoke failed; see $doctest_simplicial_set_catalog_log for the first runtime blocker."
fi
doctest_simplicial_set_catalog_count="$(sqlite3 "$doctest_simplicial_set_catalog_db" "select count(*) from blocks where status = 'passed' and start_line = $doctest_simplicial_set_catalog_line and source like 'eta = simplicial_sets.HopfMap()%';")"
if [ "$doctest_simplicial_set_catalog_count" != "1" ]; then
  cat "$doctest_simplicial_set_catalog_log" >&2
  sqlite3 "$doctest_simplicial_set_catalog_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t simplicial set catalog smoke did not seed the startup catalog alias."
fi
doctest_cell_complex_db="$probe_dir/sagelite-doctest-cell-complex.sqlite3"
doctest_cell_complex_log="$dist_dir/doctest-cell-complex.log"
doctest_cell_complex_file="$build_dir/src/sage/topology/cell_complex.py"
doctest_cell_complex_line="$(grep -nF 'sage: delta_complexes.Sphere(3).dimension()' "$doctest_cell_complex_file" | head -n 1 | cut -d: -f1)"
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$build_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --line "$doctest_cell_complex_line" \
      --sqlite "$doctest_cell_complex_db" \
      "$doctest_cell_complex_file" \
      >"$doctest_cell_complex_log" 2>&1
doctest_cell_complex_status=$?
set -e
if [ "$doctest_cell_complex_status" -eq 124 ]; then
  tail -120 "$doctest_cell_complex_log" >&2
  record_blocker "sagelite-blocked: sage -t cell complex smoke timed out after $node_import_timeout; see $doctest_cell_complex_log for the first runtime blocker."
fi
if [ "$doctest_cell_complex_status" -ne 0 ]; then
  tail -120 "$doctest_cell_complex_log" >&2
  sqlite3 "$doctest_cell_complex_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t cell complex smoke failed; see $doctest_cell_complex_log for the first runtime blocker."
fi
doctest_cell_complex_count="$(sqlite3 "$doctest_cell_complex_db" "select count(*) from blocks where status = 'passed' and start_line = $doctest_cell_complex_line and source like 'delta_complexes.Sphere(3).dimension()%';")"
if [ "$doctest_cell_complex_count" != "1" ]; then
  cat "$doctest_cell_complex_log" >&2
  sqlite3 "$doctest_cell_complex_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t cell complex smoke did not seed the startup catalog aliases."
fi
doctest_sandpile_import_db="$probe_dir/sagelite-doctest-sandpile-import.sqlite3"
doctest_sandpile_import_log="$dist_dir/doctest-sandpile-import.log"
doctest_sandpile_import_file="$build_dir/src/sage/sandpiles/examples.py"
doctest_sandpile_import_line="$(grep -nF 'sage: s = sandpiles.Complete(4)' "$doctest_sandpile_import_file" | head -n 1 | cut -d: -f1)"
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$build_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --line "$doctest_sandpile_import_line" \
      --sqlite "$doctest_sandpile_import_db" \
      "$doctest_sandpile_import_file" \
      >"$doctest_sandpile_import_log" 2>&1
doctest_sandpile_import_status=$?
set -e
if [ "$doctest_sandpile_import_status" -eq 124 ]; then
  tail -120 "$doctest_sandpile_import_log" >&2
  record_blocker "sagelite-blocked: sage -t sandpile import smoke timed out after $node_import_timeout; see $doctest_sandpile_import_log for the first runtime blocker."
fi
if [ "$doctest_sandpile_import_status" -ne 0 ]; then
  tail -120 "$doctest_sandpile_import_log" >&2
  sqlite3 "$doctest_sandpile_import_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t sandpile import smoke failed; see $doctest_sandpile_import_log for the first runtime blocker."
fi
doctest_sandpile_import_count="$(sqlite3 "$doctest_sandpile_import_db" "select count(*) from blocks where status = 'passed' and start_line = $doctest_sandpile_import_line and source like 's = sandpiles.Complete(4)%';")"
if [ "$doctest_sandpile_import_count" != "1" ]; then
  cat "$doctest_sandpile_import_log" >&2
  sqlite3 "$doctest_sandpile_import_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t sandpile import smoke did not load the IPython-free examples catalog."
fi
doctest_module_global_exclusion_db="$probe_dir/sagelite-doctest-module-global-exclusion.sqlite3"
doctest_module_global_exclusion_log="$dist_dir/doctest-module-global-exclusion.log"
doctest_module_global_exclusion_file="$build_dir/src/sage/misc/dev_tools.py"
doctest_module_global_exclusion_find_line="$(grep -nF "sage: 'find_objects_from_name' in globals()" "$doctest_module_global_exclusion_file" | head -n 1 | cut -d: -f1)"
doctest_module_global_exclusion_import_line="$(grep -nF 'sage: import_statement_string' "$doctest_module_global_exclusion_file" | tail -n 1 | cut -d: -f1)"
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$build_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --line "$doctest_module_global_exclusion_find_line" \
      --line "$doctest_module_global_exclusion_import_line" \
      --sqlite "$doctest_module_global_exclusion_db" \
      "$doctest_module_global_exclusion_file" \
      >"$doctest_module_global_exclusion_log" 2>&1
doctest_module_global_exclusion_status=$?
set -e
if [ "$doctest_module_global_exclusion_status" -eq 124 ]; then
  tail -120 "$doctest_module_global_exclusion_log" >&2
  record_blocker "sagelite-blocked: sage -t tested-module global exclusion smoke timed out after $node_import_timeout; see $doctest_module_global_exclusion_log for the first runtime blocker."
fi
if [ "$doctest_module_global_exclusion_status" -ne 0 ]; then
  tail -120 "$doctest_module_global_exclusion_log" >&2
  sqlite3 "$doctest_module_global_exclusion_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t tested-module global exclusion smoke failed; see $doctest_module_global_exclusion_log for the first runtime blocker."
fi
doctest_module_global_exclusion_counts="$(sqlite3 "$doctest_module_global_exclusion_db" "select passed_blocks || '|' || failed_blocks || '|' || skipped_blocks from runs order by id desc limit 1;")"
if [ "$doctest_module_global_exclusion_counts" != "2|0|0" ]; then
  cat "$doctest_module_global_exclusion_log" >&2
  sqlite3 "$doctest_module_global_exclusion_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t tested-module global exclusion smoke wrote unexpected SQLite counts: $doctest_module_global_exclusion_counts"
fi
doctest_module_global_override_db="$probe_dir/sagelite-doctest-module-global-override.sqlite3"
doctest_module_global_override_log="$dist_dir/doctest-module-global-override.log"
doctest_module_global_override_file="$build_dir/src/sage/functions/other.py"
doctest_module_global_override_line="$(grep -nF 'sage: type(binomial._eval_(5., 3))' "$doctest_module_global_override_file" | head -n 1 | cut -d: -f1)"
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$build_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --line "$doctest_module_global_override_line" \
      --sqlite "$doctest_module_global_override_db" \
      "$doctest_module_global_override_file" \
      >"$doctest_module_global_override_log" 2>&1
doctest_module_global_override_status=$?
set -e
if [ "$doctest_module_global_override_status" -eq 124 ]; then
  tail -120 "$doctest_module_global_override_log" >&2
  record_blocker "sagelite-blocked: sage -t tested-module global override smoke timed out after $node_import_timeout; see $doctest_module_global_override_log for the first runtime blocker."
fi
if [ "$doctest_module_global_override_status" -ne 0 ]; then
  tail -120 "$doctest_module_global_override_log" >&2
  sqlite3 "$doctest_module_global_override_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t tested-module global override smoke failed; see $doctest_module_global_override_log for the first runtime blocker."
fi
doctest_module_global_override_count="$(sqlite3 "$doctest_module_global_override_db" "select count(*) from blocks where status = 'passed' and start_line = $doctest_module_global_override_line and source = 'type(binomial._eval_(5., 3))' || char(10);")"
if [ "$doctest_module_global_override_count" != "1" ]; then
  cat "$doctest_module_global_override_log" >&2
  sqlite3 "$doctest_module_global_override_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t tested-module global override smoke did not prefer the symbolic binomial object."
fi
doctest_namespace_leak_db="$probe_dir/sagelite-doctest-namespace-leak.sqlite3"
doctest_namespace_leak_log="$dist_dir/doctest-namespace-leak.log"
doctest_namespace_leak_file="$probe_dir/rational.pyx"
cat >"$doctest_namespace_leak_file" <<'PY'
r"""
EXAMPLES::

    sage: from gmpy2 import *
    sage: cowasm_shadow_leak = 17
"""

r"""
EXAMPLES::

    sage: sqrt(QQ(25)/QQ(9))
    5/3
    sage: log(QQ(125), 5)
    3
    sage: cowasm_shadow_leak
    Traceback (most recent call last):
    ...
    NameError: name 'cowasm_shadow_leak' is not defined
"""
PY
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --sqlite "$doctest_namespace_leak_db" "$doctest_namespace_leak_file" \
      >"$doctest_namespace_leak_log" 2>&1
doctest_namespace_leak_status=$?
set -e
if [ "$doctest_namespace_leak_status" -eq 124 ]; then
  tail -120 "$doctest_namespace_leak_log" >&2
  record_blocker "sagelite-blocked: sage -t namespace-leak doctest smoke timed out after $node_import_timeout; see $doctest_namespace_leak_log for the first runtime blocker."
fi
if [ "$doctest_namespace_leak_status" -ne 0 ]; then
  tail -120 "$doctest_namespace_leak_log" >&2
  sqlite3 "$doctest_namespace_leak_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t namespace-leak doctest smoke failed; see $doctest_namespace_leak_log for the first runtime blocker."
fi
doctest_namespace_leak_count="$(sqlite3 "$doctest_namespace_leak_db" "select count(*) from blocks where status = 'passed' and source in ('sqrt(QQ(25)/QQ(9))' || char(10), 'log(QQ(125), 5)' || char(10), 'cowasm_shadow_leak' || char(10));")"
if [ "$doctest_namespace_leak_count" != "3" ]; then
  cat "$doctest_namespace_leak_log" >&2
  sqlite3 "$doctest_namespace_leak_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t namespace-leak doctest smoke did not restore Sage globals between Cython docstrings."
fi
doctest_stats_namespace_db="$probe_dir/sagelite-doctest-stats-namespace.sqlite3"
doctest_stats_namespace_log="$dist_dir/doctest-stats-namespace.log"
doctest_stats_namespace_file="$probe_dir/sagelite-doctest-stats-namespace.py"
cat >"$doctest_stats_namespace_file" <<'PY'
"""
Check that the stripped Sagelite startup namespace includes lightweight catalogs.

EXAMPLES::

    sage: hasattr(distributions, "DiscreteGaussianDistributionPolynomialSampler")
    True
    sage: mq.SR(1, 1, 1, 4, allow_zero_inversions=True).sbox()(0)
    6
"""
PY
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --sqlite "$doctest_stats_namespace_db" "$doctest_stats_namespace_file" \
      >"$doctest_stats_namespace_log" 2>&1
doctest_stats_namespace_status=$?
set -e
if [ "$doctest_stats_namespace_status" -eq 124 ]; then
  tail -120 "$doctest_stats_namespace_log" >&2
  record_blocker "sagelite-blocked: sage -t stats-namespace doctest smoke timed out after $node_import_timeout; see $doctest_stats_namespace_log for the first runtime blocker."
fi
if [ "$doctest_stats_namespace_status" -ne 0 ]; then
  tail -120 "$doctest_stats_namespace_log" >&2
  sqlite3 "$doctest_stats_namespace_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t stats-namespace doctest smoke failed; see $doctest_stats_namespace_log for the first runtime blocker."
fi
doctest_stats_namespace_count="$(sqlite3 "$doctest_stats_namespace_db" "select count(*) from blocks where status = 'passed' and source like 'hasattr(distributions, \"DiscreteGaussianDistributionPolynomialSampler\")%';")"
if [ "$doctest_stats_namespace_count" != "1" ]; then
  cat "$doctest_stats_namespace_log" >&2
  sqlite3 "$doctest_stats_namespace_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t stats-namespace doctest smoke did not expose the stats distributions catalog."
fi
doctest_mq_namespace_count="$(sqlite3 "$doctest_stats_namespace_db" "select count(*) from blocks where status = 'passed' and source like 'mq.SR(1, 1, 1, 4, allow_zero_inversions=True).sbox()(0)%';")"
if [ "$doctest_mq_namespace_count" != "1" ]; then
  cat "$doctest_stats_namespace_log" >&2
  sqlite3 "$doctest_stats_namespace_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t startup-namespace doctest smoke did not expose the crypto mq catalog."
fi
doctest_user_globals_db="$probe_dir/sagelite-doctest-user-globals.sqlite3"
doctest_user_globals_log="$dist_dir/doctest-user-globals.log"
doctest_user_globals_file="$probe_dir/sagelite-doctest-user-globals.py"
cat >"$doctest_user_globals_file" <<'PY'
"""
Check that helpers using Sage's REPL global registry see doctest globals.

EXAMPLES::

    sage: from sage.repl.user_globals import get_globals
    sage: get_globals()["user_globals_smoke"] = 41
    sage: get_globals()["user_globals_smoke"] + 1
    42
"""
PY
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --sqlite "$doctest_user_globals_db" "$doctest_user_globals_file" \
      >"$doctest_user_globals_log" 2>&1
doctest_user_globals_status=$?
set -e
if [ "$doctest_user_globals_status" -eq 124 ]; then
  tail -120 "$doctest_user_globals_log" >&2
  record_blocker "sagelite-blocked: sage -t user-globals doctest smoke timed out after $node_import_timeout; see $doctest_user_globals_log for the first runtime blocker."
fi
if [ "$doctest_user_globals_status" -ne 0 ]; then
  tail -120 "$doctest_user_globals_log" >&2
  sqlite3 "$doctest_user_globals_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t user-globals doctest smoke failed; see $doctest_user_globals_log for the first runtime blocker."
fi
doctest_user_globals_count="$(sqlite3 "$doctest_user_globals_db" "select count(*) from blocks where status = 'passed' and source like 'get_globals()[\"user_globals_smoke\"] + 1%';")"
if [ "$doctest_user_globals_count" != "1" ]; then
  cat "$doctest_user_globals_log" >&2
  sqlite3 "$doctest_user_globals_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t user-globals doctest smoke did not expose doctest globals through sage.repl.user_globals."
fi
doctest_session_state_db="$probe_dir/sagelite-doctest-session-state.sqlite3"
doctest_session_state_log="$dist_dir/doctest-session-state.log"
doctest_session_state_file="$probe_dir/sagelite-doctest-session-state.py"
cat >"$doctest_session_state_file" <<'PY'
"""
Check that helpers using Sage's session snapshot see doctest globals.

EXAMPLES::

    sage: show_identifiers()
    []
    sage: session_state_smoke = 42
    sage: show_identifiers()
    ['session_state_smoke']
    sage: print("session-state preface\nsession-state suffix")
    ...
    session-state suffix
"""
PY
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --sqlite "$doctest_session_state_db" "$doctest_session_state_file" \
      >"$doctest_session_state_log" 2>&1
doctest_session_state_status=$?
set -e
if [ "$doctest_session_state_status" -eq 124 ]; then
  tail -120 "$doctest_session_state_log" >&2
  record_blocker "sagelite-blocked: sage -t session-state doctest smoke timed out after $node_import_timeout; see $doctest_session_state_log for the first runtime blocker."
fi
if [ "$doctest_session_state_status" -ne 0 ]; then
  tail -120 "$doctest_session_state_log" >&2
  sqlite3 "$doctest_session_state_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t session-state doctest smoke failed; see $doctest_session_state_log for the first runtime blocker."
fi
doctest_session_state_count="$(sqlite3 "$doctest_session_state_db" "select count(*) from blocks where status = 'passed' and source like 'show_identifiers()%';")"
if [ "$doctest_session_state_count" != "2" ]; then
  cat "$doctest_session_state_log" >&2
  sqlite3 "$doctest_session_state_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t session-state doctest smoke did not initialize Sage's session snapshot from the doctest namespace."
fi
doctest_session_ellipsis_count="$(sqlite3 "$doctest_session_state_db" "select count(*) from blocks where status = 'passed' and expected = '...' || char(10) || 'session-state suffix' || char(10) and source like 'print(\"session-state preface%';")"
if [ "$doctest_session_ellipsis_count" != "1" ]; then
  cat "$doctest_session_state_log" >&2
  sqlite3 "$doctest_session_state_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t session-state doctest smoke did not preserve standalone ellipsis output."
fi
doctest_optional_magma_count="$(sqlite3 "$doctest_smoke_db" "select count(*) from blocks where status = 'skipped' and skip_reason = 'optional:magma' and tags like '%optional:magma%';")"
if [ "$doctest_optional_magma_count" != "1" ]; then
  cat "$doctest_smoke_log" >&2
  sqlite3 "$doctest_smoke_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t doctest smoke did not record optional feature metadata."
fi
doctest_propagated_needs_count="$(sqlite3 "$doctest_smoke_db" "select count(*) from blocks where status = 'skipped' and source = '19 + 23' || char(10) and skip_reason = 'optional:cowasm_smoke' and tags like '%needs:cowasm_smoke%';")"
if [ "$doctest_propagated_needs_count" != "1" ]; then
  cat "$doctest_smoke_log" >&2
  sqlite3 "$doctest_smoke_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t doctest smoke did not propagate standalone needs metadata."
fi
doctest_propagated_after_output_count="$(sqlite3 "$doctest_smoke_db" "select count(*) from blocks where status = 'skipped' and source = 'cowasm_propagated_setup + 2' || char(10) and skip_reason = 'optional:cowasm_smoke' and tags like '%needs:cowasm_smoke%';")"
if [ "$doctest_propagated_after_output_count" != "1" ]; then
  cat "$doctest_smoke_log" >&2
  sqlite3 "$doctest_smoke_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t doctest smoke did not propagate standalone needs metadata past skipped output."
fi
doctest_propagated_after_inline_skip_count="$(sqlite3 "$doctest_smoke_db" "select count(*) from blocks where status = 'skipped' and source = 'cowasm_nested_directive_setup + 2' || char(10) and skip_reason = 'optional:cowasm_smoke' and tags like '%needs:cowasm_smoke%' and tags not like '%needs:cowasm_companion%';")"
if [ "$doctest_propagated_after_inline_skip_count" != "1" ]; then
  cat "$doctest_smoke_log" >&2
  sqlite3 "$doctest_smoke_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t doctest smoke did not propagate standalone needs metadata past multi-line skipped inline output."
fi
doctest_composed_directive_count="$(sqlite3 "$doctest_smoke_db" "select count(*) from blocks where status = 'skipped' and source = 'cowasm_composed_directive_setup + 2' || char(10) and skip_reason = 'deferred:known bug' and tags like '%needs:cowasm_smoke%' and tags like '%deferred:known bug%';")"
if [ "$doctest_composed_directive_count" != "1" ]; then
  cat "$doctest_smoke_log" >&2
  sqlite3 "$doctest_smoke_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t doctest smoke did not compose consecutive standalone directives."
fi
doctest_deferred_count="$(sqlite3 "$doctest_smoke_db" "select count(*) from blocks where status = 'skipped' and skip_reason in ('deferred:known bug', 'deferred:not implemented', 'deferred:not tested', 'deferred:py2') and tags like '%' || skip_reason || '%';")"
if [ "$doctest_deferred_count" != "6" ]; then
  cat "$doctest_smoke_log" >&2
  sqlite3 "$doctest_smoke_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t doctest smoke did not record deferred skip metadata."
fi
doctest_skip_reason_clusters="$(sqlite3 "$doctest_smoke_db" <"$src_dir/doctest-sql/skips-by-reason.sql")"
for expected_skip_reason in \
  'optional:cowasm_smoke|skip|optional,needs:cowasm_smoke|6' \
  'optional:cowasm_smoke|skip|optional,optional:cowasm_smoke|1' \
  'optional:cowasm_smoke,cowasm_companion|skip|optional,needs:cowasm_smoke,needs:cowasm_companion|2' \
  'optional:magma|skip|optional,optional:magma|1' \
  'long time|skip|long time|1' \
  'deferred:known bug|skip|deferred,deferred:known bug|2' \
  'deferred:known bug|skip|optional,deferred,deferred:known bug,needs:cowasm_smoke|1' \
  'deferred:not implemented|skip|deferred,deferred:not implemented|1' \
  'deferred:not tested|skip|deferred,deferred:not tested|1' \
  'deferred:py2|skip|deferred,deferred:py2|1'; do
  if ! printf '%s\n' "$doctest_skip_reason_clusters" |
      grep -Fq "$expected_skip_reason"; then
    cat "$doctest_smoke_log" >&2
    printf '%s\n' "$doctest_skip_reason_clusters" >&2
    sqlite3 "$doctest_smoke_db" ".dump" >&2 || true
    record_blocker "sagelite-blocked: skips-by-reason query missed $expected_skip_reason."
  fi
done
doctest_tolerance_count="$(sqlite3 "$doctest_smoke_db" "select count(*) from blocks where status = 'passed' and expected_kind = 'tolerance' and tags like '%tolerance%';")"
if [ "$doctest_tolerance_count" != "2" ]; then
  cat "$doctest_smoke_log" >&2
  sqlite3 "$doctest_smoke_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t doctest smoke did not record the tolerance doctest."
fi
doctest_random_count="$(sqlite3 "$doctest_smoke_db" "select count(*) from blocks where status = 'passed' and failure_class = 'random_unchecked';")"
if [ "$doctest_random_count" != "1" ]; then
  cat "$doctest_smoke_log" >&2
  sqlite3 "$doctest_smoke_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t doctest smoke did not record the random doctest as unchecked."
fi
doctest_missing_db="$probe_dir/sagelite-doctest-missing-file.sqlite3"
doctest_missing_log="$dist_dir/doctest-missing-file.log"
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --sqlite "$doctest_missing_db" "$probe_dir/does-not-exist.py" \
      >"$doctest_missing_log" 2>&1
doctest_missing_status=$?
set -e
if [ "$doctest_missing_status" -eq 124 ]; then
  tail -120 "$doctest_missing_log" >&2
  record_blocker "sagelite-blocked: sage -t missing-file doctest smoke timed out after $node_import_timeout; see $doctest_missing_log for the first runtime blocker."
fi
if [ "$doctest_missing_status" -eq 0 ]; then
  cat "$doctest_missing_log" >&2
  sqlite3 "$doctest_missing_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t missing-file doctest smoke unexpectedly passed."
fi
doctest_missing_count="$(sqlite3 "$doctest_missing_db" "select count(*) from files where status = 'error' and failure_class = 'FileNotFoundError' and failure_detail like '%No such file%';")"
if [ "$doctest_missing_count" != "1" ]; then
  cat "$doctest_missing_log" >&2
  sqlite3 "$doctest_missing_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t missing-file doctest smoke did not record file-level failure metadata."
fi
doctest_timeout_file="$probe_dir/sagelite-doctest-timeout.py"
doctest_timeout_db="$probe_dir/sagelite-doctest-timeout.sqlite3"
doctest_timeout_log="$dist_dir/doctest-timeout.log"
cat >"$doctest_timeout_file" <<'PY'
r"""
EXAMPLES::

    sage: while True:
    ....:     pass
"""
PY
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --timeout "$doctest_timeout_smoke_seconds" \
      --sqlite "$doctest_timeout_db" "$doctest_timeout_file" \
      >"$doctest_timeout_log" 2>&1
doctest_timeout_status=$?
set -e
if [ "$doctest_timeout_status" -eq 124 ]; then
  tail -120 "$doctest_timeout_log" >&2
  record_blocker "sagelite-blocked: sage -t timeout smoke reached the outer $node_import_timeout timeout; see $doctest_timeout_log for the first runtime blocker."
fi
if [ "$doctest_timeout_status" -eq 0 ]; then
  cat "$doctest_timeout_log" >&2
  sqlite3 "$doctest_timeout_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t timeout smoke unexpectedly passed."
fi
doctest_timeout_count="$(sqlite3 "$doctest_timeout_db" "select count(*) from files where status = 'error' and failure_class = 'timeout' and failure_detail like '%timed out after ${doctest_timeout_smoke_seconds}s%' and failure_detail like '%while True:%';")"
if [ "$doctest_timeout_count" != "1" ]; then
  cat "$doctest_timeout_log" >&2
  sqlite3 "$doctest_timeout_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t timeout smoke did not record process-level timeout metadata."
fi
doctest_query_db="$probe_dir/sagelite-doctest-query-smoke.sqlite3"
sqlite3 "$doctest_query_db" <<'SQL'
create table runs (
  id integer primary key
);
create table files (
  id integer primary key,
  run_id integer not null,
  path text not null,
  status text not null,
  total_blocks integer not null default 0,
  passed_blocks integer not null default 0,
  failed_blocks integer not null,
  skipped_blocks integer not null default 0,
  failure_class text,
  failure_detail text,
  stderr text,
  duration_ms integer not null default 0
);
create table blocks (
  file_id integer not null,
  status text not null,
  failure_class text,
  actual text,
  start_line integer,
  skip_reason text,
  tags text,
  source text
);
insert into runs (id) values (1);
insert into files (
  id, run_id, path, status, total_blocks, passed_blocks, failed_blocks,
  skipped_blocks, failure_class, failure_detail, stderr, duration_ms
) values (
  1,
  1,
  'zero-block.py',
  'error',
  0,
  0,
  0,
  0,
  'ModuleNotFoundError',
  'ModuleNotFoundError: No module named ''sage_zero_block''',
  '',
  0
), (
  2,
  1,
  '/tmp/state-crash.py',
  'error',
  0,
  0,
  1,
  0,
  'wasm_signature_mismatch',
  'doctest state: phase=run_example; file=/tmp/state-crash.py; doctest=state-crash; line=42
doctest source:
crash()

RuntimeError: function signature mismatch',
  '',
  0
), (
  3,
  1,
  '/tmp/memory-a.py',
  'error',
  0,
  0,
  1,
  0,
  'wasm_trap',
  'doctest state: phase=run_example; file=/tmp/memory-a.py; doctest=memory-a; line=11
doctest source:
GF(8, ''a'').is_field()

RuntimeError: memory access out of bounds
    at libcxx.so.std::__2::basic_ostream<char, std::__2::char_traits<char>>::sentry::sentry(std::__2::basic_ostream<char, std::__2::char_traits<char>>&) (wasm://wasm/libcxx.so-01a6b506:wasm-function[1500]:0x897b4)',
  '',
  0
), (
  4,
  1,
  '/tmp/memory-b.py',
  'error',
  0,
  0,
  1,
  0,
  'wasm_trap',
  'doctest state: phase=run_example; file=/tmp/memory-b.py; doctest=memory-b; line=22
doctest source:
PolynomialRing(GF(2), ''j'')

RuntimeError: memory access out of bounds
    at libcxx.so.std::__2::basic_ostream<char, std::__2::char_traits<char>>::sentry::sentry(std::__2::basic_ostream<char, std::__2::char_traits<char>>&) (wasm://wasm/libcxx.so-01a6b506:wasm-function[1500]:0x897b4)',
  '',
  0
), (
  5,
  1,
  '/tmp/clean.py',
  'passed',
  3,
  2,
  0,
  1,
  null,
  null,
  '',
  30
), (
  6,
  1,
  '/tmp/skipped.py',
  'passed',
  2,
  0,
  0,
  2,
  null,
  null,
  '',
  20
), (
  7,
  1,
  '/tmp/no-blocks.py',
  'passed',
  0,
  0,
  0,
  0,
  null,
  null,
  '',
  10
), (
  8,
  1,
  '/tmp/block-failure.py',
  'failed',
  4,
  2,
  1,
  1,
  null,
  null,
  '',
  40
);
insert into blocks (
  file_id, status, failure_class, actual, start_line, skip_reason, tags, source
) values (
  6,
  'skipped',
  null,
  null,
  17,
  'deferred:known bug',
  'deferred,deferred:known bug',
  '1 / 0  # known bug' || char(10)
), (
  6,
  'skipped',
  null,
  null,
  19,
  'deferred:not implemented',
  'deferred,deferred:not implemented',
  '2 / 0  # not implemented' || char(10)
), (
  8,
  'failed',
  'output_mismatch',
  'wrong',
  23,
  null,
  '',
  '3 + 3' || char(10)
);
SQL
doctest_query_failures_by_class="$(sqlite3 "$doctest_query_db" <"$src_dir/doctest-sql/failures-by-class.sql")"
if ! printf '%s\n' "$doctest_query_failures_by_class" | grep -Fxq 'ModuleNotFoundError|1'; then
  printf '%s\n' "$doctest_query_failures_by_class" >&2
  sqlite3 "$doctest_query_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: failures-by-class query did not include a zero-block file-level error."
fi
doctest_query_file_errors="$(sqlite3 "$doctest_query_db" <"$src_dir/doctest-sql/file-error-clusters.sql")"
if ! printf '%s\n' "$doctest_query_file_errors" | grep -Fq 'zero-block.py'; then
  printf '%s\n' "$doctest_query_file_errors" >&2
  sqlite3 "$doctest_query_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: file-error cluster query did not include a zero-block file-level error."
fi
doctest_memory_trap_cluster="$(printf '%s\n' "$doctest_query_file_errors" |
  grep -F 'wasm_trap|RuntimeError: memory access out of bounds|libcxx.so.std::__2::basic_ostream<char, std::__2::char_traits<char>>::sentry::sentry' ||
  true)"
if [ -z "$doctest_memory_trap_cluster" ]; then
  printf '%s\n' "$doctest_query_file_errors" >&2
  sqlite3 "$doctest_query_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: file-error cluster query did not anchor memory-trap diagnostics at RuntimeError."
fi
if ! printf '%s\n' "$doctest_memory_trap_cluster" | grep -Fq '|2|'; then
  printf '%s\n' "$doctest_query_file_errors" >&2
  sqlite3 "$doctest_query_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: file-error cluster query did not group matching memory traps."
fi
doctest_query_missing_modules="$(sqlite3 "$doctest_query_db" <"$src_dir/doctest-sql/top-missing-modules.sql")"
if ! printf '%s\n' "$doctest_query_missing_modules" | grep -Fxq 'sage_zero_block|1'; then
  printf '%s\n' "$doctest_query_missing_modules" >&2
  sqlite3 "$doctest_query_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: top-missing-modules query did not include a zero-block file-level import error."
fi
doctest_query_file_error_reruns="$(sqlite3 "$doctest_query_db" <"$src_dir/doctest-sql/file-error-reruns.sql")"
if ! printf '%s\n' "$doctest_query_file_error_reruns" | grep -Fxq 'wasm_signature_mismatch|/tmp/state-crash.py|42|sage -t --line 42 /tmp/state-crash.py'; then
  printf '%s\n' "$doctest_query_file_error_reruns" >&2
  sqlite3 "$doctest_query_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: file-error rerun query did not extract the source-line reproduction command."
fi
doctest_query_deferred_reruns="$(sqlite3 "$doctest_query_db" <"$src_dir/doctest-sql/deferred-reruns.sql")"
for expected_deferred_rerun in \
  'known-bug|/tmp/skipped.py|17|sage -t --deferred=known-bug --line 17 /tmp/skipped.py|1 / 0  # known bug' \
  'not-implemented|/tmp/skipped.py|19|sage -t --deferred=not-implemented --line 19 /tmp/skipped.py|2 / 0  # not implemented'; do
  if ! printf '%s\n' "$doctest_query_deferred_reruns" | grep -Fxq "$expected_deferred_rerun"; then
    printf '%s\n' "$doctest_query_deferred_reruns" >&2
    sqlite3 "$doctest_query_db" ".dump" >&2 || true
    record_blocker "sagelite-blocked: deferred rerun query did not emit $expected_deferred_rerun."
  fi
done
doctest_query_coverage_summary="$(sqlite3 "$doctest_query_db" <"$src_dir/doctest-sql/file-coverage-summary.sql")"
for expected_coverage_shape in \
  'file_error|4|0|0|3|0|0|0' \
  'has_failures|1|4|2|1|1|3|40' \
  'skipped_only|1|2|0|0|2|0|20' \
  'no_doctest_blocks|1|0|0|0|0|0|10' \
  'clean_runnable_coverage|1|3|2|0|1|2|30'; do
  if ! printf '%s\n' "$doctest_query_coverage_summary" | grep -Fxq "$expected_coverage_shape"; then
    printf '%s\n' "$doctest_query_coverage_summary" >&2
    sqlite3 "$doctest_query_db" ".dump" >&2 || true
    record_blocker "sagelite-blocked: file-coverage-summary query missed $expected_coverage_shape."
  fi
done
doctest_query_candidate_summary="$(sqlite3 "$doctest_query_db" <"$src_dir/doctest-sql/corpus-candidate-summary.sql")"
for expected_candidate_status in \
  'promote_candidate|1|3|2|0|1|2|30' \
  'needs_triage|1|4|2|1|1|3|40' \
  'file_error|4|0|0|3|0|0|0' \
  'skipped_only|1|2|0|0|2|0|20' \
  'no_doctest_blocks|1|0|0|0|0|0|10'; do
  if ! printf '%s\n' "$doctest_query_candidate_summary" | grep -Fxq "$expected_candidate_status"; then
    printf '%s\n' "$doctest_query_candidate_summary" >&2
    sqlite3 "$doctest_query_db" ".dump" >&2 || true
    record_blocker "sagelite-blocked: corpus-candidate-summary query missed $expected_candidate_status."
  fi
done
doctest_candidate_helper_db="$probe_dir/sagelite-doctest-candidate-helper.sqlite3"
doctest_candidate_helper_focused_db="$probe_dir/sagelite-doctest-focused-candidate-helper.sqlite3"
doctest_candidate_helper_relative_db="$probe_dir/sagelite-doctest-relative-candidate-helper.sqlite3"
doctest_candidate_helper_invalid_utf8_db="$probe_dir/sagelite-doctest-invalid-utf8-candidate-helper.sqlite3"
doctest_candidate_helper_superseding_db="$probe_dir/sagelite-doctest-superseding-candidate-helper.sqlite3"
doctest_candidate_helper_mentioned_db="$probe_dir/sagelite-doctest-mentioned-candidate-helper.sqlite3"
doctest_candidate_helper_optional_db="$probe_dir/sagelite-doctest-optional-candidate-helper.sqlite3"
doctest_candidate_helper_corpus="$probe_dir/sagelite-doctest-empty-corpus.txt"
doctest_candidate_helper_covered_corpus="$probe_dir/sagelite-doctest-covered-corpus.txt"
doctest_candidate_helper_relative_corpus="$probe_dir/sagelite-doctest-relative-corpus.txt"
doctest_source_frontier_corpus="$probe_dir/sagelite-doctest-source-frontier-corpus.txt"
doctest_source_frontier_mentioned="$probe_dir/sagelite-doctest-source-frontier-mentioned.txt"
doctest_source_frontier_all_mentioned="$probe_dir/sagelite-doctest-source-frontier-all-mentioned.txt"
doctest_candidate_helper_source_root="$probe_dir/candidate-source-root"
doctest_candidate_helper_override_source_root="$probe_dir/candidate-override-source-root"
mkdir -p "$doctest_candidate_helper_source_root/src/sage/example"
mkdir -p "$doctest_candidate_helper_override_source_root/src/sage/example"
cat >"$doctest_candidate_helper_source_root/src/sage/example/real_candidate.py" <<'PY'
r"""
    sage: 40 + 2
    42
"""
PY
touch "$doctest_candidate_helper_source_root/src/sage/example/zero_candidate.py"
touch "$doctest_candidate_helper_source_root/src/sage/example/skipped_candidate.py"
touch "$doctest_candidate_helper_source_root/src/sage/example/error_candidate.py"
touch "$doctest_candidate_helper_source_root/src/sage/example/include_diagnostic.pxi"
touch "$doctest_candidate_helper_source_root/src/sage/example/stale_harness_error.py"
touch "$doctest_candidate_helper_source_root/src/sage/example/invalid_detail.py"
touch "$doctest_candidate_helper_source_root/src/sage/example/near_miss_name_error.py"
touch "$doctest_candidate_helper_source_root/src/sage/example/near_miss_type_error.py"
cat >"$doctest_candidate_helper_source_root/src/sage/example/source_skipped_error.py" <<'PY'
# sage.doctest: needs sage.example.optional_backend
"""
"""
PY
cat >"$doctest_candidate_helper_source_root/src/sage/example/source_long_time_frontier.py" <<'PY'
# sage.doctest: long time
r"""
    sage: 6 + 6
    12
"""
PY
cat >"$doctest_candidate_helper_source_root/src/sage/example/frontier_candidate.py" <<'PY'
r"""
    sage: 1 + 1
    2
    sage: 2 + 2
    4
"""
PY
cat >"$doctest_candidate_helper_source_root/src/sage/example/covered_frontier.py" <<'PY'
r"""
    sage: 3 + 3
    6
"""
PY
cat >"$doctest_candidate_helper_source_root/src/sage/example/mentioned_frontier.py" <<'PY'
r"""
    sage: 4 + 4
    8
"""
PY
cat >"$doctest_candidate_helper_source_root/src/sage/example/mentioned_pyx_frontier.pyx" <<'PY'
r"""
    sage: 5 + 5
    10
"""
PY
cat >"$doctest_candidate_helper_source_root/src/sage/example/mentioned_rst_frontier.rst" <<'RST'
.. TESTS::

    sage: 9 + 9
    18
RST
touch "$doctest_candidate_helper_override_source_root/src/sage/example/real_candidate.py"
touch "$doctest_candidate_helper_corpus"
printf '%s\n' "src/sage/example/real_candidate.py" >"$doctest_candidate_helper_covered_corpus"
printf '%s\n' "src/sage/example/covered_frontier.py" >"$doctest_source_frontier_corpus"
{
  printf '%s\n' "previously audited src/sage/example/mentioned_frontier.py"
  printf '%s\n' "previously audited src/sage/example/mentioned_pyx_frontier.pyx"
  printf '%s\n' "previously audited src/sage/example/mentioned_rst_frontier.rst"
  printf '%s\n' "previously audited src/sage/example/source_long_time_frontier.py"
} >"$doctest_source_frontier_mentioned"
printf '%s\n' "previously audited src/sage/example/frontier_candidate.py" >"$doctest_source_frontier_all_mentioned"
sqlite3 "$doctest_candidate_helper_db" <<SQL
create table runs (
  id integer primary key,
  source_root text,
  runner_version integer
);
create table files (
  id integer primary key,
  run_id integer,
  path text,
  status text,
  total_blocks integer,
  passed_blocks integer,
  failed_blocks integer,
  skipped_blocks integer,
  failure_class text default '',
  failure_detail text default '',
  duration_ms integer
);
insert into runs (id, source_root, runner_version) values (1, '$doctest_candidate_helper_source_root', 83);
insert into files (
  run_id, path, status, total_blocks, passed_blocks, failed_blocks,
  skipped_blocks, duration_ms
) values (
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/real_candidate.py',
  'passed',
  2,
  2,
  0,
  0,
  10
), (
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/missing_candidate.py',
  'passed',
  3,
  3,
  0,
  0,
  20
), (
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/zero_candidate.py',
  'passed',
  0,
  0,
  0,
  0,
  5
), (
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/skipped_candidate.py',
  'passed',
  2,
  0,
  0,
  2,
  25
), (
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/error_candidate.py',
  'error',
  0,
  0,
  0,
  0,
  15
), (
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/stale_harness_error.py',
  'error',
  0,
  0,
  0,
  0,
  12
), (
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/include_diagnostic.pxi',
  'error',
  0,
  0,
  0,
  0,
  11
), (
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/near_miss_name_error.py',
  'failed',
  3,
  2,
  1,
  0,
  30
), (
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/near_miss_type_error.py',
  'failed',
  3,
  2,
  1,
  0,
  20
);
update files
set
  failure_class = 'ModuleNotFoundError',
  failure_detail = 'No module named sage.example.optional_backend'
where path = '$doctest_candidate_helper_source_root/src/sage/example/error_candidate.py';
update files
set
  failure_class = 'RuntimeError',
  failure_detail = 'support include fragments are not standalone doctest files'
where path = '$doctest_candidate_helper_source_root/src/sage/example/include_diagnostic.pxi';
update files
set
  failure_class = 'FileNotFoundError',
  failure_detail = 'stale probe used an obsolete source root'
where path = '$doctest_candidate_helper_source_root/src/sage/example/stale_harness_error.py';
create table blocks (
  file_id integer,
  status text,
  failure_class text,
  failure_detail text,
  tags text,
  skip_reason text
);
insert into blocks (file_id, status, failure_class, failure_detail)
select id, 'failed', 'NameError', 'missing startup namespace value'
from files
where path = '$doctest_candidate_helper_source_root/src/sage/example/near_miss_name_error.py';
insert into blocks (file_id, status, failure_class, failure_detail)
select id, 'failed', 'TypeError', 'unsupported coercion detail'
from files
where path = '$doctest_candidate_helper_source_root/src/sage/example/near_miss_type_error.py';
insert into blocks (file_id, status, tags, skip_reason)
select id, 'skipped', 'needs:sage.graphs,optional:sage.graphs', 'optional:sage.graphs'
from files
where path = '$doctest_candidate_helper_source_root/src/sage/example/skipped_candidate.py';
insert into blocks (file_id, status, tags, skip_reason)
select id, 'skipped', 'needs:sage.symbolic,optional:sage.symbolic', 'optional:sage.symbolic'
from files
where path = '$doctest_candidate_helper_source_root/src/sage/example/skipped_candidate.py';
SQL
doctest_candidate_helper_output="$("$src_dir/doctest-corpus-candidates.py" \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_output" != "src/sage/example/real_candidate.py	2	2	0	2	10" ]; then
  printf '%s\n' "$doctest_candidate_helper_output" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates did not filter missing source-root candidates."
fi
doctest_candidate_helper_paths="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_paths" != "src/sage/example/real_candidate.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_paths" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --paths-only output is not script-friendly."
fi
doctest_candidate_helper_glob_paths="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --database-glob "$probe_dir/sagelite-doctest-candidate-helper*.sqlite3" \
  --corpus "$doctest_candidate_helper_corpus")"
if [ "$doctest_candidate_helper_glob_paths" != "src/sage/example/real_candidate.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_glob_paths" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --database-glob did not scan matching databases."
fi
set +e
doctest_candidate_helper_missing_database="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --corpus "$doctest_candidate_helper_corpus" \
  "$probe_dir/no-such-candidate-database.sqlite3" \
  2>&1)"
doctest_candidate_helper_missing_database_status=$?
set -e
if [ "$doctest_candidate_helper_missing_database_status" -ne 2 ] || \
  ! printf '%s\n' "$doctest_candidate_helper_missing_database" | \
    grep -Fq -- 'database does not name a file:'; then
  printf '%s\n' "$doctest_candidate_helper_missing_database" >&2
  record_blocker "sagelite-blocked: doctest-corpus-candidates did not reject a missing explicit database cleanly."
fi
set +e
doctest_candidate_helper_missing_mentioned="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --mentioned-file "$probe_dir/no-such-mentioned-file.md" \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db" \
  2>&1)"
doctest_candidate_helper_missing_mentioned_status=$?
set -e
if [ "$doctest_candidate_helper_missing_mentioned_status" -ne 2 ] || \
  ! printf '%s\n' "$doctest_candidate_helper_missing_mentioned" | \
    grep -Fq -- '--mentioned-file does not name a file:'; then
  printf '%s\n' "$doctest_candidate_helper_missing_mentioned" >&2
  record_blocker "sagelite-blocked: doctest-corpus-candidates --mentioned-file did not reject a missing file cleanly."
fi
set +e
doctest_candidate_helper_missing_corpus="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --corpus "$probe_dir/no-such-candidate-corpus.txt" \
  "$doctest_candidate_helper_db" \
  2>&1)"
doctest_candidate_helper_missing_corpus_status=$?
set -e
if [ "$doctest_candidate_helper_missing_corpus_status" -ne 2 ] || \
  ! printf '%s\n' "$doctest_candidate_helper_missing_corpus" | \
    grep -Fq -- '--corpus does not name a file:'; then
  printf '%s\n' "$doctest_candidate_helper_missing_corpus" >&2
  record_blocker "sagelite-blocked: doctest-corpus-candidates --corpus did not reject a missing file cleanly."
fi
set +e
doctest_candidate_helper_missing_source_root="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --source-root "$probe_dir/no-such-source-root" \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db" \
  2>&1)"
doctest_candidate_helper_missing_source_root_status=$?
set -e
if [ "$doctest_candidate_helper_missing_source_root_status" -ne 2 ] || \
  ! printf '%s\n' "$doctest_candidate_helper_missing_source_root" | \
    grep -Fq -- '--source-root does not name a Sagelite source tree:'; then
  printf '%s\n' "$doctest_candidate_helper_missing_source_root" >&2
  record_blocker "sagelite-blocked: doctest-corpus-candidates --source-root did not reject a missing Sagelite source tree cleanly."
fi
touch "$doctest_candidate_helper_source_root/src/sage/example/relative_candidate.py"
printf '%s\n' "src/sage/example/relative_candidate.py" >"$doctest_candidate_helper_relative_corpus"
sqlite3 "$doctest_candidate_helper_relative_db" <<SQL
create table runs (
  id integer primary key,
  source_root text,
  runner_version integer
);
create table files (
  id integer primary key,
  run_id integer,
  path text,
  status text,
  total_blocks integer,
  passed_blocks integer,
  failed_blocks integer,
  skipped_blocks integer,
  duration_ms integer
);
insert into runs (id, source_root, runner_version) values (1, '$doctest_candidate_helper_source_root', 83);
insert into files (
  run_id, path, status, total_blocks, passed_blocks, failed_blocks,
  skipped_blocks, duration_ms
) values (
  1,
  'sage/example/relative_candidate.py',
  'passed',
  1,
  1,
  0,
  0,
  10
);
SQL
doctest_candidate_helper_relative_paths="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_relative_db")"
if [ "$doctest_candidate_helper_relative_paths" != "src/sage/example/relative_candidate.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_relative_paths" >&2
  sqlite3 "$doctest_candidate_helper_relative_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates did not normalize relative sage paths."
fi
doctest_candidate_helper_relative_covered="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --corpus "$doctest_candidate_helper_relative_corpus" \
  "$doctest_candidate_helper_relative_db")"
if [ -n "$doctest_candidate_helper_relative_covered" ]; then
  printf '%s\n' "$doctest_candidate_helper_relative_covered" >&2
  sqlite3 "$doctest_candidate_helper_relative_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates did not subtract covered relative sage paths."
fi
doctest_candidate_helper_min_runner_paths="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --min-runner-version 80 \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_min_runner_paths" != "src/sage/example/real_candidate.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_min_runner_paths" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --min-runner-version filtered out a current runner."
fi
doctest_candidate_helper_stale_runner_paths="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --min-runner-version 100 \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ -n "$doctest_candidate_helper_stale_runner_paths" ]; then
  printf '%s\n' "$doctest_candidate_helper_stale_runner_paths" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --min-runner-version reported a stale runner."
fi
doctest_candidate_helper_synthetic_metadata_paths="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --require-run-metadata \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ -n "$doctest_candidate_helper_synthetic_metadata_paths" ]; then
  printf '%s\n' "$doctest_candidate_helper_synthetic_metadata_paths" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --require-run-metadata reported a synthetic helper fixture."
fi
sqlite3 "$doctest_candidate_helper_db" <<SQL
alter table runs add column started_at text;
alter table runs add column git_commit text;
alter table runs add column command text;
alter table runs add column run_profile text;
alter table runs add column status text;
update runs
set
  started_at = '2026-07-03T00:00:00.000Z',
  git_commit = 'standalone-smoke-fixture',
  command = 'sage -t src/sage/example/real_candidate.py',
  run_profile = 'node',
  status = 'passed';
SQL
doctest_candidate_helper_modern_metadata_paths="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --require-run-metadata \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_modern_metadata_paths" != "src/sage/example/real_candidate.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_modern_metadata_paths" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --require-run-metadata did not accept modern run metadata."
fi
doctest_candidate_helper_strict_frontier_paths="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --strict-frontier \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_strict_frontier_paths" != "src/sage/example/real_candidate.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_strict_frontier_paths" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --strict-frontier did not apply the scheduled scan guards."
fi
doctest_candidate_helper_relative_strict_db="$probe_dir/sagelite-doctest-relative-strict-candidate-helper.sqlite3"
sqlite3 "$doctest_candidate_helper_relative_strict_db" <<SQL
create table runs (
  id integer primary key,
  started_at text,
  git_commit text,
  command text,
  run_profile text,
  status text,
  source_root text,
  runner_version integer
);
create table files (
  id integer primary key,
  run_id integer,
  path text,
  status text,
  total_blocks integer,
  passed_blocks integer,
  failed_blocks integer,
  skipped_blocks integer,
  duration_ms integer
);
create table blocks (
  file_id integer,
  status text
);
insert into runs (
  id, started_at, git_commit, command, run_profile, status, source_root,
  runner_version
) values (
  1,
  '2026-07-03T00:00:00.000Z',
  'standalone-smoke-fixture',
  'sage -t src/sage/example/real_candidate.py',
  'node',
  'passed',
  '$doctest_candidate_helper_source_root',
  83
);
insert into files (
  id, run_id, path, status, total_blocks, passed_blocks, failed_blocks,
  skipped_blocks, duration_ms
) values (
  1,
  1,
  'src/sage/example/real_candidate.py',
  'passed',
  1,
  1,
  0,
  0,
  10
);
insert into blocks (file_id, status) values (1, 'passed');
SQL
doctest_candidate_helper_relative_strict_paths="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --strict-frontier \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_relative_strict_db")"
if [ -n "$doctest_candidate_helper_relative_strict_paths" ]; then
  printf '%s\n' "$doctest_candidate_helper_relative_strict_paths" >&2
  sqlite3 "$doctest_candidate_helper_relative_strict_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --strict-frontier accepted a relative file row."
fi
sqlite3 "$doctest_candidate_helper_focused_db" <<SQL
create table runs (
  id integer primary key,
  started_at text,
  git_commit text,
  command text,
  run_profile text,
  status text,
  source_root text,
  runner_version integer
);
create table files (
  id integer primary key,
  run_id integer,
  path text,
  status text,
  total_blocks integer,
  passed_blocks integer,
  failed_blocks integer,
  skipped_blocks integer,
  duration_ms integer
);
create table blocks (
  file_id integer,
  status text
);
insert into runs (
  id, started_at, git_commit, command, run_profile, status, source_root,
  runner_version
) values (
  1,
  '2026-07-03T00:00:00.000Z',
  'standalone-smoke-fixture',
  'sage -t --line 10 src/sage/example/real_candidate.py',
  'node',
  'passed',
  '$doctest_candidate_helper_source_root',
  83
);
insert into files (
  id, run_id, path, status, total_blocks, passed_blocks, failed_blocks,
  skipped_blocks, duration_ms
) values (
  1,
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/real_candidate.py',
  'passed',
  1,
  1,
  0,
  0,
  10
);
insert into blocks (file_id, status) values (1, 'passed');
SQL
doctest_candidate_helper_focused_paths="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --require-run-metadata \
  --require-file-run \
  --require-block-rows \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_focused_db")"
if [ -n "$doctest_candidate_helper_focused_paths" ]; then
  printf '%s\n' "$doctest_candidate_helper_focused_paths" >&2
  sqlite3 "$doctest_candidate_helper_focused_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --require-file-run reported a focused line rerun."
fi
cat >"$doctest_candidate_helper_source_root/src/sage/example/optional_candidate.py" <<'PY'
r"""
    sage: 13 + 13
    26
    sage: 14 + 14
    28
"""
PY
sqlite3 "$doctest_candidate_helper_optional_db" <<SQL
create table runs (
  id integer primary key,
  started_at text,
  git_commit text,
  command text,
  run_profile text,
  status text,
  source_root text,
  runner_version integer
);
create table files (
  id integer primary key,
  run_id integer,
  path text,
  status text,
  total_blocks integer,
  passed_blocks integer,
  failed_blocks integer,
  skipped_blocks integer,
  duration_ms integer
);
create table blocks (
  file_id integer,
  status text
);
insert into runs (
  id, started_at, git_commit, command, run_profile, status, source_root,
  runner_version
) values (
  1,
  '2026-07-03T00:00:00.000Z',
  'standalone-smoke-fixture',
  'sage -t --optional=numpy src/sage/example/optional_candidate.py',
  'node',
  'passed',
  '$doctest_candidate_helper_source_root',
  83
);
insert into files (
  id, run_id, path, status, total_blocks, passed_blocks, failed_blocks,
  skipped_blocks, duration_ms
) values (
  1,
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/optional_candidate.py',
  'passed',
  1,
  1,
  0,
  0,
  10
);
insert into blocks (file_id, status) values (1, 'passed');
SQL
doctest_candidate_helper_optional_paths="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --strict-frontier \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_optional_db")"
if [ -n "$doctest_candidate_helper_optional_paths" ]; then
  printf '%s\n' "$doctest_candidate_helper_optional_paths" >&2
  sqlite3 "$doctest_candidate_helper_optional_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --strict-frontier reported an opt-in optional run."
fi
doctest_candidate_helper_optional_relaxed="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_optional_db")"
if [ "$doctest_candidate_helper_optional_relaxed" != "src/sage/example/optional_candidate.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_optional_relaxed" >&2
  sqlite3 "$doctest_candidate_helper_optional_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates could not report an opt-in optional run outside strict mode."
fi
rm -f "$doctest_candidate_helper_source_root/src/sage/example/optional_candidate.py"
doctest_candidate_helper_covered_default="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --corpus "$doctest_candidate_helper_covered_corpus" \
  "$doctest_candidate_helper_db")"
if [ -n "$doctest_candidate_helper_covered_default" ]; then
  printf '%s\n' "$doctest_candidate_helper_covered_default" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates did not suppress covered rows by default."
fi
doctest_candidate_helper_include_covered="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --include-covered \
  --corpus "$doctest_candidate_helper_covered_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_include_covered" != "src/sage/example/real_candidate.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_include_covered" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --include-covered did not report covered clean rows."
fi
set +e
doctest_candidate_helper_fail_on_rows="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --fail-on-rows \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db" \
  2>&1)"
doctest_candidate_helper_fail_on_rows_status=$?
set -e
if [ "$doctest_candidate_helper_fail_on_rows_status" -ne 1 ] || \
  [ "$doctest_candidate_helper_fail_on_rows" != "src/sage/example/real_candidate.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_fail_on_rows" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --fail-on-rows did not fail with remaining rows."
fi
doctest_candidate_helper_fail_on_rows_empty="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --fail-on-rows \
  --corpus "$doctest_candidate_helper_covered_corpus" \
  "$doctest_candidate_helper_db")"
if [ -n "$doctest_candidate_helper_fail_on_rows_empty" ]; then
  printf '%s\n' "$doctest_candidate_helper_fail_on_rows_empty" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --fail-on-rows reported a fully subtracted candidate scan."
fi
doctest_candidate_helper_unmatched_glob="$probe_dir/no-such-candidate-*.sqlite3"
set +e
doctest_candidate_helper_unmatched_glob_error="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --database-glob "$doctest_candidate_helper_unmatched_glob" \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db" \
  2>&1)"
doctest_candidate_helper_unmatched_glob_status=$?
set -e
if [ "$doctest_candidate_helper_unmatched_glob_status" -ne 2 ] || \
  ! printf '%s\n' "$doctest_candidate_helper_unmatched_glob_error" | \
    grep -Fq 'database glob matched no files:'; then
  printf '%s\n' "$doctest_candidate_helper_unmatched_glob_error" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates silently accepted an unmatched database glob."
fi
doctest_candidate_helper_unmatched_glob_ignored="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --database-glob "$doctest_candidate_helper_unmatched_glob" \
  --ignore-invalid \
  --quiet-invalid \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_unmatched_glob_ignored" != "src/sage/example/real_candidate.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_unmatched_glob_ignored" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --ignore-invalid did not tolerate an unmatched database glob."
fi
doctest_candidate_helper_missing_database_ignored="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --ignore-invalid \
  --quiet-invalid \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db" \
  "$probe_dir/no-such-candidate-database.sqlite3")"
if [ "$doctest_candidate_helper_missing_database_ignored" != "src/sage/example/real_candidate.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_missing_database_ignored" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --ignore-invalid did not tolerate a missing explicit database."
fi
set +e
doctest_candidate_helper_only_unmatched_glob="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --database-glob "$doctest_candidate_helper_unmatched_glob" \
  --ignore-invalid \
  --quiet-invalid \
  --corpus "$doctest_candidate_helper_corpus" \
  2>&1)"
doctest_candidate_helper_only_unmatched_glob_status=$?
set -e
if [ "$doctest_candidate_helper_only_unmatched_glob_status" -ne 2 ] || \
  ! printf '%s\n' "$doctest_candidate_helper_only_unmatched_glob" | \
    grep -Fq 'error: no valid Sagelite doctest databases were scanned'; then
  printf '%s\n' "$doctest_candidate_helper_only_unmatched_glob" >&2
  record_blocker "sagelite-blocked: doctest-corpus-candidates did not report an all-unmatched database glob scan."
fi
sqlite3 "$doctest_candidate_helper_mentioned_db" <<SQL
create table runs (
  id integer primary key,
  source_root text,
  runner_version integer
);
create table files (
  id integer primary key,
  run_id integer,
  path text,
  status text,
  total_blocks integer,
  passed_blocks integer,
  failed_blocks integer,
  skipped_blocks integer,
  duration_ms integer
);
insert into runs (id, source_root, runner_version) values (1, '$doctest_candidate_helper_source_root', 83);
insert into files (
  run_id, path, status, total_blocks, passed_blocks, failed_blocks,
  skipped_blocks, duration_ms
) values (
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/mentioned_frontier.py',
  'passed',
  1,
  1,
  0,
  0,
  9
);
SQL
doctest_candidate_helper_mentioned_default="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --mentioned-file "$doctest_source_frontier_mentioned" \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_mentioned_db")"
if [ -n "$doctest_candidate_helper_mentioned_default" ]; then
  printf '%s\n' "$doctest_candidate_helper_mentioned_default" >&2
  sqlite3 "$doctest_candidate_helper_mentioned_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates did not suppress mentioned rows."
fi
doctest_candidate_helper_include_mentioned="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --mentioned-file "$doctest_source_frontier_mentioned" \
  --include-mentioned \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_mentioned_db")"
if [ "$doctest_candidate_helper_include_mentioned" != "src/sage/example/mentioned_frontier.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_include_mentioned" >&2
  sqlite3 "$doctest_candidate_helper_mentioned_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --include-mentioned did not report mentioned rows."
fi
doctest_candidate_helper_zero_blocks="$("$src_dir/doctest-corpus-candidates.py" \
  --zero-blocks \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_zero_blocks" != "src/sage/example/zero_candidate.py	0	0	0	0	0	5	passed	" ]; then
  printf '%s\n' "$doctest_candidate_helper_zero_blocks" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --zero-blocks did not report empty clean files."
fi
doctest_candidate_helper_skipped_only_details="$("$src_dir/doctest-corpus-candidates.py" \
  --skipped-only \
  --include-skip-reasons \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_skipped_only_details" != "src/sage/example/skipped_candidate.py	2	0	0	2	0	25	passed		optional:sage.graphs, optional:sage.symbolic" ]; then
  printf '%s\n' "$doctest_candidate_helper_skipped_only_details" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --include-skip-reasons did not report skipped-only dependency metadata."
fi
doctest_candidate_helper_skipped_only_tags="$("$src_dir/doctest-corpus-candidates.py" \
  --skipped-only \
  --include-skip-tags \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_skipped_only_tags" != "src/sage/example/skipped_candidate.py	2	0	0	2	0	25	passed		needs:sage.graphs, needs:sage.symbolic, optional:sage.graphs, optional:sage.symbolic" ]; then
  printf '%s\n' "$doctest_candidate_helper_skipped_only_tags" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --include-skip-tags did not report skipped-only tag metadata."
fi
doctest_candidate_helper_skipped_only_filtered="$("$src_dir/doctest-corpus-candidates.py" \
  --skipped-only \
  --only-skip-reason sage.symbolic \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_skipped_only_filtered" != "src/sage/example/skipped_candidate.py	2	0	0	2	0	25	passed	" ]; then
  printf '%s\n' "$doctest_candidate_helper_skipped_only_filtered" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --only-skip-reason did not filter skipped-only dependency rows."
fi
doctest_candidate_helper_skipped_only_filtered_miss="$("$src_dir/doctest-corpus-candidates.py" \
  --skipped-only \
  --only-skip-reason subprocess \
  --paths-only \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ -n "$doctest_candidate_helper_skipped_only_filtered_miss" ]; then
  printf '%s\n' "$doctest_candidate_helper_skipped_only_filtered_miss" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --only-skip-reason reported unrelated skipped-only rows."
fi
doctest_candidate_helper_skipped_only_excluded_keep="$("$src_dir/doctest-corpus-candidates.py" \
  --skipped-only \
  --exclude-skip-reason subprocess \
  --paths-only \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_skipped_only_excluded_keep" != "src/sage/example/skipped_candidate.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_skipped_only_excluded_keep" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --exclude-skip-reason filtered unrelated skipped-only rows."
fi
doctest_candidate_helper_skipped_only_excluded_match="$("$src_dir/doctest-corpus-candidates.py" \
  --skipped-only \
  --exclude-skip-reason sage.graphs \
  --paths-only \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ -n "$doctest_candidate_helper_skipped_only_excluded_match" ]; then
  printf '%s\n' "$doctest_candidate_helper_skipped_only_excluded_match" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --exclude-skip-reason reported excluded skipped-only rows."
fi
doctest_candidate_helper_skipped_only_tag_filtered="$("$src_dir/doctest-corpus-candidates.py" \
  --skipped-only \
  --only-skip-tag needs:sage.symbolic \
  --paths-only \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_skipped_only_tag_filtered" != "src/sage/example/skipped_candidate.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_skipped_only_tag_filtered" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --only-skip-tag did not filter skipped-only tag rows."
fi
doctest_candidate_helper_skipped_only_tag_excluded="$("$src_dir/doctest-corpus-candidates.py" \
  --skipped-only \
  --exclude-skip-tag optional:sage.graphs \
  --paths-only \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ -n "$doctest_candidate_helper_skipped_only_tag_excluded" ]; then
  printf '%s\n' "$doctest_candidate_helper_skipped_only_tag_excluded" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --exclude-skip-tag reported excluded skipped-only rows."
fi
doctest_candidate_helper_file_errors="$("$src_dir/doctest-corpus-candidates.py" \
  --file-errors \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_file_errors" != "src/sage/example/stale_harness_error.py	0	0	0	0	0	12	error	FileNotFoundError
src/sage/example/error_candidate.py	0	0	0	0	0	15	error	ModuleNotFoundError" ]; then
  printf '%s\n' "$doctest_candidate_helper_file_errors" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --file-errors did not report file-scope failures."
fi
doctest_candidate_helper_support_file_errors="$("$src_dir/doctest-corpus-candidates.py" \
  --file-errors \
  --include-support-files \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_support_file_errors" != "src/sage/example/stale_harness_error.py	0	0	0	0	0	12	error	FileNotFoundError
src/sage/example/error_candidate.py	0	0	0	0	0	15	error	ModuleNotFoundError
src/sage/example/include_diagnostic.pxi	0	0	0	0	0	11	error	RuntimeError" ]; then
  printf '%s\n' "$doctest_candidate_helper_support_file_errors" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --include-support-files did not report support-file diagnostics."
fi
doctest_candidate_helper_file_errors_limited="$("$src_dir/doctest-corpus-candidates.py" \
  --file-errors \
  --limit 1 \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_file_errors_limited" != "src/sage/example/stale_harness_error.py	0	0	0	0	0	12	error	FileNotFoundError" ]; then
  printf '%s\n' "$doctest_candidate_helper_file_errors_limited" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --limit did not bound file-scope failures."
fi
doctest_candidate_helper_file_error_details="$("$src_dir/doctest-corpus-candidates.py" \
  --file-errors \
  --include-failure-detail \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_file_error_details" != "src/sage/example/stale_harness_error.py	0	0	0	0	0	12	error	FileNotFoundError	stale probe used an obsolete source root
src/sage/example/error_candidate.py	0	0	0	0	0	15	error	ModuleNotFoundError	No module named sage.example.optional_backend" ]; then
  printf '%s\n' "$doctest_candidate_helper_file_error_details" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --include-failure-detail did not report file-scope diagnostics."
fi
doctest_candidate_helper_file_error_details_limited="$("$src_dir/doctest-corpus-candidates.py" \
  --file-errors \
  --include-failure-detail \
  --failure-detail-limit 20 \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_file_error_details_limited" != "src/sage/example/stale_harness_error.py	0	0	0	0	0	12	error	FileNotFoundError	stale probe used...
src/sage/example/error_candidate.py	0	0	0	0	0	15	error	ModuleNotFoundError	No module named s..." ]; then
  printf '%s\n' "$doctest_candidate_helper_file_error_details_limited" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --failure-detail-limit did not bound file-scope diagnostics."
fi
sqlite3 "$doctest_candidate_helper_invalid_utf8_db" <<SQL
create table runs (
  id integer primary key,
  source_root text,
  runner_version integer
);
create table files (
  id integer primary key,
  run_id integer,
  path text,
  status text,
  total_blocks integer,
  passed_blocks integer,
  failed_blocks integer,
  skipped_blocks integer,
  failure_class text default '',
  failure_detail text default '',
  duration_ms integer
);
insert into runs (id, source_root, runner_version) values (1, '$doctest_candidate_helper_source_root', 83);
insert into files (
  run_id, path, status, total_blocks, passed_blocks, failed_blocks,
  skipped_blocks, failure_class, failure_detail, duration_ms
) values (
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/invalid_detail.py',
  'error',
  0,
  0,
  0,
  0,
  'Error',
  cast(X'696e76616c6964ff74657874' as text),
  9
);
SQL
doctest_candidate_helper_invalid_utf8_detail="$("$src_dir/doctest-corpus-candidates.py" \
  --file-errors \
  --include-failure-detail \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_invalid_utf8_db")"
case "$doctest_candidate_helper_invalid_utf8_detail" in
  "src/sage/example/invalid_detail.py	0	0	0	0	0	9	error	Error	invalid"*text)
    ;;
  *)
    printf '%s\n' "$doctest_candidate_helper_invalid_utf8_detail" >&2
    sqlite3 "$doctest_candidate_helper_invalid_utf8_db" ".dump" >&2 || true
    record_blocker "sagelite-blocked: doctest-corpus-candidates --include-failure-detail did not tolerate invalid UTF-8 diagnostics."
    ;;
esac
doctest_candidate_helper_file_errors_no_file_not_found="$("$src_dir/doctest-corpus-candidates.py" \
  --file-errors \
  --exclude-file-failure-class FileNotFoundError \
  --paths-only \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_file_errors_no_file_not_found" != "src/sage/example/error_candidate.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_file_errors_no_file_not_found" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --exclude-file-failure-class did not filter file errors."
fi
doctest_candidate_helper_file_errors_only_module_not_found="$("$src_dir/doctest-corpus-candidates.py" \
  --file-errors \
  --only-file-failure-class ModuleNotFoundError \
  --paths-only \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_file_errors_only_module_not_found" != "src/sage/example/error_candidate.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_file_errors_only_module_not_found" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --only-file-failure-class did not filter file errors."
fi
doctest_candidate_helper_file_errors_no_optional_detail="$("$src_dir/doctest-corpus-candidates.py" \
  --file-errors \
  --exclude-file-failure-detail optional_backend \
  --paths-only \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_file_errors_no_optional_detail" != "src/sage/example/stale_harness_error.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_file_errors_no_optional_detail" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --exclude-file-failure-detail did not filter file errors."
fi
doctest_candidate_helper_file_errors_only_obsolete_detail="$("$src_dir/doctest-corpus-candidates.py" \
  --file-errors \
  --only-file-failure-detail obsolete \
  --paths-only \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_file_errors_only_obsolete_detail" != "src/sage/example/stale_harness_error.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_file_errors_only_obsolete_detail" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --only-file-failure-detail did not filter file errors."
fi
doctest_candidate_helper_near_misses_no_name_error="$("$src_dir/doctest-corpus-candidates.py" \
  --near-misses \
  --exclude-block-failure-class NameError \
  --paths-only \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_near_misses_no_name_error" != "src/sage/example/near_miss_type_error.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_near_misses_no_name_error" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --exclude-block-failure-class did not filter near misses."
fi
doctest_candidate_helper_near_misses_only_type_error="$("$src_dir/doctest-corpus-candidates.py" \
  --near-misses \
  --only-block-failure-class TypeError \
  --paths-only \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_near_misses_only_type_error" != "src/sage/example/near_miss_type_error.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_near_misses_only_type_error" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --only-block-failure-class did not filter near misses."
fi
doctest_candidate_helper_near_misses_only_timeout="$("$src_dir/doctest-corpus-candidates.py" \
  --near-misses \
  --only-block-failure-class timeout \
  --paths-only \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ -n "$doctest_candidate_helper_near_misses_only_timeout" ]; then
  printf '%s\n' "$doctest_candidate_helper_near_misses_only_timeout" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --only-block-failure-class reported unrelated near misses."
fi
doctest_candidate_helper_near_misses_limited="$("$src_dir/doctest-corpus-candidates.py" \
  --near-misses \
  --limit 1 \
  --paths-only \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_near_misses_limited" != "src/sage/example/near_miss_type_error.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_near_misses_limited" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --limit did not bound near-miss rows."
fi
doctest_candidate_helper_near_misses_no_startup_detail="$("$src_dir/doctest-corpus-candidates.py" \
  --near-misses \
  --exclude-block-failure-detail startup \
  --paths-only \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_near_misses_no_startup_detail" != "src/sage/example/near_miss_type_error.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_near_misses_no_startup_detail" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --exclude-block-failure-detail did not filter near misses."
fi
doctest_candidate_helper_near_misses_only_coercion_detail="$("$src_dir/doctest-corpus-candidates.py" \
  --near-misses \
  --only-block-failure-detail coercion \
  --paths-only \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_near_misses_only_coercion_detail" != "src/sage/example/near_miss_type_error.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_near_misses_only_coercion_detail" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --only-block-failure-detail did not filter near misses."
fi
doctest_candidate_helper_near_misses_with_class="$("$src_dir/doctest-corpus-candidates.py" \
  --near-misses \
  --exclude-block-failure-class NameError \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_near_misses_with_class" != "src/sage/example/near_miss_type_error.py	3	2	1	0	3	20	failed	TypeError" ]; then
  printf '%s\n' "$doctest_candidate_helper_near_misses_with_class" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --near-misses did not report block failure classes."
fi
sqlite3 "$doctest_candidate_helper_superseding_db" <<SQL
create table runs (
  id integer primary key,
  started_at text,
  git_commit text,
  command text,
  run_profile text,
  status text,
  source_root text,
  runner_version integer
);
create table files (
  id integer primary key,
  run_id integer,
  path text,
  status text,
  total_blocks integer,
  passed_blocks integer,
  failed_blocks integer,
  skipped_blocks integer,
  duration_ms integer
);
create table blocks (
  file_id integer,
  status text,
  tags text,
  skip_reason text
);
insert into runs (
  id, started_at, git_commit, command, run_profile, status, source_root,
  runner_version
) values (
  1,
  '2026-07-03T00:00:00.000Z',
  'standalone-smoke-fixture',
  'sage -t src/sage/example/near_miss_name_error.py',
  'node',
  'passed',
  '$doctest_candidate_helper_source_root',
  83
);
insert into files (
  id, run_id, path, status, total_blocks, passed_blocks, failed_blocks,
  skipped_blocks, duration_ms
) values (
  1,
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/near_miss_name_error.py',
  'passed',
  1,
  0,
  0,
  1,
  8
), (
  2,
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/error_candidate.py',
  'passed',
  2,
  2,
  0,
  0,
  18
), (
  3,
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/stale_harness_error.py',
  'failed',
  3,
  2,
  1,
  0,
  20
);
insert into blocks (file_id, status, tags, skip_reason)
values (1, 'skipped', 'needs:sage.example.optional_backend', 'optional:sage.example.optional_backend');
SQL
doctest_candidate_helper_superseded_near_misses="$("$src_dir/doctest-corpus-candidates.py" \
  --near-misses \
  --suppress-superseded-failures \
  --paths-only \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db" \
  "$doctest_candidate_helper_superseding_db")"
if [ "$doctest_candidate_helper_superseded_near_misses" != "src/sage/example/near_miss_type_error.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_superseded_near_misses" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  sqlite3 "$doctest_candidate_helper_superseding_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates did not suppress superseded near misses."
fi
doctest_candidate_helper_superseded_file_errors="$("$src_dir/doctest-corpus-candidates.py" \
  --file-errors \
  --suppress-superseded-failures \
  --paths-only \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db" \
  "$doctest_candidate_helper_superseding_db")"
if [ "$doctest_candidate_helper_superseded_file_errors" != "src/sage/example/stale_harness_error.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_superseded_file_errors" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  sqlite3 "$doctest_candidate_helper_superseding_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates did not suppress superseded file errors with newer passing block rows."
fi
doctest_candidate_helper_newer_file_errors="$("$src_dir/doctest-corpus-candidates.py" \
  --file-errors \
  --suppress-superseded-failures \
  --paths-only \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_superseding_db" \
  "$doctest_candidate_helper_db")"
if [ "$doctest_candidate_helper_newer_file_errors" != "src/sage/example/stale_harness_error.py
src/sage/example/error_candidate.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_newer_file_errors" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  sqlite3 "$doctest_candidate_helper_superseding_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates suppressed newer file errors with older passing block rows."
fi
doctest_candidate_helper_source_skip_db="$probe_dir/sagelite-doctest-source-skip-helper.sqlite3"
sqlite3 "$doctest_candidate_helper_source_skip_db" <<SQL
create table runs (
  id integer primary key,
  started_at text,
  git_commit text,
  command text,
  run_profile text,
  status text,
  source_root text,
  runner_version integer
);
create table files (
  id integer primary key,
  run_id integer,
  path text,
  status text,
  total_blocks integer,
  passed_blocks integer,
  failed_blocks integer,
  skipped_blocks integer,
  failure_class text default '',
  duration_ms integer
);
insert into runs (
  id, started_at, git_commit, command, run_profile, status, source_root,
  runner_version
) values (
  1,
  '2026-07-03T00:00:00.000Z',
  'standalone-smoke-fixture',
  'sage -t src/sage/example/source_skipped_error.py',
  'node',
  'failed',
  '$doctest_candidate_helper_source_root',
  83
);
insert into files (
  id, run_id, path, status, total_blocks, passed_blocks, failed_blocks,
  skipped_blocks, failure_class, duration_ms
) values (
  1,
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/source_skipped_error.py',
  'error',
  0,
  0,
  1,
  0,
  'ModuleNotFoundError',
  13
);
SQL
doctest_candidate_helper_source_skip_errors="$("$src_dir/doctest-corpus-candidates.py" \
  --file-errors \
  --suppress-superseded-failures \
  --paths-only \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_source_skip_db")"
if [ -n "$doctest_candidate_helper_source_skip_errors" ]; then
  printf '%s\n' "$doctest_candidate_helper_source_skip_errors" >&2
  sqlite3 "$doctest_candidate_helper_source_skip_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates did not suppress source-skipped file errors."
fi
doctest_candidate_helper_source_skip_skipped_db="$probe_dir/sagelite-doctest-source-skip-skipped-helper.sqlite3"
sqlite3 "$doctest_candidate_helper_source_skip_skipped_db" <<SQL
create table runs (
  id integer primary key,
  source_root text,
  runner_version integer
);
create table files (
  id integer primary key,
  run_id integer,
  path text,
  status text,
  total_blocks integer,
  passed_blocks integer,
  failed_blocks integer,
  skipped_blocks integer,
  duration_ms integer
);
insert into runs (id, source_root, runner_version) values (1, '$doctest_candidate_helper_source_root', 83);
insert into files (
  id, run_id, path, status, total_blocks, passed_blocks, failed_blocks,
  skipped_blocks, duration_ms
) values (
  1,
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/source_skipped_error.py',
  'passed',
  1,
  0,
  0,
  1,
  7
), (
  2,
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/source_long_time_frontier.py',
  'passed',
  1,
  0,
  0,
  1,
  7
);
SQL
doctest_candidate_helper_source_skip_skipped_default="$("$src_dir/doctest-corpus-candidates.py" \
  --skipped-only \
  --paths-only \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_source_skip_skipped_db")"
if [ "$doctest_candidate_helper_source_skip_skipped_default" != "src/sage/example/source_long_time_frontier.py
src/sage/example/source_skipped_error.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_source_skip_skipped_default" >&2
  sqlite3 "$doctest_candidate_helper_source_skip_skipped_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates did not report source-skipped rows by default."
fi
doctest_candidate_helper_source_skip_skipped_excluded="$("$src_dir/doctest-corpus-candidates.py" \
  --skipped-only \
  --exclude-file-skip-directives \
  --paths-only \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_source_skip_skipped_db")"
if [ -n "$doctest_candidate_helper_source_skip_skipped_excluded" ]; then
  printf '%s\n' "$doctest_candidate_helper_source_skip_skipped_excluded" >&2
  sqlite3 "$doctest_candidate_helper_source_skip_skipped_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --exclude-file-skip-directives did not suppress source-skipped rows."
fi
doctest_candidate_helper_near_misses_override_root="$("$src_dir/doctest-corpus-candidates.py" \
  --near-misses \
  --exclude-block-failure-class NameError \
  --paths-only \
  --source-root "$doctest_candidate_helper_override_source_root" \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db")"
if [ -n "$doctest_candidate_helper_near_misses_override_root" ]; then
  printf '%s\n' "$doctest_candidate_helper_near_misses_override_root" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates --source-root did not suppress fixture-only near misses."
fi
doctest_candidate_helper_legacy_db="$probe_dir/sagelite-doctest-legacy-candidate-helper.sqlite3"
touch "$doctest_candidate_helper_source_root/src/sage/example/near_miss_candidate.py"
sqlite3 "$doctest_candidate_helper_legacy_db" <<SQL
create table runs (
  id integer primary key,
  source_root text
);
create table files (
  run_id integer,
  path text,
  status text,
  total_blocks integer,
  passed_blocks integer,
  failed_blocks integer,
  skipped_blocks integer,
  duration_ms integer
);
insert into runs (id, source_root) values (1, '$doctest_candidate_helper_source_root');
insert into files (
  run_id, path, status, total_blocks, passed_blocks, failed_blocks,
  skipped_blocks, duration_ms
) values (
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/real_candidate.py',
  'passed',
  2,
  2,
  0,
  0,
  10
), (
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/zero_candidate.py',
  'passed',
  0,
  0,
  0,
  0,
  5
), (
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/near_miss_candidate.py',
  'failed',
  3,
  2,
  1,
  0,
  20
), (
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/error_candidate.py',
  'error',
  0,
  0,
  0,
  0,
  15
);
SQL
doctest_candidate_helper_legacy_paths="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_legacy_db")"
if [ "$doctest_candidate_helper_legacy_paths" != "src/sage/example/real_candidate.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_legacy_paths" >&2
  sqlite3 "$doctest_candidate_helper_legacy_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates did not tolerate legacy files tables."
fi
for legacy_mode in "--near-misses" "--zero-blocks" "--file-errors"; do
  doctest_candidate_helper_legacy_mode_paths="$("$src_dir/doctest-corpus-candidates.py" \
    $legacy_mode \
    --paths-only \
    --corpus "$doctest_candidate_helper_corpus" \
    "$doctest_candidate_helper_legacy_db")"
  case "$legacy_mode:$doctest_candidate_helper_legacy_mode_paths" in
    "--near-misses:src/sage/example/near_miss_candidate.py"|"--zero-blocks:src/sage/example/zero_candidate.py"|"--file-errors:src/sage/example/error_candidate.py") ;;
    *)
      printf '%s\n' "$doctest_candidate_helper_legacy_mode_paths" >&2
      sqlite3 "$doctest_candidate_helper_legacy_db" ".dump" >&2 || true
      record_blocker "sagelite-blocked: doctest-corpus-candidates $legacy_mode did not tolerate legacy files tables."
      ;;
  esac
done
doctest_candidate_helper_legacy_no_root_db="$probe_dir/sagelite-doctest-legacy-no-source-root.sqlite3"
sqlite3 "$doctest_candidate_helper_legacy_no_root_db" <<SQL
create table runs (
  id integer primary key
);
create table files (
  run_id integer,
  path text,
  status text,
  total_blocks integer,
  passed_blocks integer,
  failed_blocks integer,
  skipped_blocks integer,
  duration_ms integer
);
insert into runs (id) values (1);
insert into files (
  run_id, path, status, total_blocks, passed_blocks, failed_blocks,
  skipped_blocks, duration_ms
) values (
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/real_candidate.py',
  'passed',
  2,
  2,
  0,
  0,
  10
);
SQL
doctest_candidate_helper_legacy_no_root_paths="$("$src_dir/doctest-corpus-candidates.py" \
  --paths-only \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_legacy_no_root_db")"
if [ "$doctest_candidate_helper_legacy_no_root_paths" != "src/sage/example/real_candidate.py" ]; then
  printf '%s\n' "$doctest_candidate_helper_legacy_no_root_paths" >&2
  sqlite3 "$doctest_candidate_helper_legacy_no_root_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates did not tolerate legacy runs tables without source_root."
fi
doctest_candidate_helper_legacy_no_root_strict_paths="$("$src_dir/doctest-corpus-candidates.py" \
  --strict-frontier \
  --paths-only \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_legacy_no_root_db")"
if [ -n "$doctest_candidate_helper_legacy_no_root_strict_paths" ]; then
  printf '%s\n' "$doctest_candidate_helper_legacy_no_root_strict_paths" >&2
  sqlite3 "$doctest_candidate_helper_legacy_no_root_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-corpus-candidates strict scans did not require recorded source_root metadata."
fi
doctest_candidate_helper_empty_db="$probe_dir/sagelite-doctest-empty-helper.sqlite3"
touch "$doctest_candidate_helper_empty_db"
doctest_candidate_helper_quiet_stderr="$("$src_dir/doctest-corpus-candidates.py" \
  --ignore-invalid \
  --quiet-invalid \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db" \
  "$doctest_candidate_helper_empty_db" \
  2>&1 >/dev/null)"
if [ -n "$doctest_candidate_helper_quiet_stderr" ]; then
  printf '%s\n' "$doctest_candidate_helper_quiet_stderr" >&2
  record_blocker "sagelite-blocked: doctest-corpus-candidates --quiet-invalid emitted skipped-database noise."
fi
set +e
doctest_candidate_helper_all_invalid="$("$src_dir/doctest-corpus-candidates.py" \
  --ignore-invalid \
  --quiet-invalid \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_empty_db" \
  2>&1 >/dev/null)"
doctest_candidate_helper_all_invalid_status=$?
set -e
if [ "$doctest_candidate_helper_all_invalid_status" -eq 0 ] || \
  ! printf '%s\n' "$doctest_candidate_helper_all_invalid" | grep -Fq -- "no valid Sagelite doctest databases were scanned"; then
  printf '%s\n' "$doctest_candidate_helper_all_invalid" >&2
  record_blocker "sagelite-blocked: doctest-corpus-candidates all-invalid database guard did not fire."
fi
doctest_source_frontier_quiet_stderr="$("$src_dir/doctest-source-frontier.py" \
  --paths-only \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_source_frontier_corpus" \
  --mentioned-file "$doctest_source_frontier_mentioned" \
  --subtract-database "$doctest_candidate_helper_db" \
  --subtract-database "$doctest_candidate_helper_empty_db" \
  --ignore-invalid-databases \
  --quiet-invalid-databases \
  2>&1 >/dev/null)"
if [ -n "$doctest_source_frontier_quiet_stderr" ]; then
  printf '%s\n' "$doctest_source_frontier_quiet_stderr" >&2
  record_blocker "sagelite-blocked: doctest-source-frontier --quiet-invalid-databases emitted skipped-database noise."
fi
doctest_source_frontier_paths="$("$src_dir/doctest-source-frontier.py" \
  --paths-only \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_source_frontier_corpus" \
  --mentioned-file "$doctest_source_frontier_mentioned" \
  --subtract-database "$doctest_candidate_helper_db" \
  --subtract-database "$doctest_candidate_helper_empty_db" \
  --ignore-invalid-databases \
  --quiet-invalid-databases)"
if [ "$doctest_source_frontier_paths" != "src/sage/example/frontier_candidate.py" ]; then
  printf '%s\n' "$doctest_source_frontier_paths" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-source-frontier did not subtract corpus, mentioned, database, and invalid inputs."
fi
doctest_source_frontier_support_paths="$("$src_dir/doctest-source-frontier.py" \
  --paths-only \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_source_frontier_corpus" \
  --mentioned-file "$doctest_source_frontier_mentioned" \
  --subtract-database "$doctest_candidate_helper_db" \
  --extension .py \
  --extension .pyx \
  --extension .rst)"
if [ "$doctest_source_frontier_support_paths" != "src/sage/example/frontier_candidate.py" ]; then
  printf '%s\n' "$doctest_source_frontier_support_paths" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-source-frontier did not subtract mentioned support-extension inputs."
fi
doctest_source_frontier_file_skip_paths="$("$src_dir/doctest-source-frontier.py" \
  --paths-only \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_source_frontier_corpus" \
  --mentioned-file "$doctest_source_frontier_mentioned" \
  --include-mentioned \
  --subtract-database "$doctest_candidate_helper_db" \
  --exclude-file-skip-directives \
  --min-prompts 1 \
  --max-prompts 1)"
if [ "$doctest_source_frontier_file_skip_paths" != "src/sage/example/mentioned_frontier.py
src/sage/example/mentioned_pyx_frontier.pyx" ]; then
  printf '%s\n' "$doctest_source_frontier_file_skip_paths" >&2
  record_blocker "sagelite-blocked: doctest-source-frontier did not filter file-level long-time directives."
fi
set +e
doctest_source_frontier_missing_mentioned="$("$src_dir/doctest-source-frontier.py" \
  --paths-only \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_source_frontier_corpus" \
  --mentioned-file "$probe_dir/no-such-mentioned-file.md" \
  --subtract-database "$doctest_candidate_helper_db" \
  2>&1)"
doctest_source_frontier_missing_mentioned_status=$?
set -e
if [ "$doctest_source_frontier_missing_mentioned_status" -ne 2 ] || \
  ! printf '%s\n' "$doctest_source_frontier_missing_mentioned" | \
    grep -Fq -- '--mentioned-file does not name a file:'; then
  printf '%s\n' "$doctest_source_frontier_missing_mentioned" >&2
  record_blocker "sagelite-blocked: doctest-source-frontier --mentioned-file did not reject a missing file cleanly."
fi
set +e
doctest_source_frontier_missing_corpus="$("$src_dir/doctest-source-frontier.py" \
  --paths-only \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$probe_dir/no-such-source-frontier-corpus.txt" \
  --subtract-database "$doctest_candidate_helper_db" \
  2>&1)"
doctest_source_frontier_missing_corpus_status=$?
set -e
if [ "$doctest_source_frontier_missing_corpus_status" -ne 2 ] || \
  ! printf '%s\n' "$doctest_source_frontier_missing_corpus" | \
    grep -Fq -- '--corpus does not name a file:'; then
  printf '%s\n' "$doctest_source_frontier_missing_corpus" >&2
  record_blocker "sagelite-blocked: doctest-source-frontier --corpus did not reject a missing file cleanly."
fi
set +e
doctest_source_frontier_missing_source_root="$("$src_dir/doctest-source-frontier.py" \
  --paths-only \
  --source-root "$probe_dir/no-such-source-root" \
  --corpus "$doctest_source_frontier_corpus" \
  --subtract-database "$doctest_candidate_helper_db" \
  2>&1)"
doctest_source_frontier_missing_source_root_status=$?
set -e
if [ "$doctest_source_frontier_missing_source_root_status" -ne 2 ] || \
  ! printf '%s\n' "$doctest_source_frontier_missing_source_root" | \
    grep -Fq -- '--source-root does not name a Sagelite source tree:'; then
  printf '%s\n' "$doctest_source_frontier_missing_source_root" >&2
  record_blocker "sagelite-blocked: doctest-source-frontier --source-root did not reject a missing Sagelite source tree cleanly."
fi
set +e
doctest_source_frontier_missing_database="$("$src_dir/doctest-source-frontier.py" \
  --paths-only \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_source_frontier_corpus" \
  --subtract-database "$probe_dir/no-such-source-frontier-database.sqlite3" \
  2>&1)"
doctest_source_frontier_missing_database_status=$?
set -e
if [ "$doctest_source_frontier_missing_database_status" -ne 2 ] || \
  ! printf '%s\n' "$doctest_source_frontier_missing_database" | \
    grep -Fq -- '--subtract-database does not name a file:'; then
  printf '%s\n' "$doctest_source_frontier_missing_database" >&2
  record_blocker "sagelite-blocked: doctest-source-frontier did not reject a missing explicit database cleanly."
fi
doctest_source_frontier_required_paths="$("$src_dir/doctest-source-frontier.py" \
  --paths-only \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_source_frontier_corpus" \
  --mentioned-file "$doctest_source_frontier_mentioned" \
  --subtract-database-glob "$probe_dir/sagelite-doctest-candidate-helper.sqlite3" \
  --require-subtraction-database)"
if [ "$doctest_source_frontier_required_paths" != "src/sage/example/frontier_candidate.py" ]; then
  printf '%s\n' "$doctest_source_frontier_required_paths" >&2
  sqlite3 "$doctest_candidate_helper_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-source-frontier required database subtraction rejected a valid glob."
fi
set +e
doctest_source_frontier_fail_on_rows="$("$src_dir/doctest-source-frontier.py" \
  --paths-only \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_source_frontier_corpus" \
  --mentioned-file "$doctest_source_frontier_mentioned" \
  --subtract-database-glob "$probe_dir/sagelite-doctest-candidate-helper.sqlite3" \
  --require-subtraction-database \
  --fail-on-rows \
  2>&1)"
doctest_source_frontier_fail_on_rows_status=$?
set -e
if [ "$doctest_source_frontier_fail_on_rows_status" -ne 1 ] || \
  [ "$doctest_source_frontier_fail_on_rows" != "src/sage/example/frontier_candidate.py" ]; then
  printf '%s\n' "$doctest_source_frontier_fail_on_rows" >&2
  record_blocker "sagelite-blocked: doctest-source-frontier --fail-on-rows did not fail with remaining rows."
fi
doctest_source_frontier_fail_on_rows_empty="$("$src_dir/doctest-source-frontier.py" \
  --paths-only \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_source_frontier_corpus" \
  --mentioned-file "$doctest_source_frontier_mentioned" \
  --mentioned-file "$doctest_source_frontier_all_mentioned" \
  --subtract-database-glob "$probe_dir/sagelite-doctest-candidate-helper.sqlite3" \
  --require-subtraction-database \
  --fail-on-rows)"
if [ -n "$doctest_source_frontier_fail_on_rows_empty" ]; then
  printf '%s\n' "$doctest_source_frontier_fail_on_rows_empty" >&2
  record_blocker "sagelite-blocked: doctest-source-frontier --fail-on-rows reported a fully subtracted frontier."
fi
set +e
doctest_source_frontier_all_invalid="$("$src_dir/doctest-source-frontier.py" \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_source_frontier_corpus" \
  --subtract-database "$doctest_candidate_helper_empty_db" \
  --ignore-invalid-databases \
  --quiet-invalid-databases \
  2>&1 >/dev/null)"
doctest_source_frontier_all_invalid_status=$?
set -e
if [ "$doctest_source_frontier_all_invalid_status" -eq 0 ] || \
  ! printf '%s\n' "$doctest_source_frontier_all_invalid" | grep -Fq -- "no valid Sagelite doctest databases were scanned"; then
  printf '%s\n' "$doctest_source_frontier_all_invalid" >&2
  record_blocker "sagelite-blocked: doctest-source-frontier all-invalid database guard did not fire."
fi
doctest_source_frontier_unmatched_glob="$probe_dir/no-such-source-frontier-*.sqlite3"
set +e
doctest_source_frontier_unmatched_glob_error="$("$src_dir/doctest-source-frontier.py" \
  --paths-only \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_source_frontier_corpus" \
  --subtract-database-glob "$doctest_source_frontier_unmatched_glob" \
  2>&1)"
doctest_source_frontier_unmatched_glob_status=$?
set -e
if [ "$doctest_source_frontier_unmatched_glob_status" -ne 2 ] || \
  ! printf '%s\n' "$doctest_source_frontier_unmatched_glob_error" | \
    grep -Fq 'subtraction database glob matched no files:'; then
  printf '%s\n' "$doctest_source_frontier_unmatched_glob_error" >&2
  record_blocker "sagelite-blocked: doctest-source-frontier silently accepted an unmatched database glob."
fi
doctest_source_frontier_unmatched_glob_ignored="$("$src_dir/doctest-source-frontier.py" \
  --paths-only \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_source_frontier_corpus" \
  --mentioned-file "$doctest_source_frontier_mentioned" \
  --subtract-database "$doctest_candidate_helper_db" \
  --subtract-database-glob "$doctest_source_frontier_unmatched_glob" \
  --ignore-invalid-databases \
  --quiet-invalid-databases \
  --min-runnable-prompts 1)"
if [ "$doctest_source_frontier_unmatched_glob_ignored" != "src/sage/example/frontier_candidate.py" ]; then
  printf '%s\n' "$doctest_source_frontier_unmatched_glob_ignored" >&2
  record_blocker "sagelite-blocked: doctest-source-frontier --ignore-invalid-databases did not tolerate an unmatched database glob."
fi
doctest_source_frontier_missing_database_ignored="$("$src_dir/doctest-source-frontier.py" \
  --paths-only \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_source_frontier_corpus" \
  --mentioned-file "$doctest_source_frontier_mentioned" \
  --subtract-database "$doctest_candidate_helper_db" \
  --subtract-database "$probe_dir/no-such-source-frontier-database.sqlite3" \
  --ignore-invalid-databases \
  --quiet-invalid-databases \
  --min-runnable-prompts 1)"
if [ "$doctest_source_frontier_missing_database_ignored" != "src/sage/example/frontier_candidate.py" ]; then
  printf '%s\n' "$doctest_source_frontier_missing_database_ignored" >&2
  record_blocker "sagelite-blocked: doctest-source-frontier --ignore-invalid-databases did not tolerate a missing explicit database."
fi
set +e
doctest_source_frontier_only_unmatched_glob="$("$src_dir/doctest-source-frontier.py" \
  --paths-only \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_source_frontier_corpus" \
  --subtract-database-glob "$doctest_source_frontier_unmatched_glob" \
  --ignore-invalid-databases \
  --quiet-invalid-databases \
  2>&1)"
doctest_source_frontier_only_unmatched_glob_status=$?
set -e
if [ "$doctest_source_frontier_only_unmatched_glob_status" -ne 2 ] || \
  ! printf '%s\n' "$doctest_source_frontier_only_unmatched_glob" | \
    grep -Fq 'error: no valid Sagelite doctest databases were scanned'; then
  printf '%s\n' "$doctest_source_frontier_only_unmatched_glob" >&2
  record_blocker "sagelite-blocked: doctest-source-frontier did not report an all-unmatched database glob scan."
fi
set +e
doctest_source_frontier_empty_glob="$("$src_dir/doctest-source-frontier.py" \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_source_frontier_corpus" \
  --subtract-database-glob "$probe_dir/does-not-exist/*.sqlite3" \
  --require-subtraction-database \
  2>&1 >/dev/null)"
doctest_source_frontier_empty_glob_status=$?
set -e
if [ "$doctest_source_frontier_empty_glob_status" -eq 0 ] || \
  ! printf '%s\n' "$doctest_source_frontier_empty_glob" | grep -Fq -- "subtraction database glob matched no files:"; then
  printf '%s\n' "$doctest_source_frontier_empty_glob" >&2
  record_blocker "sagelite-blocked: doctest-source-frontier empty required database glob guard did not fire."
fi
cat >"$doctest_candidate_helper_source_root/src/sage/example/module_skipped_frontier.py" <<'PY'
# sage.doctest: needs sage.groups
r"""
    sage: 6 + 6
    12
"""
PY
cat >"$doctest_candidate_helper_source_root/src/sage/example/inline_skipped_frontier.py" <<'PY'
r"""
    sage: 7 + 7  # needs sage.groups
    14
"""
PY
cat >"$doctest_candidate_helper_source_root/src/sage/example/directive_skipped_frontier.py" <<'PY'
r"""
    sage: # needs sage.groups
    sage: 8 + 8
    16
"""
PY
doctest_source_frontier_runnable_paths="$("$src_dir/doctest-source-frontier.py" \
  --paths-only \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_source_frontier_corpus" \
  --mentioned-file "$doctest_source_frontier_mentioned" \
  --subtract-database-glob "$probe_dir/sagelite-doctest-candidate-helper.sqlite3" \
  --min-runnable-prompts 1)"
if [ "$doctest_source_frontier_runnable_paths" != "src/sage/example/frontier_candidate.py" ]; then
  printf '%s\n' "$doctest_source_frontier_runnable_paths" >&2
  record_blocker "sagelite-blocked: doctest-source-frontier --min-runnable-prompts did not filter skipped-only prompt files."
fi
doctest_source_frontier_runnable_counts="$("$src_dir/doctest-source-frontier.py" \
  --include-header \
  --include-runnable-prompts \
  --limit 2 \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_source_frontier_corpus" \
  --mentioned-file "$doctest_source_frontier_mentioned" \
  --subtract-database-glob "$probe_dir/sagelite-doctest-candidate-helper.sqlite3")"
if [ "$doctest_source_frontier_runnable_counts" != "path	prompt_count	runnable_prompt_count
src/sage/example/directive_skipped_frontier.py	2	0
src/sage/example/frontier_candidate.py	2	2" ]; then
  printf '%s\n' "$doctest_source_frontier_runnable_counts" >&2
  record_blocker "sagelite-blocked: doctest-source-frontier --include-runnable-prompts did not report runnable counts."
fi
doctest_source_frontier_focused_db="$probe_dir/sagelite-doctest-source-frontier-focused.sqlite3"
doctest_source_frontier_foreign_db="$probe_dir/sagelite-doctest-source-frontier-foreign.sqlite3"
doctest_source_frontier_stale_db="$probe_dir/sagelite-doctest-source-frontier-stale.sqlite3"
doctest_source_frontier_file_error_db="$probe_dir/sagelite-doctest-source-frontier-file-error.sqlite3"
doctest_source_frontier_relative_db="$probe_dir/sagelite-doctest-source-frontier-relative.sqlite3"
cat >"$doctest_candidate_helper_source_root/src/sage/example/strict_database_frontier.py" <<'PY'
r"""
    sage: 9 + 9
    18
    sage: 10 + 10
    20
"""
PY
cat >"$doctest_candidate_helper_source_root/src/sage/example/strict_file_error_frontier.py" <<'PY'
r"""
    sage: 11 + 11
    22
    sage: 12 + 12
    24
"""
PY
cat >"$doctest_candidate_helper_source_root/src/sage/example/optional_candidate.py" <<'PY'
r"""
    sage: 13 + 13
    26
    sage: 14 + 14
    28
"""
PY
sqlite3 "$doctest_source_frontier_focused_db" <<SQL
create table runs (
  id integer primary key,
  started_at text,
  git_commit text,
  command text,
  run_profile text,
  status text,
  source_root text,
  runner_version integer
);
create table files (
  id integer primary key,
  run_id integer,
  path text,
  status text
);
create table blocks (
  file_id integer,
  status text
);
insert into runs (
  id, started_at, git_commit, command, run_profile, status, source_root,
  runner_version
) values (
  1,
  '2026-07-08T00:00:00.000Z',
  'standalone-smoke-fixture',
  'sage -t --line 10 src/sage/example/strict_database_frontier.py',
  'node',
  'passed',
  '$doctest_candidate_helper_source_root',
  83
);
insert into files (id, run_id, path, status) values (
  1,
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/strict_database_frontier.py',
  'passed'
);
insert into blocks (file_id, status) values (1, 'passed');
SQL
sqlite3 "$doctest_source_frontier_foreign_db" <<SQL
create table runs (
  id integer primary key,
  started_at text,
  git_commit text,
  command text,
  run_profile text,
  status text,
  source_root text,
  runner_version integer
);
create table files (
  id integer primary key,
  run_id integer,
  path text,
  status text
);
create table blocks (
  file_id integer,
  status text
);
insert into runs (
  id, started_at, git_commit, command, run_profile, status, source_root,
  runner_version
) values (
  1,
  '2026-07-08T00:00:00.000Z',
  'standalone-smoke-fixture',
  'sage -t src/sage/example/strict_database_frontier.py',
  'node',
  'passed',
  '$doctest_candidate_helper_override_source_root',
  83
);
insert into files (id, run_id, path, status) values (
  1,
  1,
  '$doctest_candidate_helper_override_source_root/src/sage/example/strict_database_frontier.py',
  'passed'
);
insert into blocks (file_id, status) values (1, 'passed');
SQL
sqlite3 "$doctest_source_frontier_stale_db" <<SQL
create table runs (
  id integer primary key,
  source_root text,
  runner_version integer
);
create table files (
  id integer primary key,
  run_id integer,
  path text,
  status text
);
insert into runs (id, source_root, runner_version) values (
  1,
  '$doctest_candidate_helper_source_root',
  1
);
insert into files (id, run_id, path, status) values (
  1,
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/strict_database_frontier.py',
  'passed'
);
SQL
sqlite3 "$doctest_source_frontier_file_error_db" <<SQL
create table runs (
  id integer primary key,
  started_at text,
  git_commit text,
  command text,
  run_profile text,
  status text,
  source_root text,
  runner_version integer
);
create table files (
  id integer primary key,
  run_id integer,
  path text,
  status text
);
insert into runs (
  id, started_at, git_commit, command, run_profile, status, source_root,
  runner_version
) values (
  1,
  '2026-07-08T00:00:00.000Z',
  'standalone-smoke-fixture',
  'sage -t src/sage/example/strict_file_error_frontier.py',
  'node',
  'failed',
  '$doctest_candidate_helper_source_root',
  83
);
insert into files (id, run_id, path, status) values (
  1,
  1,
  '$doctest_candidate_helper_source_root/src/sage/example/strict_file_error_frontier.py',
  'error'
);
SQL
sqlite3 "$doctest_source_frontier_relative_db" <<SQL
create table runs (
  id integer primary key,
  started_at text,
  git_commit text,
  command text,
  run_profile text,
  status text,
  source_root text,
  runner_version integer
);
create table files (
  id integer primary key,
  run_id integer,
  path text,
  status text
);
create table blocks (
  file_id integer,
  status text
);
insert into runs (
  id, started_at, git_commit, command, run_profile, status, source_root,
  runner_version
) values (
  1,
  '2026-07-08T00:00:00.000Z',
  'standalone-smoke-fixture',
  'sage -t src/sage/example/strict_database_frontier.py',
  'node',
  'passed',
  '$doctest_candidate_helper_source_root',
  83
);
insert into files (id, run_id, path, status) values (
  1,
  1,
  'src/sage/example/strict_database_frontier.py',
  'passed'
);
insert into blocks (file_id, status) values (1, 'passed');
SQL
doctest_source_frontier_strict_paths="$("$src_dir/doctest-source-frontier.py" \
  --paths-only \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_source_frontier_corpus" \
  --mentioned-file "$doctest_source_frontier_mentioned" \
  --subtract-database "$doctest_candidate_helper_db" \
  --subtract-database "$doctest_source_frontier_focused_db" \
  --subtract-database "$doctest_source_frontier_foreign_db" \
  --subtract-database "$doctest_source_frontier_stale_db" \
  --subtract-database "$doctest_source_frontier_file_error_db" \
  --subtract-database "$doctest_source_frontier_relative_db" \
  --subtract-database "$doctest_candidate_helper_optional_db" \
  --ignore-invalid-databases \
  --quiet-invalid-databases \
  --strict-database-subtraction \
  --min-runner-version 83 \
  --min-runnable-prompts 1)"
if [ "$doctest_source_frontier_strict_paths" != "src/sage/example/frontier_candidate.py
src/sage/example/optional_candidate.py
src/sage/example/strict_database_frontier.py
src/sage/example/strict_file_error_frontier.py" ]; then
  printf '%s\n' "$doctest_source_frontier_strict_paths" >&2
  sqlite3 "$doctest_source_frontier_focused_db" ".dump" >&2 || true
  sqlite3 "$doctest_source_frontier_foreign_db" ".dump" >&2 || true
  sqlite3 "$doctest_source_frontier_stale_db" ".dump" >&2 || true
  sqlite3 "$doctest_source_frontier_file_error_db" ".dump" >&2 || true
  sqlite3 "$doctest_source_frontier_relative_db" ".dump" >&2 || true
  sqlite3 "$doctest_candidate_helper_optional_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-source-frontier strict database subtraction hid live frontier rows."
fi
doctest_source_frontier_strict_shortcut_paths="$("$src_dir/doctest-source-frontier.py" \
  --paths-only \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_source_frontier_corpus" \
  --mentioned-file "$doctest_source_frontier_mentioned" \
  --subtract-database "$doctest_candidate_helper_db" \
  --subtract-database "$doctest_source_frontier_focused_db" \
  --subtract-database "$doctest_source_frontier_foreign_db" \
  --subtract-database "$doctest_source_frontier_stale_db" \
  --subtract-database "$doctest_source_frontier_file_error_db" \
  --subtract-database "$doctest_source_frontier_relative_db" \
  --subtract-database "$doctest_candidate_helper_optional_db" \
  --ignore-invalid-databases \
  --quiet-invalid-databases \
  --strict-frontier \
  --min-runner-version 83 \
  --min-runnable-prompts 1)"
if [ "$doctest_source_frontier_strict_shortcut_paths" != "$doctest_source_frontier_strict_paths" ]; then
  printf '%s\n' "$doctest_source_frontier_strict_shortcut_paths" >&2
  record_blocker "sagelite-blocked: doctest-source-frontier --strict-frontier did not match strict database subtraction."
fi
doctest_source_frontier_attempted_paths="$("$src_dir/doctest-source-frontier.py" \
  --paths-only \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_source_frontier_corpus" \
  --mentioned-file "$doctest_source_frontier_mentioned" \
  --subtract-database "$doctest_candidate_helper_db" \
  --subtract-database "$doctest_source_frontier_focused_db" \
  --subtract-database "$doctest_source_frontier_foreign_db" \
  --subtract-database "$doctest_source_frontier_stale_db" \
  --subtract-database "$doctest_source_frontier_file_error_db" \
  --subtract-database "$doctest_source_frontier_relative_db" \
  --subtract-database "$doctest_candidate_helper_optional_db" \
  --ignore-invalid-databases \
  --quiet-invalid-databases \
  --strict-frontier \
  --subtract-file-error-runs \
  --min-runner-version 83 \
  --min-runnable-prompts 1)"
if [ "$doctest_source_frontier_attempted_paths" != "src/sage/example/frontier_candidate.py
src/sage/example/optional_candidate.py
src/sage/example/strict_database_frontier.py" ]; then
  printf '%s\n' "$doctest_source_frontier_attempted_paths" >&2
  sqlite3 "$doctest_source_frontier_file_error_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: doctest-source-frontier --subtract-file-error-runs did not subtract attempted file-error rows."
fi
set +e
doctest_candidate_helper_quiet_guard="$("$src_dir/doctest-corpus-candidates.py" \
  --quiet-invalid \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db" \
  2>&1)"
doctest_candidate_helper_quiet_guard_status=$?
set -e
if [ "$doctest_candidate_helper_quiet_guard_status" -eq 0 ] || \
  ! printf '%s\n' "$doctest_candidate_helper_quiet_guard" | grep -Fq -- "--quiet-invalid requires --ignore-invalid"; then
  printf '%s\n' "$doctest_candidate_helper_quiet_guard" >&2
  record_blocker "sagelite-blocked: doctest-corpus-candidates --quiet-invalid guard did not fire."
fi
set +e
doctest_source_frontier_quiet_guard="$("$src_dir/doctest-source-frontier.py" \
  --quiet-invalid-databases \
  --source-root "$doctest_candidate_helper_source_root" \
  --corpus "$doctest_source_frontier_corpus" \
  2>&1)"
doctest_source_frontier_quiet_guard_status=$?
set -e
if [ "$doctest_source_frontier_quiet_guard_status" -eq 0 ] || \
  ! printf '%s\n' "$doctest_source_frontier_quiet_guard" | grep -Fq -- "--quiet-invalid-databases requires --ignore-invalid-databases"; then
  printf '%s\n' "$doctest_source_frontier_quiet_guard" >&2
  record_blocker "sagelite-blocked: doctest-source-frontier --quiet-invalid-databases guard did not fire."
fi
set +e
doctest_candidate_helper_block_detail_guard="$("$src_dir/doctest-corpus-candidates.py" \
  --only-block-failure-detail coercion \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db" \
  2>&1)"
doctest_candidate_helper_block_detail_guard_status=$?
set -e
if [ "$doctest_candidate_helper_block_detail_guard_status" -eq 0 ] || \
  ! printf '%s\n' "$doctest_candidate_helper_block_detail_guard" | grep -Fq -- "--only-block-failure-detail requires --near-misses"; then
  printf '%s\n' "$doctest_candidate_helper_block_detail_guard" >&2
  record_blocker "sagelite-blocked: doctest-corpus-candidates --only-block-failure-detail guard did not fire."
fi
set +e
doctest_candidate_helper_skip_tag_guard="$("$src_dir/doctest-corpus-candidates.py" \
  --only-skip-tag sage.symbolic \
  --corpus "$doctest_candidate_helper_corpus" \
  "$doctest_candidate_helper_db" \
  2>&1)"
doctest_candidate_helper_skip_tag_guard_status=$?
set -e
if [ "$doctest_candidate_helper_skip_tag_guard_status" -eq 0 ] || \
  ! printf '%s\n' "$doctest_candidate_helper_skip_tag_guard" | grep -Fq -- "--only-skip-tag requires --skipped-only"; then
  printf '%s\n' "$doctest_candidate_helper_skip_tag_guard" >&2
  record_blocker "sagelite-blocked: doctest-corpus-candidates --only-skip-tag guard did not fire."
fi
doctest_state_file="$probe_dir/sagelite-doctest-state.py"
doctest_state_db="$probe_dir/sagelite-doctest-state.sqlite3"
doctest_state_log="$dist_dir/doctest-state.log"
cat >"$doctest_state_file" <<'PY'
r"""
EXAMPLES::

    sage: raise KeyboardInterrupt("state source smoke")
    unreachable
"""
PY
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --sqlite "$doctest_state_db" "$doctest_state_file" \
      >"$doctest_state_log" 2>&1
doctest_state_status=$?
set -e
if [ "$doctest_state_status" -eq 124 ]; then
  tail -120 "$doctest_state_log" >&2
  record_blocker "sagelite-blocked: sage -t doctest state smoke timed out after $node_import_timeout; see $doctest_state_log for the first runtime blocker."
fi
if [ "$doctest_state_status" -eq 0 ]; then
  cat "$doctest_state_log" >&2
  sqlite3 "$doctest_state_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t doctest state smoke unexpectedly passed."
fi
doctest_state_count="$(sqlite3 "$doctest_state_db" "select count(*) from files where status = 'error' and failure_class = 'KeyboardInterrupt' and failure_detail like '%doctest source:%' and failure_detail like '%raise KeyboardInterrupt(\"state source smoke\")%' and failure_detail like '%doctest expected:%unreachable%';")"
if [ "$doctest_state_count" != "1" ]; then
  cat "$doctest_state_log" >&2
  sqlite3 "$doctest_state_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t doctest state smoke did not record active example source metadata."
fi
doctest_state_cluster_output="$(sqlite3 "$doctest_state_db" <"$src_dir/doctest-sql/file-error-clusters.sql")"
if ! printf '%s\n' "$doctest_state_cluster_output" |
    grep -Fq 'raise KeyboardInterrupt("state source smoke")'; then
  cat "$doctest_state_log" >&2
  printf '%s\n' "$doctest_state_cluster_output" >&2
  sqlite3 "$doctest_state_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: file-error cluster query did not include active doctest source context."
fi
if ! printf '%s\n' "$doctest_state_cluster_output" |
    grep -Fq 'doctest expected:'; then
  cat "$doctest_state_log" >&2
  printf '%s\n' "$doctest_state_cluster_output" >&2
  sqlite3 "$doctest_state_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: file-error cluster query did not include active doctest expected-output context."
fi
doctest_optional_feature_db="$probe_dir/sagelite-doctest-optional-feature.sqlite3"
doctest_optional_feature_log="$dist_dir/doctest-optional-feature.log"
doctest_deferred_feature_db="$probe_dir/sagelite-doctest-deferred-feature.sqlite3"
doctest_deferred_feature_log="$dist_dir/doctest-deferred-feature.log"
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --optional=cowasm_smoke \
      --sqlite "$doctest_optional_feature_db" "$doctest_smoke_file" \
      >"$doctest_optional_feature_log" 2>&1
doctest_optional_feature_status=$?
set -e
if [ "$doctest_optional_feature_status" -eq 124 ]; then
  tail -120 "$doctest_optional_feature_log" >&2
  record_blocker "sagelite-blocked: sage -t optional-feature smoke timed out after $node_import_timeout; see $doctest_optional_feature_log for the first runtime blocker."
fi
if [ "$doctest_optional_feature_status" -ne 0 ]; then
  tail -120 "$doctest_optional_feature_log" >&2
  record_blocker "sagelite-blocked: sage -t optional-feature smoke failed; see $doctest_optional_feature_log for the first runtime blocker."
fi
doctest_optional_feature_counts="$(sqlite3 "$doctest_optional_feature_db" "select status || '|' || total_blocks || '|' || passed_blocks || '|' || failed_blocks || '|' || skipped_blocks from runs order by id desc limit 1;")"
if [ "$doctest_optional_feature_counts" != "passed|84|74|0|10" ]; then
  cat "$doctest_optional_feature_log" >&2
  sqlite3 "$doctest_optional_feature_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t optional-feature smoke wrote unexpected SQLite counts: $doctest_optional_feature_counts"
fi
doctest_optional_feature_pass_count="$(sqlite3 "$doctest_optional_feature_db" "select count(*) from blocks where status = 'passed' and tags like '%optional:cowasm_smoke%';")"
if [ "$doctest_optional_feature_pass_count" != "1" ]; then
  cat "$doctest_optional_feature_log" >&2
  sqlite3 "$doctest_optional_feature_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t optional-feature smoke did not run the requested optional feature."
fi
doctest_optional_conjunctive_count="$(sqlite3 "$doctest_optional_feature_db" "select count(*) from blocks where status = 'skipped' and source like '20 + 22%' and skip_reason = 'optional:cowasm_smoke,cowasm_companion' and tags like '%needs:cowasm_smoke%' and tags like '%needs:cowasm_companion%';")"
if [ "$doctest_optional_conjunctive_count" != "1" ]; then
  cat "$doctest_optional_feature_log" >&2
  sqlite3 "$doctest_optional_feature_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t optional-feature smoke did not require every declared feature."
fi
doctest_optional_composed_deferred_count="$(sqlite3 "$doctest_optional_feature_db" "select count(*) from blocks where status = 'skipped' and source = 'cowasm_composed_directive_setup + 2' || char(10) and skip_reason = 'deferred:known bug' and tags like '%needs:cowasm_smoke%' and tags like '%deferred:known bug%';")"
if [ "$doctest_optional_composed_deferred_count" != "1" ]; then
  cat "$doctest_optional_feature_log" >&2
  sqlite3 "$doctest_optional_feature_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t optional-feature smoke did not retain the composed deferred requirement."
fi
doctest_needs_feature_pass_count="$(sqlite3 "$doctest_optional_feature_db" "select count(*) from blocks where status = 'passed' and source = '19 + 23' || char(10) and tags like '%needs:cowasm_smoke%';")"
if [ "$doctest_needs_feature_pass_count" != "1" ]; then
  cat "$doctest_optional_feature_log" >&2
  sqlite3 "$doctest_optional_feature_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t optional-feature smoke did not run the requested standalone needs feature."
fi
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --deferred=known-bug \
      --sqlite "$doctest_deferred_feature_db" "$doctest_smoke_file" \
      >"$doctest_deferred_feature_log" 2>&1
doctest_deferred_feature_status=$?
set -e
if [ "$doctest_deferred_feature_status" -eq 124 ]; then
  tail -120 "$doctest_deferred_feature_log" >&2
  record_blocker "sagelite-blocked: sage -t deferred-feature smoke timed out after $node_import_timeout; see $doctest_deferred_feature_log for the first runtime blocker."
fi
if [ "$doctest_deferred_feature_status" -eq 0 ]; then
  cat "$doctest_deferred_feature_log" >&2
  sqlite3 "$doctest_deferred_feature_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t deferred-feature smoke unexpectedly passed."
fi
doctest_deferred_feature_counts="$(sqlite3 "$doctest_deferred_feature_db" "select status || '|' || total_blocks || '|' || passed_blocks || '|' || failed_blocks || '|' || skipped_blocks from runs order by id desc limit 1;")"
if [ "$doctest_deferred_feature_counts" != "failed|84|68|1|15" ]; then
  cat "$doctest_deferred_feature_log" >&2
  sqlite3 "$doctest_deferred_feature_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t deferred-feature smoke wrote unexpected SQLite counts: $doctest_deferred_feature_counts"
fi
doctest_deferred_feature_failed_count="$(sqlite3 "$doctest_deferred_feature_db" "select count(*) from blocks where status = 'failed' and tags like '%deferred:known bug%' and source = '1 / 0' || char(10);")"
if [ "$doctest_deferred_feature_failed_count" != "1" ]; then
  cat "$doctest_deferred_feature_log" >&2
  sqlite3 "$doctest_deferred_feature_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t deferred-feature smoke did not run the requested known-bug deferred block."
fi
doctest_deferred_optional_word_count="$(sqlite3 "$doctest_deferred_feature_db" "select count(*) from blocks where status = 'passed' and source = '40 + 2' || char(10) and tags = 'deferred,deferred:known bug';")"
if [ "$doctest_deferred_optional_word_count" != "1" ]; then
  cat "$doctest_deferred_feature_log" >&2
  sqlite3 "$doctest_deferred_feature_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: deferred tag explanation text created a false optional-feature requirement."
fi
doctest_deferred_composed_optional_count="$(sqlite3 "$doctest_deferred_feature_db" "select count(*) from blocks where status = 'skipped' and source = 'cowasm_composed_directive_setup + 2' || char(10) and skip_reason = 'optional:cowasm_smoke' and tags like '%needs:cowasm_smoke%' and tags like '%deferred:known bug%';")"
if [ "$doctest_deferred_composed_optional_count" != "1" ]; then
  cat "$doctest_deferred_feature_log" >&2
  sqlite3 "$doctest_deferred_feature_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t deferred-feature smoke did not report the still-missing optional requirement."
fi
doctest_rel_tol_failure_file="$probe_dir/sagelite-doctest-rel-tol-failure.py"
doctest_rel_tol_failure_db="$probe_dir/sagelite-doctest-rel-tol-failure.sqlite3"
doctest_rel_tol_failure_log="$dist_dir/doctest-rel-tol-failure.log"
cat >"$doctest_rel_tol_failure_file" <<'PY'
r"""
EXAMPLES::

    sage: float("0.05")  # rel tol 1
    0.0
"""
PY
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --sqlite "$doctest_rel_tol_failure_db" "$doctest_rel_tol_failure_file" \
      >"$doctest_rel_tol_failure_log" 2>&1
doctest_rel_tol_failure_status=$?
set -e
if [ "$doctest_rel_tol_failure_status" -eq 124 ]; then
  tail -120 "$doctest_rel_tol_failure_log" >&2
  record_blocker "sagelite-blocked: sage -t relative-tolerance failure smoke timed out after $node_import_timeout; see $doctest_rel_tol_failure_log for the first runtime blocker."
fi
if [ "$doctest_rel_tol_failure_status" -eq 0 ]; then
  cat "$doctest_rel_tol_failure_log" >&2
  sqlite3 "$doctest_rel_tol_failure_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t relative-tolerance failure smoke unexpectedly passed."
fi
doctest_rel_tol_failure_count="$(sqlite3 "$doctest_rel_tol_failure_db" "select count(*) from blocks where status = 'failed' and expected_kind = 'tolerance' and failure_class = 'output_mismatch' and failure_detail = 'expected output mismatch';")"
if [ "$doctest_rel_tol_failure_count" != "1" ]; then
  cat "$doctest_rel_tol_failure_log" >&2
  sqlite3 "$doctest_rel_tol_failure_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t relative-tolerance failure smoke did not record the expected failed tolerance block metadata."
fi
doctest_false_exception_match_file="$probe_dir/sagelite-doctest-false-exception-match.py"
doctest_false_exception_match_db="$probe_dir/sagelite-doctest-false-exception-match.sqlite3"
doctest_false_exception_match_log="$dist_dir/doctest-false-exception-match.log"
cat >"$doctest_false_exception_match_file" <<'PY'
r"""
EXAMPLES::

    sage: print("actual prefix\nTrue")
    expected prefix
    True
    sage: exec("cowasm_syntax_smoke =")
    Traceback (most recent call last):
    ...
    SyntaxError...
"""
PY
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  run_host_timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
      --sqlite "$doctest_false_exception_match_db" \
      "$doctest_false_exception_match_file" \
      >"$doctest_false_exception_match_log" 2>&1
doctest_false_exception_match_status=$?
set -e
if [ "$doctest_false_exception_match_status" -eq 124 ]; then
  tail -120 "$doctest_false_exception_match_log" >&2
  record_blocker "sagelite-blocked: sage -t false exception-match smoke timed out after $node_import_timeout; see $doctest_false_exception_match_log for the first runtime blocker."
fi
if [ "$doctest_false_exception_match_status" -eq 0 ]; then
  cat "$doctest_false_exception_match_log" >&2
  sqlite3 "$doctest_false_exception_match_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t false exception-match smoke unexpectedly passed."
fi
doctest_false_exception_match_count="$(sqlite3 "$doctest_false_exception_match_db" "select count(*) from blocks where status = 'failed' and expected = 'expected prefix' || char(10) || 'True' || char(10) and actual = 'actual prefix' || char(10) || 'True' || char(10) and failure_class = 'output_mismatch' and failure_detail = 'expected output mismatch';")"
if [ "$doctest_false_exception_match_count" != "1" ]; then
  cat "$doctest_false_exception_match_log" >&2
  sqlite3 "$doctest_false_exception_match_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t false exception-match smoke did not reject mismatched multiline output ending in True."
fi
doctest_contextual_exception_match_count="$(sqlite3 "$doctest_false_exception_match_db" "select count(*) from blocks where status = 'passed' and source = 'exec(\"cowasm_syntax_smoke =\")' || char(10) and expected like '%SyntaxError...%';")"
if [ "$doctest_contextual_exception_match_count" != "1" ]; then
  cat "$doctest_false_exception_match_log" >&2
  sqlite3 "$doctest_false_exception_match_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t false exception-match smoke did not preserve contextual SyntaxError matching."
fi
printf 'sagelite-node-ok sage doctest sqlite smoke\n' >>"$node_import_log"

run_electron_smoke() {
  local label="$1"
  local resources_dir="$2"
  local marker="sagelite-electron-ok relative resources smoke"
  local marker_count_before
  local marker_count_after

  marker_count_before=$(grep -Fxc "$marker" "$electron_bundle_log" || true)
  printf '## %s\n' "$label" >>"$electron_bundle_log"
  set +e
  (
    cd "$resources_dir"
    PYTHONPATH= \
      COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
      run_host_timeout "$electron_smoke_timeout" node sagelite-electron-smoke.cjs
  ) >>"$electron_bundle_log" 2>&1
  local electron_bundle_status=$?
  set -e
  if [ "$electron_bundle_status" -eq 124 ]; then
    tail -120 "$electron_bundle_log" >&2
    record_blocker "sagelite-blocked: Electron-shaped relative resources smoke timed out after $electron_smoke_timeout at $label; see $electron_bundle_log for the first runtime blocker."
  fi
  if [ "$electron_bundle_status" -ne 0 ]; then
    tail -120 "$electron_bundle_log" >&2
    record_blocker "sagelite-blocked: Electron-shaped relative resources smoke failed at $label; see $electron_bundle_log for the first runtime blocker."
  fi
  marker_count_after=$(grep -Fxc "$marker" "$electron_bundle_log" || true)
  if [ "$marker_count_after" -le "$marker_count_before" ]; then
    tail -120 "$electron_bundle_log" >&2
    record_blocker "sagelite-blocked: Electron-shaped relative resources smoke exited before its completion marker at $label; see $electron_bundle_log for the first runtime blocker."
  fi
}

: >"$electron_bundle_log"
run_electron_smoke "staged resources" "$electron_resources_dir"

relocated_electron_resources="$probe_dir/electron-resources-relocated"
mkdir -p "$relocated_electron_resources"
if ! cp -al "$electron_resources_dir/." "$relocated_electron_resources/" 2>/dev/null; then
  rm -rf "$relocated_electron_resources"
  mkdir -p "$relocated_electron_resources"
  cp -a "$electron_resources_dir/." "$relocated_electron_resources/"
fi
run_electron_smoke "relocated resources" "$relocated_electron_resources"

if [ -s "$followups_file" ]; then
  echo "sagelite-ok meson configure compile install node import electron resources smoke relocated followups recorded" | tee "$status_file"
else
  echo "sagelite-ok meson configure compile install node import electron resources smoke relocated no followups" | tee "$status_file"
fi
