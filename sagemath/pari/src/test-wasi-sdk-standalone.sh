#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR GMP_DIST_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
gmp_dist_dir="$4"
jobs="${JOBS:-8}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../../core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "pari" wasi-sdk "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

standalone_ldlibs=(
  -lwasi-emulated-signal
)

runner="$(cowasm_clang_standalone_wasi_runner "$bin_dir")"
cat >"$probe_dir/run-wasi" <<EOF
#!/usr/bin/env bash
set -euo pipefail
program="\$1"
shift
if [ "\${program%.wasm}" = "\$program" ] && [ -f "\$program" ]; then
  ln -sf "\$(basename "\$program")" "\$(dirname "\$program")/\$(basename "\$program").wasm"
  program="\$program.wasm"
fi
exec "$runner" "\$program" "\$@"
EOF
chmod +x "$probe_dir/run-wasi"

cat >"$probe_dir/setjmp-probe.c" <<'EOF'
#include <setjmp.h>

static jmp_buf env;

int main(void) {
  if (setjmp(env) == 0) {
    longjmp(env, 1);
  }
  return 0;
}
EOF

sjlj_cflags="-Oz -fvisibility-main -mllvm -wasm-enable-sjlj"
setjmp_log="$probe_dir/setjmp-probe.log"
if ! env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -mllvm -wasm-enable-sjlj \
  "$probe_dir/setjmp-probe.c" \
  -o "$probe_dir/setjmp-probe" >"$setjmp_log" 2>&1; then
  if grep -E "Setjmp/longjmp support|__wasm_(setjmp|longjmp)" "$setjmp_log" >/dev/null; then
    echo "Skipping pari wasi-sdk standalone smoke: wasi-sdk setjmp support is not configured."
    cat "$setjmp_log"
    exit 77
  fi
  cowasm_clang_standalone_skip_if_unconfigured "pari" "$setjmp_log"
  cat "$setjmp_log"
  exit 1
fi

if ! "$probe_dir/run-wasi" "$probe_dir/setjmp-probe" >"$setjmp_log" 2>&1; then
  if grep -E "Exception|setjmp|longjmp|__wasm" "$setjmp_log" >/dev/null; then
    echo "Skipping pari wasi-sdk standalone smoke: WASI runner cannot execute wasi-sdk setjmp output."
    cat "$setjmp_log"
    exit 77
  fi
  cat "$setjmp_log"
  exit 1
fi

if [ ! -d "$gmp_dist_dir" ]; then
  echo "Skipping pari wasi-sdk standalone smoke: GMP wasi-sdk standalone install is not available."
  exit 77
fi
gmp_dist_dir="$(cd "$gmp_dist_dir" && pwd)"

cd "$build_dir"
CC="$bin_dir/cowasm-cc" \
AR="$bin_dir/cowasm-ar" \
RANLIB="$bin_dir/cowasm-ranlib" \
CFLAGS="$sjlj_cflags" \
LDFLAGS="-Oz -fvisibility-main ${standalone_ldlibs[*]}" \
RUNTEST="$probe_dir/run-wasi" \
COWASM_TOOLCHAIN=wasi-sdk \
  ./Configure \
    --static \
    --host=wasm-wasi \
    --prefix="$dist_dir" \
    --graphic=none \
    --with-gmp="$gmp_dist_dir"

# PARI's WASI configure path expects a few bits/ compatibility headers that
# Zig's sysroot supplies indirectly in the main wasm build.
cd "$build_dir"/O*
mkdir -p bits
printf '#define __jmp_buf int\n' >bits/setjmp.h
printf '\n' >bits/wordsize.h

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs" \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  DLCFLAGS= \
  gp
COWASM_TOOLCHAIN=wasi-sdk make \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  DLCFLAGS= \
  install

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/gp" </dev/null |
  grep "portable C/GMP"

printf '7*17*17\n\\q\n' |
  cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/gp" |
  grep 2023
