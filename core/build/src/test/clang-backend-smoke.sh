#!/usr/bin/env bash
set -euo pipefail

wrapper="${1:?usage: clang-backend-smoke.sh /path/to/cowasm-cc}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mkdir -p "$tmp/sysroot/lib/wasm32-wasi"
touch "$tmp/sysroot/lib/wasm32-wasi/crt1.o"
touch "$tmp/sysroot/lib/wasm32-wasi/libc.a"
touch "$tmp/libclang_rt.builtins-wasm32.a"

cat >"$tmp/clang" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

if [[ " $* " == *" -print-libgcc-file-name "* ]]; then
  echo "$COWASM_FAKE_BUILTINS"
  exit 0
fi

printf 'clang' >>"$COWASM_TEST_LOG"
printf ' %q' "$@" >>"$COWASM_TEST_LOG"
printf '\n' >>"$COWASM_TEST_LOG"

out=""
prev=""
for arg in "$@"; do
  if [[ "$prev" == "-o" ]]; then
    out="$arg"
  fi
  prev="$arg"
done

if [[ -n "$out" ]]; then
  touch "$out"
fi
EOF
chmod +x "$tmp/clang"

cat >"$tmp/wasm-ld" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

printf 'wasm-ld' >>"$COWASM_TEST_LOG"
printf ' %q' "$@" >>"$COWASM_TEST_LOG"
printf '\n' >>"$COWASM_TEST_LOG"

out=""
prev=""
for arg in "$@"; do
  if [[ "$prev" == "-o" ]]; then
    out="$arg"
  fi
  prev="$arg"
done

if [[ -n "$out" ]]; then
  touch "$out"
fi
EOF
chmod +x "$tmp/wasm-ld"

cat >"$tmp/hello.c" <<'EOF'
#include <stdio.h>

int main(int argc, char **argv) {
  printf("hello %d\n", argc);
  return argv[0] == 0;
}
EOF

export COWASM_TOOLCHAIN=clang
export COWASM_CLANG="$tmp/clang"
export COWASM_WASM_LD="$tmp/wasm-ld"
export COWASM_WASI_SYSROOT="$tmp/sysroot"
export COWASM_COMPILER_RT="$tmp/libclang_rt.builtins-wasm32.a"
export COWASM_FAKE_BUILTINS="$tmp/libclang_rt.builtins-wasm32.a"
export COWASM_TEST_LOG="$tmp/tool.log"

"$wrapper" -Oz -fvisibility-main "$tmp/hello.c" -o "$tmp/hello.wasm"
test -f "$tmp/hello.wasm"

grep -F -- "--target=wasm32-wasi" "$COWASM_TEST_LOG"
grep -F -- "--sysroot" "$COWASM_TEST_LOG"
grep -F -- "-Dmain=__attribute__" "$COWASM_TEST_LOG"
grep -F -- "visibility" "$COWASM_TEST_LOG"
grep -F -- "wasm-ld" "$COWASM_TEST_LOG"
grep -F -- "$tmp/sysroot/lib/wasm32-wasi/crt1.o" "$COWASM_TEST_LOG"
grep -F -- "$tmp/libclang_rt.builtins-wasm32.a" "$COWASM_TEST_LOG"
