#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 6 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR TERMCAP_DIST_DIR NCURSES_DIST_DIR POSIX_WASM_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
termcap_dist_dir="$(cd "$4" && pwd)"
ncurses_dist_dir="$(cd "$5" && pwd)"
posix_wasm_dir="$(cd "$6" && pwd)"
jobs="${JOBS:-8}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "rogue" wasi-sdk "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

cd "$build_dir"

compat_dir="$build_dir/cowasm-wasi-sdk-compat"
mkdir -p "$compat_dir"
cat >"$compat_dir/rogue-wasi-sdk.h" <<'EOF'
#ifndef COWASM_ROGUE_WASI_SDK_H
#define COWASM_ROGUE_WASI_SDK_H

#include <stdio.h>
#include <sys/types.h>

struct passwd {
  char *pw_name;
  char *pw_dir;
  char *pw_shell;
};

static inline uid_t getuid(void) {
  return 1000;
}

static inline struct passwd *getpwuid(uid_t uid) {
  (void)uid;
  static struct passwd pw = {
    .pw_name = "cowasm",
    .pw_dir = "/",
    .pw_shell = "/bin/sh",
  };
  return &pw;
}

static inline int _getch(void) {
  return getchar();
}

#endif
EOF

perl -0pi -e 's/int main\(int argc, char \*\*argv, char \*\*envp\) \{/int main(int argc, char **argv) {\n  char **envp = NULL;/' main.c
perl -0pi -e 's/(\n\s*)if \(strncmp\(argv\[1\], "-", 1\) == 0\) \{/$1if (strcmp(argv[1], "-s") == 0) {\n$1  break;\n$1}\n$1if (strncmp(argv[1], "-", 1) == 0) {/g' main.c
perl -0pi -e 's/\n\s*ESCDELAY = 64;/\n  \/* ncurses terminfo is not installed for this standalone smoke. *\//g' mdport.c

RANLIB="$bin_dir/cowasm-ranlib" \
AR="$bin_dir/cowasm-ar" \
CC="$bin_dir/cowasm-cc" \
CXX="$bin_dir/cowasm-c++" \
CFLAGS="-Wall -Oz -Wno-deprecated-non-prototype -D_WASI_EMULATED_GETPID -include $compat_dir/rogue-wasi-sdk.h -I$compat_dir -I$termcap_dist_dir/include -I$ncurses_dist_dir/include -I$ncurses_dist_dir/include/ncurses -I$posix_wasm_dir" \
LDFLAGS="-L$ncurses_dist_dir/lib -lncurses -lwasi-emulated-getpid -lwasi-emulated-signal" \
COWASM_TOOLCHAIN=wasi-sdk \
  ./configure \
    --host=none \
    --build=arm \
    --prefix="$dist_dir"

{
  echo '#undef HAVE_WORKING_FORK'
  echo '#undef HAVE__SPAWNL'
  echo '#undef HAVE_SPAWNL'
  echo '#undef HAVE_GETPASS'
} >>config.h

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make install

score_output="$(cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/rogue" -s)"
printf '%s\n' "$score_output" | grep "Top Ten"
