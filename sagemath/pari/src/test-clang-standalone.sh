#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: test-clang-standalone.sh BUILD_DIR DIST_DIR BIN_DIR GMP_DIST_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
gmp_dist_dir="$4"
jobs="${JOBS:-8}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_clang_standalone_probe "pari" "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

standalone_ldlibs=(
  -lsetjmp
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

sjlj_cflags="-Oz -fvisibility-main -mllvm -wasm-enable-sjlj -mllvm -wasm-use-legacy-eh=false"
sjlj_ldflags="$sjlj_cflags ${standalone_ldlibs[*]}"
setjmp_log="$probe_dir/setjmp-probe.log"
if ! env COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-cc" \
  $sjlj_cflags \
  "$probe_dir/setjmp-probe.c" \
  -lsetjmp \
  -o "$probe_dir/setjmp-probe" >"$setjmp_log" 2>&1; then
  if grep -E "Setjmp/longjmp support|__wasm_(setjmp|longjmp)" "$setjmp_log" >/dev/null; then
    echo "Skipping pari clang standalone smoke: direct clang/lld WASI setjmp support is not configured."
    cat "$setjmp_log"
    exit 77
  fi
  cat "$setjmp_log"
  exit 1
fi

if ! "$probe_dir/run-wasi" "$probe_dir/setjmp-probe" >"$setjmp_log" 2>&1; then
  if grep -E "Exception|setjmp|longjmp|__wasm" "$setjmp_log" >/dev/null; then
    echo "Skipping pari clang standalone smoke: WASI runner cannot execute clang setjmp output."
    cat "$setjmp_log"
    exit 77
  fi
  cat "$setjmp_log"
  exit 1
fi

if [ ! -d "$gmp_dist_dir" ]; then
  echo "Skipping pari clang standalone smoke: GMP clang standalone install is not available."
  exit 77
fi
gmp_dist_dir="$(cd "$gmp_dist_dir" && pwd)"

cd "$build_dir"
CC="$bin_dir/cowasm-cc" \
AR="$bin_dir/cowasm-ar" \
RANLIB="$bin_dir/cowasm-ranlib" \
CFLAGS="$sjlj_cflags" \
LDFLAGS="$sjlj_ldflags" \
RUNTEST="$probe_dir/run-wasi" \
COWASM_TOOLCHAIN=clang \
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
printf 'typedef unsigned long __jmp_buf[8];\n' >bits/setjmp.h
printf '\n' >bits/wordsize.h
cat >pwd.h <<'EOF'
#ifndef COWASM_PARI_CLANG_PWD_H
#define COWASM_PARI_CLANG_PWD_H
#include <sys/types.h>

struct passwd {
  char *pw_name;
  uid_t pw_uid;
  gid_t pw_gid;
  char *pw_dir;
  char *pw_shell;
};

static inline uid_t getuid(void) { return 0; }
static inline uid_t geteuid(void) { return 0; }
static inline struct passwd *getpwuid(uid_t uid) {
  (void)uid;
  return 0;
}
static inline struct passwd *getpwnam(const char *name) {
  (void)name;
  return 0;
}

#endif
EOF
cat >time.h <<'EOF'
#ifndef COWASM_PARI_CLANG_TIME_H
#define COWASM_PARI_CLANG_TIME_H
#include_next <time.h>

#undef clock
#define clock() ((clock_t)0)

#endif
EOF

COWASM_TOOLCHAIN=clang make -j"$jobs" \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  DLCFLAGS= \
  gp
COWASM_TOOLCHAIN=clang make \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  DLCFLAGS= \
  install

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/gp" </dev/null |
  grep "portable C/GMP"

printf '7*17*17\n\\q\n' |
  cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/gp" |
  grep 2023
