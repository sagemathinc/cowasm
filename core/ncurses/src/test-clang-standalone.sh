#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 5 ]; then
  echo "usage: test-clang-standalone.sh BUILD_DIR DIST_DIR BIN_DIR TERMCAP_DIST_DIR POSIX_WASM_DIR" >&2
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

cowasm_clang_standalone_probe "ncurses" "$bin_dir" "$probe_dir"

termcap_dist_dir="$(cd "$termcap_dist_dir" && pwd)"
posix_wasm_dir="$(cd "$posix_wasm_dir" && pwd)"

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

cd "$build_dir"

if ! grep -q '^#xterm-16color' misc/terminfo.src; then
  cd misc
  patch -p0 <"$script_dir/00-terminfo.patch"
  cd ..
fi

if ! head -n 1 ncurses/tty/lib_tstp.c | grep -q 'posix-wasm.h'; then
  printf '#include "posix-wasm.h"\n' | cat - ncurses/tty/lib_tstp.c >ncurses/tty/lib_tstp.c.tmp
  mv ncurses/tty/lib_tstp.c.tmp ncurses/tty/lib_tstp.c
fi
if ! head -n 1 progs/tset.c | grep -q 'posix-wasm.h'; then
  printf '#include "posix-wasm.h"\n' | cat - progs/tset.c >progs/tset.c.tmp
  mv progs/tset.c.tmp progs/tset.c
fi

RANLIB="$bin_dir/cowasm-ranlib" \
AR="$bin_dir/cowasm-ar" \
CC="$bin_dir/cowasm-cc" \
CXX="$bin_dir/cowasm-c++" \
CFLAGS="-Oz -fvisibility-main -I$termcap_dist_dir/include -L$termcap_dist_dir/lib -I$posix_wasm_dir" \
CXXFLAGS="-Oz -I$termcap_dist_dir/include -L$termcap_dist_dir/lib -I$posix_wasm_dir" \
COWASM_TOOLCHAIN=clang \
  ./configure \
    --without-ada \
    --without-manpages \
    --without-tests \
    --enable-termcap \
    --disable-stripping \
    --build="$(./config.guess)" \
    --host=none \
    --prefix="$dist_dir" \
    --with-build-cc="zig cc"

COWASM_TOOLCHAIN=clang make -j"$jobs"
COWASM_TOOLCHAIN=clang make install.libs

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

COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-cc" \
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

"$bin_dir/cowasm" "$probe_dir/ncurses-test"
