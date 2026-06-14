#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: test-clang-standalone.sh BUILD_DIR DIST_DIR BIN_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
jobs="${JOBS:-8}"
native_cc="${NATIVE_CC:-cc}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_clang_standalone_probe "sqlite" "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

cd "$build_dir"
CC="$bin_dir/cowasm-cc" \
BCC="$native_cc" \
AR="$bin_dir/cowasm-ar" \
RANLIB="$bin_dir/cowasm-ranlib" \
CFLAGS="-Oz -fvisibility-main -DSQLITE_DEFAULT_MMAP_SIZE=0" \
LIBS="" \
ac_cv_header_zlib_h=no \
ac_cv_search_deflate=no \
COWASM_TOOLCHAIN=clang \
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

COWASM_TOOLCHAIN=clang make BCC="$native_cc" -j"$jobs" sqlite3.c sqlite3.h

COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-cc" \
  -Oz \
  -D_HAVE_SQLITE_CONFIG_H \
  -DBUILD_sqlite \
  -DSQLITE_DEFAULT_MMAP_SIZE=0 \
  -I. \
  -c sqlite3.c \
  -o sqlite3.o

COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-ar" rc libsqlite3.a sqlite3.o
COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-ranlib" libsqlite3.a

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

COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-cc" \
  -fvisibility-main \
  -I"$dist_dir/include" \
  -L"$dist_dir/lib" \
  "$probe_dir/sqlite-test.c" \
  -lsqlite3 \
  -o "$probe_dir/sqlite-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/sqlite-test"
