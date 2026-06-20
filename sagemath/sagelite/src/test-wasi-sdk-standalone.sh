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
    node "$python_wasm/bin/python-wasm" -c "$wrapped_code" >>"$node_import_log" 2>&1
  local import_status=$?
  set -e
  if [ "$import_status" -ne 0 ]; then
    tail -120 "$node_import_log" >&2
    record_blocker "sagelite-blocked: Node.js python-wasm import failed at $label; see $node_import_log for the first runtime blocker."
  fi
  if ! grep -Fqx "$marker" "$node_import_log"; then
    printf '## %s verbose import trace after missing marker\n' "$label" >>"$node_import_log"
    set +e
    PYTHONPATH="$node_pythonpath" \
      node "$python_wasm/bin/python-wasm" -v -c "$wrapped_code" >>"$node_import_log" 2>&1
    set -e
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

run_node_import "cypari2 runtime fails closed" "from cypari2 import Pari
pari = Pari()
try:
    pari('primepi(10^6)')
except NotImplementedError as err:
    assert 'compiled PARI runtime is not ported yet' in str(err)
else:
    raise AssertionError('cypari2 PARI runtime should fail closed on WASI')
print('sagelite-node-ok cypari2 runtime fails closed')"

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
electron_manifest_schema_version=15
electron_manifest_resource_kind="cowasm-sagelite-electron-resources"
electron_manifest_python_abi="cpython-314-wasm32-wasi"
electron_manifest_python_platform="wasi"
electron_manifest_smoke_contract="exact-arithmetic-matrix-cypari2-failclosed-v3"
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
  "site-packages/sage/all.py"
  "python.wasm"
  "site-packages/sage/env.py"
  "site-packages/sage/structure/element.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/integer.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/integer_ring.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/rational.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/finite_rings/integer_mod.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/polynomial/polynomial_element.cpython-314-wasm32-wasi.so"
  "site-packages/sage/rings/polynomial/polynomial_element_generic.py"
  "site-packages/sage/rings/polynomial/polynomial_ring.py"
  "site-packages/sage/rings/polynomial/polynomial_ring_constructor.py"
  "site-packages/sage/libs/flint/fmpz_poly_sage.cpython-314-wasm32-wasi.so"
  "site-packages/sage/matrix/constructor.cpython-314-wasm32-wasi.so"
  "deps/cypari2/cypari2/__init__.py"
  "deps/cypari2/cypari2/gen.cpython-314-wasm32-wasi.so"
  "deps/cypari2/cypari2/pari_instance.py"
  "deps/primecountpy/primecountpy/primecount.cpython-314-wasm32-wasi.so"
  "deps/libcxx/libcxx.so"
  "deps/primecountpy/primecountpy/libcxx.so"
  "deps/cysignals/cysignals/signals.cpython-314-wasm32-wasi.so"
  "deps/memory_allocator/memory_allocator/memory_allocator.cpython-314-wasm32-wasi.so"
  "deps/gmpy2/gmpy2/gmpy2.cpython-314-wasm32-wasi.so"
  "deps/numpy/numpy/__init__.pyc"
  "deps/numpy/numpy/core/_multiarray_umath.cpython-314-wasm32-wasi.so"
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
      node sagelite-electron-smoke.cjs
  ) >>"$electron_bundle_log" 2>&1
  local electron_bundle_status=$?
  set -e
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
