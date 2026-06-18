#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 6 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR GMP_DIR MPFR_DIR FLINT_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
gmp_dir="$(cd "$4" && pwd)"
mpfr_dir="$(cd "$5" && pwd)"
flint_dir="$(cd "$6" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "msolve" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

rm -rf "$dist_dir"

cat >"$probe_dir/msolve-wasi-stubs.c" <<'EOF'
#include <errno.h>
#include <time.h>

int mkstemp(char *template) {
  (void)template;
  errno = ENOSYS;
  return -1;
}

clock_t clock(void) {
  return (clock_t)0;
}
EOF

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -c "$probe_dir/msolve-wasi-stubs.c" \
  -o "$probe_dir/msolve-wasi-stubs.o"

base_libs="-lflint -lmpfr -lgmp -lm -lwasi-emulated-signal"
final_libs="$probe_dir/msolve-wasi-stubs.o $base_libs"

cd "$build_dir"
env \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  CC="$bin_dir/cowasm-cc" \
  CPPFLAGS="-I$gmp_dir/include -I$mpfr_dir/include -I$flint_dir/include" \
  CFLAGS="-Oz" \
  LDFLAGS="-L$flint_dir/lib -L$mpfr_dir/lib -L$gmp_dir/lib -lwasi-emulated-signal" \
  LIBS="$base_libs" \
  ac_cv_func_malloc_0_nonnull=yes \
  ac_cv_func_realloc_0_nonnull=yes \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --disable-shared \
      --enable-static \
      --disable-openmp

COWASM_TOOLCHAIN=wasi-sdk make -C src/usolve -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make -C src/fglm -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make -C src/neogb -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make -C src/msolve -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make msolve -j"$jobs" LIBS="$final_libs"
COWASM_TOOLCHAIN=wasi-sdk make install

test -x "$dist_dir/bin/msolve"
test -f "$dist_dir/lib/libmsolve.a"

cat >"$probe_dir/xy-qq.ms" <<'EOF'
x,y
0
x,
y
EOF

groebner_log="$probe_dir/xy-qq-groebner.out"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/msolve" \
  -g 2 -f "$probe_dir/xy-qq.ms" -o "$groebner_log"
grep -F "#field characteristic: 0" "$groebner_log"
grep -F "#length of basis:      2 elements sorted by increasing leading monomials" "$groebner_log"
grep -F "[y," "$groebner_log"
grep -F "x" "$groebner_log"

solve_log="$probe_dir/xy-qq-solve.out"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/msolve" \
  -f "$probe_dir/xy-qq.ms" -o "$solve_log"
grep -F "[0, [1," "$solve_log"
grep -F "[[[0, 0], [0, 0]]]" "$solve_log"

cat >"$probe_dir/finite-field.ms" <<'EOF'
x,y
31
x^2-1,
y-x
EOF

finite_field_groebner_log="$probe_dir/finite-field-groebner.out"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/msolve" \
  -g 2 -f "$probe_dir/finite-field.ms" -o "$finite_field_groebner_log"
grep -F "#field characteristic: 31" "$finite_field_groebner_log"
grep -F "#length of basis:      2 elements sorted by increasing leading monomials" "$finite_field_groebner_log"
grep -F "1*x^1+30*y^1" "$finite_field_groebner_log"
grep -F "1*y^2+30" "$finite_field_groebner_log"

finite_field_solve_log="$probe_dir/finite-field-solve.out"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/msolve" \
  -f "$probe_dir/finite-field.ms" -o "$finite_field_solve_log"
grep -F "[0, [31," "$finite_field_solve_log"
grep -F "['x', 'y']" "$finite_field_solve_log"
grep -F "[30, 0, 1]" "$finite_field_solve_log"
grep -F "[0, 30]" "$finite_field_solve_log"

echo "msolve-ok groebner real-solve finite-field"
