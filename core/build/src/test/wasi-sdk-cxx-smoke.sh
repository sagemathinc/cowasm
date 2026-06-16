#!/usr/bin/env bash
set -euo pipefail

wrapper="${1:?usage: wasi-sdk-cxx-smoke.sh /path/to/cowasm-c++}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mkdir -p "$tmp/sysroot/lib/wasm32-wasip1"
touch "$tmp/sysroot/lib/wasm32-wasip1/crt1.o"
touch "$tmp/sysroot/lib/wasm32-wasip1/libc.a"
touch "$tmp/libclang_rt.builtins.a"

cat >"$tmp/wasi-sdk-clang++-next" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

if [[ " $* " == *" -print-libgcc-file-name "* ]]; then
  echo "$COWASM_FAKE_BUILTINS"
  exit 0
fi

printf 'clang++' >>"$COWASM_TEST_LOG"
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
chmod +x "$tmp/wasi-sdk-clang++-next"

cat >"$tmp/wasi-sdk-wasm-ld-next" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

printf 'wasm-ld' >>"$COWASM_TEST_LOG"
printf ' %q' "$@" >>"$COWASM_TEST_LOG"
printf '\n' >>"$COWASM_TEST_LOG"
EOF
chmod +x "$tmp/wasi-sdk-wasm-ld-next"

cat >"$tmp/hello.cpp" <<'EOF'
#include <iostream>

int main(int argc, char **argv) {
  std::cout << argc << "\n";
  return argv == 0;
}
EOF

export PATH="$tmp:$PATH"
export COWASM_TOOLCHAIN=wasi-sdk
export COWASM_WASI_SDK_CLANGXX="$tmp/wasi-sdk-clang++-next"
export COWASM_WASI_SDK_WASM_LD="$tmp/wasi-sdk-wasm-ld-next"
export COWASM_WASI_SYSROOT="$tmp/sysroot"
export COWASM_COMPILER_RT="$tmp/libclang_rt.builtins.a"
export COWASM_FAKE_BUILTINS="$tmp/libclang_rt.builtins.a"
export COWASM_TEST_LOG="$tmp/tool.log"

"$wrapper" -Oz -fvisibility-main "$tmp/hello.cpp" -o "$tmp/hello.wasm"
test -f "$tmp/hello.wasm"

grep -F -- "clang++" "$COWASM_TEST_LOG"
grep -F -- "--target=wasm32-wasip1" "$COWASM_TEST_LOG"
grep -F -- "-Dmain=__attribute__" "$COWASM_TEST_LOG"
grep -F -- "visibility" "$COWASM_TEST_LOG"
grep -F -- "--strip-all" "$COWASM_TEST_LOG"
! grep -F -- "wasm-ld" "$COWASM_TEST_LOG"

: >"$COWASM_TEST_LOG"
"$wrapper" -g -Oz "$tmp/hello.cpp" -o "$tmp/debug.wasm"
test -f "$tmp/debug.wasm"
! grep -F -- "--strip-all" "$COWASM_TEST_LOG"
