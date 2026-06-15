#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 7 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR TERMCAP_DIST_DIR NCURSES_DIST_DIR POSIX_WASM_DIR SRC_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
termcap_dist_dir="$(cd "$4" && pwd)"
ncurses_dist_dir="$(cd "$5" && pwd)"
posix_wasm_dir="$(cd "$6" && pwd)"
src_dir="$(cd "$7" && pwd)"
jobs="${JOBS:-8}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "less" wasi-sdk "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

cd "$build_dir"

chmod -R u+w .
compat_dir="$build_dir/cowasm-wasi-sdk-compat"
mkdir -p "$compat_dir"
cat >"$compat_dir/sgtty.h" <<'EOF'
#ifndef COWASM_WASI_SDK_COMPAT_SGTTY_H
#define COWASM_WASI_SDK_COMPAT_SGTTY_H

struct sgttyb {
  char sg_ispeed;
  char sg_ospeed;
  char sg_erase;
  char sg_kill;
  int sg_flags;
};

#define B0 0
#define B50 50
#define B75 75
#define B110 110
#define B134 134
#define B150 150
#define B200 200
#define B300 300
#define B600 600
#define B1200 1200
#define B1800 1800
#define B2400 2400
#define B4800 4800
#define B9600 9600
#define B19200 19200
#define B38400 38400
#define B57600 57600
#define B115200 115200

#ifndef ECHO
#define ECHO 0x0008
#endif
#ifndef CBREAK
#define CBREAK 0x0002
#endif
#ifndef XTABS
#define XTABS 0x0006000
#endif

#endif
EOF
cat >"$compat_dir/setjmp.h" <<'EOF'
#ifndef COWASM_WASI_SDK_COMPAT_SETJMP_H
#define COWASM_WASI_SDK_COMPAT_SETJMP_H

typedef int jmp_buf[1];

#define setjmp(env) 0
#define longjmp(env, value) __builtin_trap()

#endif
EOF
cat >"$compat_dir/signal.h" <<'EOF'
#ifndef COWASM_WASI_SDK_COMPAT_SIGNAL_H
#define COWASM_WASI_SDK_COMPAT_SIGNAL_H

#include_next <signal.h>

#undef SIG_IGN
#define SIG_IGN ((void (*)(int))1)

typedef void (*cowasm_signal_handler_t)(int);

static inline cowasm_signal_handler_t cowasm_signal(int sig, cowasm_signal_handler_t func) {
  (void)sig;
  return func;
}

static inline int kill(int pid, int sig) {
  (void)pid;
  (void)sig;
  return 0;
}

#define signal(sig, func) cowasm_signal((sig), (func))
#define getpid() 1

#endif
EOF

mkdir -p bits
printf 'typedef int __jmp_buf;\n' >bits/setjmp.h

if ! grep -q '^#undef SIGWINCH' position.h; then
  printf '#undef SIGWINCH\n#undef SIGWIND\n' >>position.h
fi

if ! grep -q 'OPT_ON, &know_dumb' opttbl.c; then
  patch -p2 <"$src_dir/patches/01-disable-dumb-error.patch"
fi

RANLIB="$bin_dir/cowasm-ranlib" \
AR="$bin_dir/cowasm-ar" \
CC="$bin_dir/cowasm-cc" \
CXX="$bin_dir/cowasm-c++" \
CFLAGS="-fvisibility-main -Oz -Wno-deprecated-non-prototype -Dpclose=fclose -I$compat_dir -I$termcap_dist_dir/include -I$ncurses_dist_dir/include -I$posix_wasm_dir" \
LDFLAGS="-L$termcap_dist_dir/lib -ltermcap -L$ncurses_dist_dir/lib -lncurses" \
COWASM_TOOLCHAIN=wasi-sdk \
  ./configure \
    --host=none \
    --prefix="$dist_dir"

{
  echo "#undef SHELL_ESCAPE"
  echo "#define SHELL_ESCAPE 0"
  echo "#undef EDITOR"
  echo "#define EDITOR 0"
  echo "#undef HAVE_POPEN"
  echo "#undef HAVE_TTYNAME"
  echo "#undef HAVE__SETJMP"
  echo "#undef HAVE_SIGSETMASK"
} >>defines.h
touch stamp-h

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make install

help_output="$(cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/less" --help || true)"
printf '%s\n' "$help_output" | grep "Commands"
