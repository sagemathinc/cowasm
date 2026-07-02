#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 22 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR CPYTHON_WASM PY_CYTHON PY_NUMPY PY_GMPY2 PY_MPMATH PY_JINJA2 PY_MESON PY_NINJA PY_PACKAGING PY_PLATFORMDIRS PYTHON_WASM CONWAY_POLYNOMIALS_WASI_SDK PRIMECOUNTPY_WASI_SDK CYSIGNALS_WASI_SDK MEMORY_ALLOCATOR_WASI_SDK POSIX_WASI_SDK LIBCXX_WASI_SDK CYPARI2_WASI_SDK LIBBRAIDING_WASI_SDK" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
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
cysignals_wasi_sdk="$(cd "${17}" && pwd)"
memory_allocator_wasi_sdk="$(cd "${18}" && pwd)"
posix_wasi_sdk="$(cd "${19}" && pwd)"
libcxx_wasi_sdk="$(cd "${20}" && pwd)"
cypari2_wasi_sdk="$(cd "${21}" && pwd)"
libbraiding_wasi_sdk="$(cd "${22}" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "sagelite" wasi-sdk "$bin_dir" "$probe_dir"

rm -rf "$dist_dir" "$build_dir/cowasm-meson-build"
mkdir -p "$dist_dir" "$build_dir/cowasm-meson-build" "$probe_dir/bin" "$probe_dir/pkgconfig"

status_file="$dist_dir/status.txt"
log_file="$dist_dir/meson-setup.log"
node_import_log="$dist_dir/node-import.log"
wasi_sdk_python_import_log="$dist_dir/wasi-sdk-python-import.log"
followups_file="$dist_dir/followups.txt"
side_module_audit_log="$dist_dir/side-module-audit.log"
node_import_timeout="${SAGELITE_NODE_IMPORT_TIMEOUT:-180s}"
electron_smoke_timeout="${SAGELITE_ELECTRON_SMOKE_TIMEOUT:-180s}"
doctest_timeout_smoke_seconds="${SAGELITE_DOCTEST_TIMEOUT_SMOKE_SECONDS:-10}"

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

cat >"$probe_dir/bin/meson" <<EOF
#!/usr/bin/env bash
set -euo pipefail
export PYTHONPATH="$py_meson\${PYTHONPATH:+:\$PYTHONPATH}"
exec python3 -m mesonbuild.mesonmain "\$@"
EOF
chmod +x "$probe_dir/bin/meson"

cat >"$probe_dir/bin/ninja" <<EOF
#!/usr/bin/env bash
set -euo pipefail
exec "$py_ninja/bin/ninja" "\$@"
EOF
chmod +x "$probe_dir/bin/ninja"

cat >"$probe_dir/bin/wasi-sdk-clang-next" <<EOF
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
chmod +x "$probe_dir/bin/wasi-sdk-clang-next"

cat >"$probe_dir/bin/wasi-sdk-clang++-next" <<EOF
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
chmod +x "$probe_dir/bin/wasi-sdk-clang++-next"

export PATH="$probe_dir/bin:$PATH"

if ! command -v meson >/dev/null 2>&1; then
  record_blocker "sagelite-blocked: package-local meson wrapper is not available on PATH."
fi

if ! command -v ninja >/dev/null 2>&1; then
  record_blocker "sagelite-blocked: package-local ninja wrapper is not available on PATH."
fi

if ! command -v timeout >/dev/null 2>&1; then
  record_blocker "sagelite-blocked: host timeout command is required for bounded Node.js runtime probes."
fi

pythonpath_parts=(
  "$cypari2_wasi_sdk"
  "$conway_polynomials_wasi_sdk"
  "$primecountpy_wasi_sdk"
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

cat >"$probe_dir/pkgconfig/cblas.pc" <<EOF
prefix=$gsl_wasi_sdk
libdir=\${prefix}/lib
includedir=\${prefix}/include

Name: cblas
Description: CoWasm BLAS provider backed by GSL CBLAS
Version: 2.8
Libs: -L\${libdir} -lgslcblas -lm
Cflags: -I\${includedir}
EOF

cp "$probe_dir/pkgconfig/cblas.pc" "$probe_dir/pkgconfig/blas.pc"

cat >"$probe_dir/pkgconfig/libpng.pc" <<EOF
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

cp "$probe_dir/pkgconfig/libpng.pc" "$probe_dir/pkgconfig/png.pc"
cp "$probe_dir/pkgconfig/libpng.pc" "$probe_dir/pkgconfig/png16.pc"
pkg_config_paths+=("$probe_dir/pkgconfig")

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
c = '$probe_dir/bin/wasi-sdk-clang-next'
cpp = '$probe_dir/bin/wasi-sdk-clang++-next'
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
c_args = ['-target', 'wasm32-wasip1', '-fPIC', '-D_WASI_EMULATED_SIGNAL', '-include', '$src_dir/cowasm-fenv-compat.h', '-I$cpython_wasm/include/python3.14', '-I$posix_wasi_sdk', '-I$pari_wasi_sdk/include', '-I$boost_cropped_wasi_sdk/include', '-I$gsl_wasi_sdk/include', '-I$mpfr_wasi_sdk/include', '-I$mpfi_wasi_sdk/include', '-I$ntl_wasi_sdk/include', '-I$libbraiding_wasi_sdk/include', '-I$m4ri_wasi_sdk/include', '-I$m4rie_wasi_sdk/include']
cpp_args = ['-target', 'wasm32-wasip1', '-fPIC', '-D_WASI_EMULATED_SIGNAL', '-include', '$src_dir/cowasm-fenv-compat.h', '-I$cpython_wasm/include/python3.14', '-I$posix_wasi_sdk', '-I$pari_wasi_sdk/include', '-I$boost_cropped_wasi_sdk/include', '-I$gsl_wasi_sdk/include', '-I$mpfr_wasi_sdk/include', '-I$mpfi_wasi_sdk/include', '-I$ntl_wasi_sdk/include', '-I$libbraiding_wasi_sdk/include', '-I$m4ri_wasi_sdk/include', '-I$m4rie_wasi_sdk/include']
c_link_args = ['-target', 'wasm32-wasip1', '-shared', '-nostdlib', '-Wl,--allow-undefined', '-Wl,--no-entry', '-L$pari_wasi_sdk/lib', '-L$gmp_wasi_sdk/lib', '-L$libbraiding_wasi_sdk/lib']
cpp_link_args = ['-target', 'wasm32-wasip1', '-shared', '-nostdlib', '-Wl,--allow-undefined', '-Wl,--no-entry', '-L$pari_wasi_sdk/lib', '-L$gmp_wasi_sdk/lib', '-L$libbraiding_wasi_sdk/lib']

[properties]
cowasm_libcxx = '$libcxx_wasi_sdk/libcxx.so'
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
    -Dlibbraiding=enabled \
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

set +e
PYTHONPATH="$pythonpath" \
PKG_CONFIG_PATH="$pkg_config_path" \
PKG_CONFIG_LIBDIR="$pkg_config_path" \
PKG_CONFIG="$pkg_config" \
  meson compile -C "$build_dir/cowasm-meson-build" >"$dist_dir/meson-compile.log" 2>&1
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
  meson install -C "$build_dir/cowasm-meson-build" --destdir "$dist_dir/stage" >"$dist_dir/meson-install.log" 2>&1
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
  "sage/rings/polynomial/polynomial_integer_dense_flint" \
  "sage.rings.polynomial.polynomial_integer_dense_flint" \
  "FLINT integer polynomial side module is disabled on CoWasm WASI until its initializer no longer terminates the Node.js worker"
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
    timeout "$node_import_timeout" \
      node "$python_wasm/bin/python-wasm" -c "$wrapped_code" >>"$node_import_log" 2>&1
  local import_status=$?
  set -e
  if [ "$import_status" -eq 124 ]; then
    tail -120 "$node_import_log" >&2
    record_blocker "sagelite-blocked: Node.js python-wasm import timed out after $node_import_timeout at $label; see $node_import_log for the first runtime blocker."
  fi
  if [ "$import_status" -ne 0 ]; then
    tail -120 "$node_import_log" >&2
    record_blocker "sagelite-blocked: Node.js python-wasm import failed at $label; see $node_import_log for the first runtime blocker."
  fi
  if ! grep -Fqx "$marker" "$node_import_log"; then
    printf '## %s verbose import trace after missing marker\n' "$label" >>"$node_import_log"
    set +e
    PYTHONPATH="$node_pythonpath" \
      timeout "$node_import_timeout" \
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
    timeout "$node_import_timeout" \
      "$bin_dir/python-wasi-sdk" -c "$wrapped_code" \
      >>"$wasi_sdk_python_import_log" 2>&1
  local import_status=$?
  set -e
  if [ "$import_status" -eq 124 ]; then
    tail -120 "$wasi_sdk_python_import_log" >&2
    record_blocker "sagelite-blocked: python-wasi-sdk import timed out after $node_import_timeout at $label; see $wasi_sdk_python_import_log for the first runtime blocker."
  fi
  if [ "$import_status" -ne 0 ]; then
    tail -120 "$wasi_sdk_python_import_log" >&2
    record_blocker "sagelite-blocked: python-wasi-sdk import failed at $label; see $wasi_sdk_python_import_log for the first runtime blocker."
  fi
  if ! grep -Fqx "$marker" "$wasi_sdk_python_import_log"; then
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
from sage.combinat.combination import Combinations
from sage.combinat.composition import Composition, Compositions
from sage.combinat.derangements import Derangements
from sage.combinat.perfect_matching import PerfectMatching, PerfectMatchings
from sage.combinat.subword import Subwords
from sage.combinat.tuple import Tuples, UnorderedTuples
from sage.sets.family import Family
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
run_wasi_sdk_python_import "remote-file browser guard" "import sys
import sage.misc.all
assert 'ssl' not in sys.modules
assert '_ssl' not in sys.modules
from sage.misc.remote_file import get_remote_file
try:
    get_remote_file('https://example.com/sagelite.txt')
except NotImplementedError as err:
    assert 'WASI browser profile' in str(err)
else:
    raise AssertionError('remote file downloads should fail closed on WASI')
assert 'ssl' not in sys.modules
assert '_ssl' not in sys.modules
print('sagelite-wasi-sdk-ok remote-file browser guard')"
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
run_node_import "free module smoke" "from sage.all import ZZ, QQ
from sage.modules.free_module import FreeModule
M = FreeModule(ZZ, 3)
v = M([1, 2, 3])
w = M([4, 5, 6])
assert v + w == M([5, 7, 9])
assert v.dot_product(w) == ZZ(32)
assert 2 * v == M([2, 4, 6])
V = FreeModule(QQ, 2)
q = V([QQ(1, 2), QQ(2, 3)])
assert q.denominator() == 6
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
from sage.sets.finite_set_maps import FiniteSetMaps
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
from sage.combinat.integer_lists import IntegerListsLex
L = IntegerListsLex(4, length=3)
assert L.cardinality() == 15
assert list(L.first()) == [4, 0, 0]
assert list(L.last()) == [0, 0, 4]
assert [list(v) for v in L[:4]] == [[4, 0, 0], [3, 1, 0], [3, 0, 1], [2, 2, 0]]
print('sagelite-node-ok integer lists smoke')"
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
R = PolynomialRing(QQ, 'x')
x = R.gen()
assert (x**3 - 2*x + 1).derivative().list() == [QQ(-2), QQ(0), QQ(3)]
assert (x**4 - 1)(QQ(2)) == QQ(15)
assert x.degree() == 1
assert ((x + 2)**4).list() == [QQ(16), QQ(32), QQ(24), QQ(8), QQ(1)]
ZZt = PolynomialRing(ZZ, 't')
t = ZZt.gen()
assert (t**4 - 1).quo_rem(t**2 - 1) == (t**2 + 1, 0)
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
run_node_import "finite-field polynomial smoke" "from sage.all import GF, PolynomialRing
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
print('sagelite-node-ok finite-field polynomial smoke')"
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
run_node_import "Laurent polynomial smoke" "from sage.all import QQ, LaurentPolynomialRing
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
run_node_import "explicit FLINT polynomial rejection" "from sage.all import ZZ, PolynomialRing
try:
    PolynomialRing(ZZ, 'x', implementation='FLINT')
except NotImplementedError as err:
    assert 'WASI' in str(err)
else:
    raise AssertionError('explicit FLINT polynomial implementation should be rejected on WASI')
print('sagelite-node-ok explicit FLINT polynomial rejection')"

run_node_import "FLINT polynomial imports fail closed" "modules = [
    'sage.rings.polynomial.polynomial_integer_dense_flint',
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
print('sagelite-node-ok FLINT polynomial imports fail closed')"

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
assert str(pari('primepi(10^6)')) == '78498'
assert str(pari('factorback(factor(360))')) == '360'
assert str(pari('znorder(Mod(2,101))')) == '100'
assert str(pari('polisirreducible(x^2+1)')) == '1'
assert str(pari('ellcard(ellinit([0,-1]), 5)')) == '6'
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

run_node_import "Sage PARI factorization boundary" "from sage.rings.integer_ring import ZZ
from sage.rings.factorint_pari import factor_using_pari
assert factor_using_pari(ZZ(360)) == [(ZZ(2), 3), (ZZ(3), 2), (ZZ(5), 1)]
assert factor_using_pari(ZZ(2**31 - 1)) == [(ZZ(2147483647), 1)]
print('sagelite-node-ok Sage PARI factorization boundary')"

run_node_import "Sage PARI rational converter boundary" "from sage.all import QQ
from sage.libs.pari.convert_sage import new_gen_from_rational
q = QQ(1) / QQ(7)
g = new_gen_from_rational(q)
assert str(g) == '1/7'
print('sagelite-node-ok Sage PARI rational converter boundary')"

: >"$followups_file"
cat >>"$followups_file" <<'EOFOLLOWUPS'
sagelite-followup: rational polynomial roots over QQ exit before the Node.js polynomial helper smoke marker when promoted to the standalone import ladder.
sagelite-followup: integer matrix right_kernel exits before the Node.js linear algebra smoke marker when promoted to the standalone import ladder.
sagelite-followup: basic Graph and Poset construction stop at missing sage.graphs.generic_graph_pyx in the staged Electron resource tree.
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

electron_resources_dir="$dist_dir/electron-resources"
electron_bundle_log="$dist_dir/electron-bundle.log"
electron_manifest_schema_version=144
electron_manifest_resource_kind="cowasm-sagelite-electron-resources"
electron_manifest_python_abi="cpython-314-wasm32-wasi"
electron_manifest_python_platform="wasi"
electron_manifest_smoke_contract="exact-arithmetic-polynomial-helpers-finite-field-polynomial-finite-field-matrix-linear-arithmetic-charpoly-matrix-space-finite-field-matrix-rank-multivariate-polynomial-laurent-polynomial-derivatives-matrix-rank-free-module-abelian-group-hamming-code-distance-power-tableau-set-partition-perfect-matching-derangements-subwords-finite-set-maps-tuples-partition-permutation-statistics-larger-enumeration-partition-enumeration-partition-composition-methods-permutation-enumeration-tableau-subset-integer-vector-enumeration-combinatorics-cardinality-combinat-list-roundtrip-signed-composition-integer-lists-crt-valuation-quotient-ring-modular-inverse-integer-rational-helpers-integer-methods-signed-integer-rational-helpers-extended-integer-helpers-combinat-monoid-functional-set-family-positive-integers-cypari2-pari-error-recovery-sage-pari-boundary-resource-root-env-version-manifest-self-contained-sorted-side-modules-sorted-required-resources-source-tree-state-version-required-combinat-resource-files-v64-extended-linear-polynomial-set-family-indexing-v65-integer-gcd-lcm-v66-integer-quotient-ring-operations-v67-matrix-solve-right-v68-matrix-solve-left-v69-finite-field-polynomial-quotient-list-power-v70-extended-matrix-solve-v71-rational-left-solve-v72-integer-rational-arithmetic-v73-matrix-power-stack-augment-v74-integer-xgcd-quotient-family-v75-polynomial-coefficients-power-v76-matrix-views-change-ring-v77-matrix-polynomial-partition-accessors-v78-polynomial-dict-partition-composition-accessors-v79-free-module-matrix-polynomial-accessors-v80-rational-matrix-inverse-v81-integer-comparison-v82-integer-bits-polynomial-truncation-v83-polynomial-composition-substitution-v84-finite-field-matrix-solve-v85-finite-field-matrix-space-v86-finite-field-matrix-accessors-v87-finite-field-matrix-space-arithmetic-v88-finite-field-matrix-space-identity-zero-v89-trivariate-polynomial-derivative-substitution-v90-finite-field-matrix-parent-indexing-v91-rational-numerator-denominator-v92-laurent-polynomial-accessors-v93-required-laurent-mpair-resource-v94-rational-3x3-matrix-v95-rational-matrix-solve-view-v96-matrix-row-column-mutation-v97-matrix-row-column-assignment-v98-matrix-row-column-combination-v99-finite-field-3x3-matrix-v100-finite-field-3x3-solve-v101-finite-field-3x3-charpoly-rank-v102-integer-zero-one-predicates-v103-rational-comparison-integer-divisibility-v104-rational-normalization-sign-v105-conway-polynomial-resource-v106-libbraiding-wrapper-v107"
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

runtime_dep_labels=(
  cypari2
  conway_polynomials
  primecountpy
  libcxx
  cysignals
  memory_allocator
  jinja2
  packaging
  platformdirs
  gmpy2
  numpy
  cython
)
runtime_dep_paths=(
  "$cypari2_wasi_sdk"
  "$conway_polynomials_wasi_sdk"
  "$primecountpy_wasi_sdk"
  "$libcxx_wasi_sdk"
  "$cysignals_wasi_sdk"
  "$memory_allocator_wasi_sdk"
  "$py_jinja2"
  "$py_packaging"
  "$py_platformdirs"
  "$py_gmpy2"
  "$py_numpy"
  "$py_cython"
)

electron_pythonpath_parts=("site-packages")
for i in "${!runtime_dep_labels[@]}"; do
  stage_runtime_tree "${runtime_dep_paths[$i]}" "$electron_resources_dir/deps/${runtime_dep_labels[$i]}"
  electron_pythonpath_parts+=("deps/${runtime_dep_labels[$i]}")
done

electron_required_paths=(
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
  "site-packages/sage/misc/__init__.py"
  "site-packages/sage/misc/flatten.py"
  "site-packages/sage/misc/functional.py"
  "site-packages/sage/misc/misc_c.cpython-314-wasm32-wasi.so"
  "site-packages/sage/functions/__init__.py"
  "site-packages/sage/functions/all.py"
  "site-packages/sage/functions/prime_pi.cpython-314-wasm32-wasi.so"
  "site-packages/sage/categories/__init__.py"
  "site-packages/sage/categories/action.cpython-314-wasm32-wasi.so"
  "site-packages/sage/categories/algebras.py"
  "site-packages/sage/categories/algebras_with_basis.py"
  "site-packages/sage/categories/associative_algebras.py"
  "site-packages/sage/categories/category.py"
  "site-packages/sage/categories/category_cy_helper.cpython-314-wasm32-wasi.so"
  "site-packages/sage/categories/category_singleton.cpython-314-wasm32-wasi.so"
  "site-packages/sage/categories/category_with_axiom.py"
  "site-packages/sage/categories/additive_monoids.py"
  "site-packages/sage/categories/commutative_algebras.py"
  "site-packages/sage/categories/cartesian_product.py"
  "site-packages/sage/categories/enumerated_sets.py"
  "site-packages/sage/categories/finite_dimensional_algebras_with_basis.py"
  "site-packages/sage/categories/finite_dimensional_modules_with_basis.py"
  "site-packages/sage/categories/groupoid.py"
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
  "site-packages/sage/rings/fast_arith.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/ideal.py"
  "site-packages/sage/rings/ideal_monoid.py"
  "site-packages/sage/rings/integer.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/integer_ring.cpython-314-wasm32-wasi.so"
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
  "site-packages/sage/rings/finite_rings/finite_field_prime_modn.py"
  "site-packages/sage/rings/finite_rings/integer_mod.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/finite_rings/integer_mod_ring.py"
  "site-packages/sage/rings/polynomial/__init__.py"
  "site-packages/sage/rings/polynomial/all.py"
  "site-packages/sage/rings/polynomial/commutative_polynomial.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/polynomial/multi_polynomial.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/polynomial/multi_polynomial_element.py"
  "site-packages/sage/rings/polynomial/multi_polynomial_ring.py"
  "site-packages/sage/rings/polynomial/multi_polynomial_ring_base.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/polynomial/polydict.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/polynomial/laurent_polynomial.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/polynomial/laurent_polynomial_mpair.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/polynomial/laurent_polynomial_ring.py"
  "site-packages/sage/rings/polynomial/laurent_polynomial_ring_base.py"
  "site-packages/sage/rings/polynomial/polynomial_element.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/polynomial/polynomial_element_generic.py"
  "site-packages/sage/rings/polynomial/polynomial_integer_dense_flint.py"
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
  "site-packages/sage/matrix/matrix_misc.py"
  "site-packages/sage/matrix/matrix_space.py"
  "site-packages/sage/matrix/special.py"
  "site-packages/sage/modules/__init__.py"
  "site-packages/sage/modules/free_module.py"
  "site-packages/sage/modules/free_module_element.cpython-314-wasm32-wasi.so"
  "site-packages/sage/modules/module.cpython-314-wasm32-wasi.so"
  "site-packages/sage/groups/__init__.py"
  "site-packages/sage/groups/group.cpython-314-wasm32-wasi.so"
  "site-packages/sage/groups/abelian_gps/__init__.py"
  "site-packages/sage/groups/abelian_gps/abelian_group.py"
  "site-packages/sage/groups/abelian_gps/abelian_group_element.py"
  "site-packages/sage/groups/abelian_gps/element_base.py"
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
  "site-packages/sage/combinat/set_partition.py"
  "site-packages/sage/combinat/set_partition_iterator.cpython-314-wasm32-wasi.so"
  "site-packages/sage/combinat/set_partition_ordered.py"
  "site-packages/sage/combinat/skew_tableau.py"
  "site-packages/sage/combinat/subword.py"
  "site-packages/sage/combinat/subset.py"
  "site-packages/sage/combinat/tableau.py"
  "site-packages/sage/combinat/tools.py"
  "site-packages/sage/combinat/tuple.py"
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
    sage: from sage.categories.sets_cat import EmptySetError; raise EmptySetError
    Traceback (most recent call last):
    ...
    EmptySetError
    sage: Subsets(3, 2).cardinality()
    3
    sage: list(IntegerVectors(2, 3))
    [[2, 0, 0], [1, 1, 0], [1, 0, 1], [0, 2, 0], [0, 1, 1], [0, 0, 2]]
    sage: list(IntegerListsLex(4, max_length=2))
    [[4], [3, 1], [2, 2], [1, 3], [0, 4]]
    sage: Word([1, 2, 3])
    word: 123
    sage: Permutation([3, 2, 1])
    [3, 2, 1]
    sage: Permutations(3).cardinality()
    6
    sage: Hom(ZZ, ZZ, Sets()).domain() is ZZ
    True
    sage: Set([2, 1, 2])
    {1, 2}
    sage: ProjectiveSpace(2, QQ)
    Projective Space of dimension 2 over Rational Field
    sage: list(FiniteEnumeratedSet([1, 2, 3]))
    [1, 2, 3]
    sage: 0 in NonNegativeIntegers()
    True
    sage: R.<x> = PolynomialRing(ZZ, sparse=True); ZZ._roots_univariate_polynomial((x + 1)^2 * (x - 3))
    [(3, 1), (-1, 2)]
    sage: float("0.3333333333333")  # abs tol 1e-12
    0.333333333334
    sage: float("0.3333333333333334")  # tol
    0.3333333333333333
    sage: import warnings; warnings.warn("\nsmoke warning", DeprecationWarning)
    doctest:warning
    ...
    DeprecationWarning:
    smoke warning
    sage: "17-adic Field with capped relative precision 20"
    ...-adic Field with capped relative precision ...
    sage: ZZ.random_element()  # random
    output is intentionally unchecked
    sage: 7 + 8  # optional - cowasm_smoke
    15
    sage: magma('2 + 2')  # optional - magma
    4
    sage: 1 / 0  # long time
    long-running failure
    sage: 1 / 0  # known bug
    deferred failure
    sage: 1 / 0  # not implemented
    deferred failure
    sage: 1 / 0  # not tested
    deferred failure
    sage: # needs cowasm_smoke
    sage: 19 + 23
    42

    sage: 6 * 7
    42
"""
PY
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  timeout "$node_import_timeout" \
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
if [ "$doctest_smoke_counts" != "passed|30|23|0|7" ]; then
  cat "$doctest_smoke_log" >&2
  sqlite3 "$doctest_smoke_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t doctest smoke wrote unexpected SQLite counts: $doctest_smoke_counts"
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
if [ "$doctest_block_key_count" != "30" ]; then
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
# sage.doctest: needs cowasm_file_header
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
  timeout "$node_import_timeout" \
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
  timeout "$node_import_timeout" \
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
  timeout "$node_import_timeout" \
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
  timeout "$node_import_timeout" \
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
  timeout "$node_import_timeout" \
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

    sage: line_setup_value = 37
    sage: line_setup_value + 5
    42
"""
PY
doctest_line_setup_line="$(grep -nF 'sage: line_setup_value + 5' "$doctest_line_setup_file" | head -n 1 | cut -d: -f1)"
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  timeout "$node_import_timeout" \
    node "$src_dir/sagelite-node-repl.cjs" -t \
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
if [ "$doctest_line_setup_counts" != "passed|1|1|0|0" ]; then
  cat "$doctest_line_setup_log" >&2
  sqlite3 "$doctest_line_setup_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t line-setup doctest smoke wrote unexpected SQLite counts: $doctest_line_setup_counts"
fi
doctest_line_setup_match_count="$(sqlite3 "$doctest_line_setup_db" "select count(*) from blocks where start_line = $doctest_line_setup_line and source like 'line_setup_value + 5%';")"
if [ "$doctest_line_setup_match_count" != "1" ]; then
  cat "$doctest_line_setup_log" >&2
  sqlite3 "$doctest_line_setup_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t line-setup doctest smoke did not record only the requested source line."
fi
doctest_missing_line_db="$probe_dir/sagelite-doctest-missing-line.sqlite3"
doctest_missing_line_log="$dist_dir/doctest-missing-line.log"
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  timeout "$node_import_timeout" \
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
  timeout "$node_import_timeout" \
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
doctest_stats_namespace_db="$probe_dir/sagelite-doctest-stats-namespace.sqlite3"
doctest_stats_namespace_log="$dist_dir/doctest-stats-namespace.log"
doctest_stats_namespace_file="$probe_dir/sagelite-doctest-stats-namespace.py"
cat >"$doctest_stats_namespace_file" <<'PY'
"""
Check that the stripped Sagelite startup namespace includes the stats catalog.

EXAMPLES::

    sage: hasattr(distributions, "DiscreteGaussianDistributionPolynomialSampler")
    True
"""
PY
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  timeout "$node_import_timeout" \
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
  timeout "$node_import_timeout" \
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
doctest_deferred_count="$(sqlite3 "$doctest_smoke_db" "select count(*) from blocks where status = 'skipped' and skip_reason in ('deferred:known bug', 'deferred:not implemented', 'deferred:not tested') and tags like '%' || skip_reason || '%';")"
if [ "$doctest_deferred_count" != "3" ]; then
  cat "$doctest_smoke_log" >&2
  sqlite3 "$doctest_smoke_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t doctest smoke did not record deferred skip metadata."
fi
doctest_skip_reason_clusters="$(sqlite3 "$doctest_smoke_db" <"$src_dir/doctest-sql/skips-by-reason.sql")"
for expected_skip_reason in \
  'optional:cowasm_smoke|skip|optional,needs:cowasm_smoke|1' \
  'optional:magma|skip|optional,optional:magma|1' \
  'long time|skip|long time|1' \
  'deferred:known bug|skip|deferred,deferred:known bug|1' \
  'deferred:not implemented|skip|deferred,deferred:not implemented|1' \
  'deferred:not tested|skip|deferred,deferred:not tested|1'; do
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
  timeout "$node_import_timeout" \
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
  timeout "$node_import_timeout" \
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
  actual text
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
  timeout "$node_import_timeout" \
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
set +e
COWASM_PYTHON_WASM_NODE="$python_wasm/dist/node.js" \
  COWASM_SAGELITE_ELECTRON_RESOURCES="$electron_resources_dir" \
  COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="$probe_dir" \
  timeout "$node_import_timeout" \
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
if [ "$doctest_optional_feature_counts" != "passed|30|25|0|5" ]; then
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
doctest_needs_feature_pass_count="$(sqlite3 "$doctest_optional_feature_db" "select count(*) from blocks where status = 'passed' and source = '19 + 23' || char(10) and tags like '%needs:cowasm_smoke%';")"
if [ "$doctest_needs_feature_pass_count" != "1" ]; then
  cat "$doctest_optional_feature_log" >&2
  sqlite3 "$doctest_optional_feature_db" ".dump" >&2 || true
  record_blocker "sagelite-blocked: sage -t optional-feature smoke did not run the requested standalone needs feature."
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
  timeout "$node_import_timeout" \
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
      timeout "$electron_smoke_timeout" node sagelite-electron-smoke.cjs
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
