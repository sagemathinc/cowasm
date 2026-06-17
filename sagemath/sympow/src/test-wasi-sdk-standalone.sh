#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "sympow" wasi-sdk "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir/bin" "$dist_dir/share/sympow/datafiles" "$dist_dir/lib/sympow"

cat >"$build_dir/config.h" <<'EOF'
#define PREFIX "/"
#define VARPREFIX "/tmp"
#define VERSION "2.023.6"
#define RM "rm"
#define GREP "grep"
#define GP "gp"
#define SED "sed"
#define SH "/bin/sh"
#define ENDIANTUPLE "le32"
#ifdef __wasi__
#define getuid() 0
#define getgid() 0
#define chown(path, uid, gid) 0
#define umask(mask) 0
#define execlp(...) (-1)
#endif
EOF

sources=(
  fpu.c
  analrank.c
  analytic.c
  compute.c
  compute2.c
  help.c
  conductors.c
  disk.c
  ec_ap.c
  ec_ap_bsgs.c
  ec_ap_large.c
  eulerfactors.c
  factor.c
  generate.c
  init_curve.c
  main.c
  moddeg.c
  periods.c
  prepare.c
  QD.c
  rootno.c
  util.c
)

(
  cd "$build_dir"
  rm -f ./*.o sympow
  env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
    -O3 \
    -std=gnu17 \
    -c \
    "${sources[@]}"
  env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
    -fvisibility-main \
    -O3 \
    -std=gnu17 \
    -o sympow \
    ./*.o \
    -lwasi-emulated-signal \
    -lwasi-emulated-process-clocks
)

cp "$build_dir/sympow" "$dist_dir/bin/"
cp "$build_dir/new_data" "$dist_dir/lib/sympow/"
cp "$build_dir"/standard*.gp "$dist_dir/share/sympow/"
touch "$dist_dir/share/sympow/datafiles/param_data"

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/sympow" \
  -dump-versiontuple |
  grep -F "2.023.6"

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/sympow" \
  -dump-endiantuple |
  grep -F "le32"

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/sympow" \
  -quiet -info 2 11 -curve "[1,2,3,4,5]" |
  grep -F "Euler factor at 2 is 1-45*x+2070*x^2"

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/sympow" \
  -quiet -rootno 2 -curve "[1,2,3,4,5]" |
  grep -F "Root number for sp:2 is 1"

echo "sympow-ok version endian local-info rootno"
