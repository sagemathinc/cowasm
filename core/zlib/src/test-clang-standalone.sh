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

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

skip_pattern="requires '(clang|wasm-ld|llvm-ar|llvm-ranlib)'|requires a WASI sysroot|not an executable file|not a directory|not a file|WASI startup object not found"

skip_if_toolchain_unconfigured() {
  local log="$1"
  if grep -E "$skip_pattern" "$log" >/dev/null; then
    echo "Skipping zlib clang standalone smoke: direct clang/lld WASI toolchain is not configured."
    cat "$log"
    exit 77
  fi
}

cat >"$probe_dir/probe.c" <<'EOF'
int main(int argc, char **argv) {
  return argc == 0 || argv == 0;
}
EOF

probe_log="$probe_dir/probe.log"
if ! COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-cc" \
  "$probe_dir/probe.c" -o "$probe_dir/probe.wasm" >"$probe_log" 2>&1; then
  skip_if_toolchain_unconfigured "$probe_log"
  cat "$probe_log"
  exit 1
fi

archive_log="$probe_dir/archive.log"
COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-cc" \
  -c "$probe_dir/probe.c" -o "$probe_dir/probe.o" >"$archive_log" 2>&1 || {
  skip_if_toolchain_unconfigured "$archive_log"
  cat "$archive_log"
  exit 1
}
COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-ar" \
  rc "$probe_dir/libprobe.a" "$probe_dir/probe.o" >>"$archive_log" 2>&1 || {
  skip_if_toolchain_unconfigured "$archive_log"
  cat "$archive_log"
  exit 1
}
COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-ranlib" \
  "$probe_dir/libprobe.a" >>"$archive_log" 2>&1 || {
  skip_if_toolchain_unconfigured "$archive_log"
  cat "$archive_log"
  exit 1
}

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

cd "$build_dir"
CHOST=none \
AR="$bin_dir/cowasm-ar" \
RANLIB="$bin_dir/cowasm-ranlib" \
CC="$bin_dir/cowasm-cc" \
CFLAGS="-Oz -fvisibility-main" \
COWASM_TOOLCHAIN=clang \
  ./configure --static --prefix="$dist_dir"

COWASM_TOOLCHAIN=clang make -j"$jobs" install

# Keep parity with the default zlib wasm build, which rebuilds the archive from
# object files because upstream's generated archive is malformed for wasm tools.
rm -f libz.a
COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-ar" rc libz.a *.o
cp libz.a "$dist_dir/lib"

COWASM_TOOLCHAIN=clang make example
"$bin_dir/cowasm" ./example
