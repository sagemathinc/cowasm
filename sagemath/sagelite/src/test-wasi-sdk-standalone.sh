#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 18 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR CPYTHON_WASM PY_CYTHON PY_NUMPY PY_GMPY2 PY_JINJA2 PY_MESON PY_NINJA PY_PLATFORMDIRS PYTHON_WASM PRIMECOUNTPY_WASI_SDK CYSIGNALS_WASI_SDK MEMORY_ALLOCATOR_WASI_SDK POSIX_WASI_SDK LIBCXX_WASI_SDK CYPARI2_WASI_SDK" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
cpython_wasm="$(cd "$4" && pwd)"
py_cython="$(cd "$5" && pwd)"
py_numpy="$(cd "$6" && pwd)"
py_gmpy2="$(cd "$7" && pwd)"
py_jinja2="$(cd "$8" && pwd)"
py_meson="$(cd "$9" && pwd)"
py_ninja="$(cd "${10}" && pwd)"
py_platformdirs="$(cd "${11}" && pwd)"
python_wasm="$(cd "${12}" && pwd)"
primecountpy_wasi_sdk="$(cd "${13}" && pwd)"
cysignals_wasi_sdk="$(cd "${14}" && pwd)"
memory_allocator_wasi_sdk="$(cd "${15}" && pwd)"
posix_wasi_sdk="$(cd "${16}" && pwd)"
libcxx_wasi_sdk="$(cd "${17}" && pwd)"
cypari2_wasi_sdk="$(cd "${18}" && pwd)"
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
followups_file="$dist_dir/followups.txt"
side_module_audit_log="$dist_dir/side-module-audit.log"
node_import_timeout="${SAGELITE_NODE_IMPORT_TIMEOUT:-180s}"
electron_smoke_timeout="${SAGELITE_ELECTRON_SMOKE_TIMEOUT:-180s}"

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
  "$primecountpy_wasi_sdk"
  "$cysignals_wasi_sdk"
  "$memory_allocator_wasi_sdk"
  "$py_jinja2"
  "$py_platformdirs"
  "$py_gmpy2"
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
c_args = ['-target', 'wasm32-wasip1', '-fPIC', '-D_WASI_EMULATED_SIGNAL', '-include', '$src_dir/cowasm-fenv-compat.h', '-I$cpython_wasm/include/python3.14', '-I$posix_wasi_sdk', '-I$pari_wasi_sdk/include', '-I$boost_cropped_wasi_sdk/include', '-I$gsl_wasi_sdk/include', '-I$mpfr_wasi_sdk/include', '-I$mpfi_wasi_sdk/include', '-I$ntl_wasi_sdk/include', '-I$m4ri_wasi_sdk/include', '-I$m4rie_wasi_sdk/include']
cpp_args = ['-target', 'wasm32-wasip1', '-fPIC', '-D_WASI_EMULATED_SIGNAL', '-include', '$src_dir/cowasm-fenv-compat.h', '-I$cpython_wasm/include/python3.14', '-I$posix_wasi_sdk', '-I$pari_wasi_sdk/include', '-I$boost_cropped_wasi_sdk/include', '-I$gsl_wasi_sdk/include', '-I$mpfr_wasi_sdk/include', '-I$mpfi_wasi_sdk/include', '-I$ntl_wasi_sdk/include', '-I$m4ri_wasi_sdk/include', '-I$m4rie_wasi_sdk/include']
c_link_args = ['-target', 'wasm32-wasip1', '-shared', '-nostdlib', '-Wl,--allow-undefined', '-Wl,--no-entry', '-L$pari_wasi_sdk/lib', '-L$gmp_wasi_sdk/lib']
cpp_link_args = ['-target', 'wasm32-wasip1', '-shared', '-nostdlib', '-Wl,--allow-undefined', '-Wl,--no-entry', '-L$pari_wasi_sdk/lib', '-L$gmp_wasi_sdk/lib']

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
node_import_index=0

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

run_node_import "import sage" "import sage; print('sagelite-node-ok import sage')"
run_node_import "import sage.env" "import sage.env; print(sage.env.SAGE_VERSION)"
run_node_import "import sage.structure.element" "import sage.structure.element; print('sagelite-node-ok import sage.structure.element')"
run_node_import "integer arithmetic" "from sage.rings.integer_ring import ZZ; print(ZZ(2) + ZZ(3))"
run_node_import "rational arithmetic" "from sage.rings.rational_field import QQ; print(QQ(2) / QQ(5) + QQ(1) / QQ(5))"
run_node_import "import sage.all" "import sage.all; print('sagelite-node-ok import sage.all')"
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
B = matrix(QQ, [[1, 2], [3, 5]])
assert B.det() == QQ(-1)
assert B.inverse() * B == matrix(QQ, [[1, 0], [0, 1]])
C = matrix(ZZ, [[2, 1], [1, 2]])
assert C.trace() == ZZ(4)
assert C.charpoly()(C) == matrix(ZZ, [[0, 0], [0, 0]])
I = identity_matrix(QQ, 3)
assert I.det() == QQ(1)
print('sagelite-node-ok linear algebra smoke')"
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
run_node_import "combinatorics smoke" "import sage.all
from sage.combinat.combination import Combinations
from sage.combinat.integer_vector import IntegerVectors
from sage.combinat.partition import Partition
from sage.combinat.permutation import Permutation
from sage.combinat.subset import Subsets
p = Partition([4, 2, 1])
assert p.conjugate() == Partition([3, 2, 1, 1])
assert p.size() == 7
sigma = Permutation([3, 1, 2])
assert sigma.inverse() == Permutation([2, 3, 1])
assert sigma.to_cycles() == [(1, 3, 2)]
assert [sorted(s) for s in Subsets([1, 2, 3], 2)] == [[1, 2], [1, 3], [2, 3]]
assert Combinations([1, 2, 3], 2).list() == [[1, 2], [1, 3], [2, 3]]
assert [list(v) for v in IntegerVectors(4, 2)] == [[4, 0], [3, 1], [2, 2], [1, 3], [0, 4]]
print('sagelite-node-ok combinatorics smoke')"
run_node_import "modular arithmetic smoke" "from sage.all import ZZ, Integers, GF
I = ZZ.ideal(7)
assert I.gen() == ZZ(7)
Z7 = Integers(7)
assert Z7(3) + Z7(5) == Z7(1)
F7 = GF(7)
assert F7(3) * F7(5) == F7(1)
print('sagelite-node-ok modular arithmetic smoke')"
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

run_node_import "cypari2 PARI runtime smoke" "from cypari2 import Pari, objtogen
from cypari2 import _pari_runtime_probe as pari_probe
assert pari_probe.eval_long('2+3') == 5
assert pari_probe.eval_long('primepi(10000)') == 1229
assert pari_probe.eval_long('factorback(factor(360))') == 360
assert pari_probe.eval_long('znorder(Mod(2,101))') == 100
assert pari_probe.eval_long('polisirreducible(x^2+1)') == 1
assert pari_probe.eval_long('ellcard(ellinit([0,-1]), 5)') == 6
assert pari_probe.check_error_recovery() == 'caught=e_INV recovered=221'
pari = Pari()
assert str(pari('2+3')) == '5'
assert str(pari('primepi(10^6)')) == '78498'
assert str(pari('factorback(factor(360))')) == '360'
assert str(pari('znorder(Mod(2,101))')) == '100'
assert str(pari('polisirreducible(x^2+1)')) == '1'
assert str(pari('ellcard(ellinit([0,-1]), 5)')) == '6'
for label, thunk in [
    ('non-string Pari input', lambda: pari(5)),
    ('Gen conversion', lambda: objtogen('2+3')),
]:
    try:
        thunk()
    except NotImplementedError as err:
        assert 'full Gen conversion' in str(err)
    else:
        raise AssertionError(f'{label} should fail closed on WASI')
print('sagelite-node-ok cypari2 PARI runtime smoke')"

: >"$followups_file"
run_node_import \
  "initialized FLINT fmpz_poly_sage helper import" \
  "from sage.rings.integer_ring import ZZ
from sage.rings.rational_field import QQ
print('sagelite-node-start initialized FLINT fmpz_poly_sage helper import')
import sage.libs.flint.fmpz_poly_sage
print('sagelite-node-ok initialized FLINT fmpz_poly_sage helper import')"

electron_resources_dir="$dist_dir/electron-resources"
electron_bundle_log="$dist_dir/electron-bundle.log"
electron_manifest_schema_version=44
electron_manifest_resource_kind="cowasm-sagelite-electron-resources"
electron_manifest_python_abi="cpython-314-wasm32-wasi"
electron_manifest_python_platform="wasi"
electron_manifest_smoke_contract="exact-arithmetic-matrix-free-module-enumerated-combinat-cypari2-pari-arithmetic-v10"
electron_manifest_source_revision_file="$build_dir/.cowasm-sagelite-source-revision"
if [ ! -s "$electron_manifest_source_revision_file" ]; then
  record_blocker "sagelite-blocked: Sagelite source revision metadata is missing."
fi
electron_manifest_source_revision="$(tr -d '[:space:]' <"$electron_manifest_source_revision_file")"
if ! printf '%s\n' "$electron_manifest_source_revision" |
    grep -Eq '^[0-9a-f]{40}$'; then
  record_blocker "sagelite-blocked: Sagelite source revision metadata is not a full git commit hash."
fi
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
  primecountpy
  libcxx
  cysignals
  memory_allocator
  jinja2
  platformdirs
  gmpy2
  numpy
  cython
)
runtime_dep_paths=(
  "$cypari2_wasi_sdk"
  "$primecountpy_wasi_sdk"
  "$libcxx_wasi_sdk"
  "$cysignals_wasi_sdk"
  "$memory_allocator_wasi_sdk"
  "$py_jinja2"
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
  "site-packages/sage/arith/__init__.py"
  "site-packages/sage/arith/all.py"
  "site-packages/sage/arith/functions.cpython-314-wasm32-wasi.so"
  "site-packages/sage/arith/misc.py"
  "site-packages/sage/arith/power.cpython-314-wasm32-wasi.so"
  "site-packages/sage/arith/rational_reconstruction.cpython-314-wasm32-wasi.so"
  "site-packages/sage/arith/srange.cpython-314-wasm32-wasi.so"
  "site-packages/sage/misc/__init__.py"
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
  "site-packages/sage/categories/commutative_algebras.py"
  "site-packages/sage/categories/finite_dimensional_algebras_with_basis.py"
  "site-packages/sage/categories/finite_dimensional_modules_with_basis.py"
  "site-packages/sage/categories/modules.py"
  "site-packages/sage/categories/modules_with_basis.py"
  "site-packages/sage/structure/__init__.py"
  "site-packages/sage/structure/category_object.cpython-314-wasm32-wasi.so"
  "site-packages/sage/structure/element.cpython-314-wasm32-wasi.so"
  "site-packages/sage/structure/coerce.cpython-314-wasm32-wasi.so"
  "site-packages/sage/structure/parent.cpython-314-wasm32-wasi.so"
  "site-packages/sage/structure/parent_old.cpython-314-wasm32-wasi.so"
  "site-packages/sage/structure/sequence.py"
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
  "site-packages/sage/rings/quotient_ring.py"
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
  "site-packages/sage/rings/polynomial/polynomial_element.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/polynomial/polynomial_element_generic.py"
  "site-packages/sage/rings/polynomial/polynomial_integer_dense_flint.py"
  "site-packages/sage/rings/polynomial/polynomial_ring.py"
  "site-packages/sage/rings/polynomial/polynomial_ring_constructor.py"
  "site-packages/sage/rings/polynomial/polynomial_rational_flint.py"
  "site-packages/sage/rings/polynomial/polynomial_zmod_flint.py"
  "site-packages/sage/libs/__init__.py"
  "site-packages/sage/libs/flint/__init__.py"
  "site-packages/sage/libs/flint/flint_sage.cpython-314-wasm32-wasi.so"
  "site-packages/sage/libs/flint/fmpz_poly.cpython-314-wasm32-wasi.so"
  "site-packages/sage/libs/flint/fmpz_poly_sage.cpython-314-wasm32-wasi.so"
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
  "site-packages/sage/combinat/SJT.py"
  "site-packages/sage/combinat/__init__.py"
  "site-packages/sage/combinat/backtrack.py"
  "site-packages/sage/combinat/combinat.py"
  "site-packages/sage/combinat/combinat_cython.cpython-314-wasm32-wasi.so"
  "site-packages/sage/combinat/combination.py"
  "site-packages/sage/combinat/combinatorial_map.py"
  "site-packages/sage/combinat/composition.py"
  "site-packages/sage/combinat/integer_lists/__init__.py"
  "site-packages/sage/combinat/integer_lists/base.cpython-314-wasm32-wasi.so"
  "site-packages/sage/combinat/integer_lists/invlex.cpython-314-wasm32-wasi.so"
  "site-packages/sage/combinat/integer_lists/lists.py"
  "site-packages/sage/combinat/integer_vector.py"
  "site-packages/sage/combinat/integer_vector_weighted.py"
  "site-packages/sage/combinat/partition.py"
  "site-packages/sage/combinat/partition_tuple.py"
  "site-packages/sage/combinat/partitions.cpython-314-wasm32-wasi.so"
  "site-packages/sage/combinat/permutation.py"
  "site-packages/sage/combinat/permutation_cython.cpython-314-wasm32-wasi.so"
  "site-packages/sage/combinat/subset.py"
  "site-packages/sage/combinat/tableau.py"
  "site-packages/sage/combinat/tools.py"
  "site-packages/sage/sets/__init__.py"
  "site-packages/sage/sets/disjoint_union_enumerated_sets.py"
  "site-packages/sage/sets/family.cpython-314-wasm32-wasi.so"
  "site-packages/sage/sets/finite_enumerated_set.py"
  "site-packages/sage/sets/integer_range.py"
  "site-packages/sage/sets/non_negative_integers.py"
  "site-packages/sage/sets/positive_integers.py"
  "site-packages/sage/sets/pythonclass.cpython-314-wasm32-wasi.so"
  "site-packages/sage/sets/recursively_enumerated_set.cpython-314-wasm32-wasi.so"
  "site-packages/sage/sets/set.py"
  "deps/cypari2/cypari2/__init__.py"
  "deps/cypari2/cypari2/_pari_cython_probe.cpython-314-wasm32-wasi.so"
  "deps/cypari2/cypari2/_pari_runtime_probe.cpython-314-wasm32-wasi.so"
  "deps/cypari2/cypari2/gen.cpython-314-wasm32-wasi.so"
  "deps/cypari2/cypari2/handle_error.py"
  "deps/cypari2/cypari2/pari_instance.py"
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

for required_path in "${electron_required_paths[@]}"; do
  if [ ! -e "$electron_resources_dir/$required_path" ]; then
    record_blocker "sagelite-blocked: Electron resources are missing required path $required_path."
  fi
done

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

{
  printf '{\n'
  printf '  "schemaVersion": %s,\n' "$electron_manifest_schema_version"
  printf '  "resourceKind": "%s",\n' "$electron_manifest_resource_kind"
  printf '  "pythonAbi": "%s",\n' "$electron_manifest_python_abi"
  printf '  "pythonPlatform": "%s",\n' "$electron_manifest_python_platform"
  printf '  "smokeContract": "%s",\n' "$electron_manifest_smoke_contract"
  printf '  "sageliteSourceRevision": "%s",\n' "$electron_manifest_source_revision"
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
