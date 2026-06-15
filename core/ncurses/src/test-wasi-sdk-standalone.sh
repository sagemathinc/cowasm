#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 5 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR TERMCAP_DIST_DIR POSIX_WASM_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
termcap_dist_dir="$4"
posix_wasm_dir="$5"
jobs="${JOBS:-8}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "ncurses" wasi-sdk "$bin_dir" "$probe_dir"

termcap_dist_dir="$(cd "$termcap_dist_dir" && pwd)"
posix_wasm_dir="$(cd "$posix_wasm_dir" && pwd)"
compat_dir="$probe_dir/compat"
mkdir -p "$compat_dir"
cat >"$compat_dir/sgtty.h" <<'EOF'
#ifndef COWASM_STANDALONE_COMPAT_SGTTY_H
#define COWASM_STANDALONE_COMPAT_SGTTY_H

struct sgttyb {
  char sg_ispeed;
  char sg_ospeed;
  char sg_erase;
  char sg_kill;
  int sg_flags;
};

#ifndef ECHO
#define ECHO 0x0008
#endif
#ifndef RAW
#define RAW 0x0020
#endif
#ifndef CBREAK
#define CBREAK 0x0002
#endif
#ifndef CRMOD
#define CRMOD 0x0010
#endif
#ifndef LCASE
#define LCASE 0x0004
#endif
#ifndef TANDEM
#define TANDEM 0x0001
#endif
#ifndef EVENP
#define EVENP 0x0080
#endif
#ifndef ODDP
#define ODDP 0x0040
#endif
#ifndef LLITOUT
#define LLITOUT 0x4000
#endif
#ifndef XTABS
#define XTABS 0x0006000
#endif
#ifndef TIOCFLUSH
#define TIOCFLUSH 0x541B
#endif

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
#define B28800 28800
#define B38400 38400
#define B57600 57600
#define B115200 115200

static inline int gtty(int fd, struct sgttyb *buf) {
  (void)fd;
  (void)buf;
  return -1;
}

static inline int stty(int fd, const struct sgttyb *buf) {
  (void)fd;
  (void)buf;
  return -1;
}

#endif
EOF

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

cd "$build_dir"

if ! grep -q '^#xterm-16color' misc/terminfo.src; then
  cd misc
  patch -p0 <"$script_dir/00-terminfo.patch"
  cd ..
fi

for source_file in ncurses/tty/lib_tstp.c progs/tset.c; do
  if head -n 1 "$source_file" | grep -q 'posix-wasm.h'; then
    tail -n +2 "$source_file" >"$source_file.tmp"
    mv "$source_file.tmp" "$source_file"
  fi
done

RANLIB="$bin_dir/cowasm-ranlib" \
AR="$bin_dir/cowasm-ar" \
CC="$bin_dir/cowasm-cc" \
CXX="$bin_dir/cowasm-c++" \
CFLAGS="-Oz -fvisibility-main -I$compat_dir -I$termcap_dist_dir/include -L$termcap_dist_dir/lib -I$posix_wasm_dir" \
CXXFLAGS="-Oz -I$compat_dir -I$termcap_dist_dir/include -L$termcap_dist_dir/lib -I$posix_wasm_dir" \
COWASM_TOOLCHAIN=wasi-sdk \
  ./configure \
    --without-ada \
    --without-manpages \
    --without-tests \
    --enable-termcap \
    --without-debug \
    --disable-stripping \
    --build="$(./config.guess)" \
    --host=none \
    --prefix="$dist_dir" \
    --with-build-cc="zig cc"

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs" libs
COWASM_TOOLCHAIN=wasi-sdk make install.libs

cd "$dist_dir/include"
ln -sf ncurses/curses.h .
cd "$build_dir"

cat >"$probe_dir/ncurses-test.c" <<'EOF'
#include <curses.h>
#include <string.h>

int main(void) {
  const char *version = curses_version();
  if (version == 0) return 1;
  if (strstr(version, "ncurses") == 0) return 2;
  if (OK != 0) return 3;
  if (ERR >= 0) return 4;
  return 0;
}
EOF

COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -fvisibility-main \
  -I"$dist_dir/include/ncurses" \
  -I"$dist_dir/include" \
  -I"$termcap_dist_dir/include" \
  -L"$dist_dir/lib" \
  -L"$termcap_dist_dir/lib" \
  "$probe_dir/ncurses-test.c" \
  -lncurses \
  -ltermcap \
  -o "$probe_dir/ncurses-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/ncurses-test"
