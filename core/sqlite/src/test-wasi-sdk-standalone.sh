#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
jobs="${JOBS:-8}"
native_cc="${NATIVE_CC:-cc}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
compat_header="$build_dir/cowasm-sqlite-wasi-compat.h"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT
sqlite_wasi_cflags="-Oz -fvisibility-main -DSQLITE_DEFAULT_MMAP_SIZE=0 -DSQLITE_MAX_MMAP_SIZE=0 -DSQLITE_OMIT_WAL -DSQLITE_OMIT_LOAD_EXTENSION=1 -D_WASI_EMULATED_GETPID -include $compat_header"

cat >"$compat_header" <<'EOF'
#ifndef COWASM_SQLITE_WASI_COMPAT_H
#define COWASM_SQLITE_WASI_COMPAT_H

#include <sys/types.h>

#ifndef F_RDLCK
#define F_RDLCK 0
#endif
#ifndef F_WRLCK
#define F_WRLCK 1
#endif
#ifndef F_UNLCK
#define F_UNLCK 2
#endif
#ifndef F_GETLK
#define F_GETLK 36
#endif
#ifndef F_SETLK
#define F_SETLK 37
#endif

static inline int fchown(int fd, uid_t owner, gid_t group) {
  (void)fd;
  (void)owner;
  (void)group;
  return 0;
}

static inline uid_t geteuid(void) {
  return 1;
}

#endif
EOF

cat >"$probe_dir/probe.c" <<'EOF'
int main(int argc, char **argv) {
  return argc == 0 || argv == 0;
}
EOF

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  "$probe_dir/probe.c" -o "$probe_dir/probe.wasm"
env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -c "$probe_dir/probe.c" -o "$probe_dir/probe.o"
env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-ar" \
  rc "$probe_dir/libprobe.a" "$probe_dir/probe.o"
env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-ranlib" \
  "$probe_dir/libprobe.a"

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

cd "$build_dir"
CC="$bin_dir/cowasm-cc" \
BCC="$native_cc" \
AR="$bin_dir/cowasm-ar" \
RANLIB="$bin_dir/cowasm-ranlib" \
CFLAGS="$sqlite_wasi_cflags" \
LIBS="" \
ac_cv_header_zlib_h=no \
ac_cv_search_deflate=no \
COWASM_TOOLCHAIN=wasi-sdk \
  ./configure \
    --prefix="$dist_dir" \
    --host=none \
    --cache-file=config.site \
    --disable-load-extension \
    --disable-threadsafe \
    --disable-largefile \
    --disable-libtool-lock \
    --disable-tcl \
    --disable-shared \
    --enable-static \
    --disable-readline \
    --disable-math

COWASM_TOOLCHAIN=wasi-sdk make BCC="$native_cc" -j"$jobs" sqlite3.c sqlite3.h

COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  $sqlite_wasi_cflags \
  -D_HAVE_SQLITE_CONFIG_H \
  -DBUILD_sqlite \
  -I. \
  -c sqlite3.c \
  -o sqlite3.o

COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-ar" rc libsqlite3.a sqlite3.o
COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-ranlib" libsqlite3.a

mkdir -p "$dist_dir/lib" "$dist_dir/include"
cp libsqlite3.a "$dist_dir/lib/"
cp sqlite3.h sqlite3ext.h "$dist_dir/include/"

cat >"$probe_dir/sqlite-test.c" <<'EOF'
#include <sqlite3.h>
#include <string.h>

static int callback(void *data, int argc, char **argv, char **cols) {
  int *ok = (int *)data;
  (void)cols;
  if (argc == 1 && argv[0] != 0 && strcmp(argv[0], "1974953") == 0) {
    *ok = 1;
  }
  return 0;
}

int main(void) {
  sqlite3 *db = 0;
  char *errmsg = 0;
  int ok = 0;

  if (sqlite3_open(":memory:", &db) != SQLITE_OK) return 1;
  if (sqlite3_exec(db, "select 389*5077;", callback, &ok, &errmsg) != SQLITE_OK) {
    sqlite3_free(errmsg);
    sqlite3_close(db);
    return 1;
  }
  sqlite3_close(db);
  return ok ? 0 : 1;
}
EOF

COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -fvisibility-main \
  -I"$dist_dir/include" \
  -L"$dist_dir/lib" \
  "$probe_dir/sqlite-test.c" \
  -lsqlite3 \
  -lwasi-emulated-getpid \
  -o "$probe_dir/sqlite-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/sqlite-test"
