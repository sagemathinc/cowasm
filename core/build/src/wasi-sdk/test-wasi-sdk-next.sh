#!/usr/bin/env bash
set -euo pipefail

usage="usage: test-wasi-sdk-next.sh clang clang++ wasm-ld llvm-objdump llvm-nm llvm-strings bin-dir"

clang="${1:?$usage}"
clangxx="${2:?$usage}"
wasm_ld="${3:?$usage}"
objdump="${4:?$usage}"
nm="${5:?$usage}"
strings="${6:?$usage}"
bin_dir="${7:?$usage}"

"$clang" --version | grep 'clang version'
"$clangxx" --version | grep 'clang version'
"$wasm_ld" --version | grep 'LLD'
"$nm" --version | grep 'LLVM'
"$strings" --version | grep 'LLVM'

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

cat >"$tmp/hello.c" <<'EOF'
#include <stdio.h>

int main(void) {
  printf("hello wasi-sdk\n");
  return 0;
}
EOF

"$clang" -target wasm32-wasip1 "$tmp/hello.c" -o "$tmp/hello.wasm"
test -s "$tmp/hello.wasm"

cat >"$tmp/add.c" <<'EOF'
#define EXPORTED_SYMBOL __attribute__((visibility("default")))

EXPORTED_SYMBOL
int add(int a, int b) {
  return a + b;
}
EOF

"$clang" -target wasm32-wasip1 -Oz -fPIC -shared \
  "$tmp/add.c" -o "$tmp/add-shared.wasm"
"$objdump" -h "$tmp/add-shared.wasm" | grep 'dylink.0'

cat >"$tmp/add-unresolved.c" <<'EOF'
#define EXPORTED_SYMBOL __attribute__((visibility("default")))

extern int missing_from_main(int);

EXPORTED_SYMBOL
int call_missing_from_main(int a) {
  return missing_from_main(a);
}
EOF

"$clang" -target wasm32-wasip1 -Oz -fPIC -shared -nostdlib \
  -Wl,--allow-undefined -Wl,--no-entry \
  "$tmp/add-unresolved.c" -o "$tmp/add-cowasm.so"
"$objdump" -h "$tmp/add-cowasm.so" | grep 'dylink.0'
"$strings" "$tmp/add-cowasm.so" | grep 'missing_from_main'

if "$strings" "$tmp/add-cowasm.so" | grep -E 'lib(c|c\+\+|c\+\+abi)\.so'; then
  echo "unexpected needed_dynlibs in CoWasm-style side module" >&2
  exit 1
fi

cat >"$tmp/wrapper-main.c" <<'EOF'
#include <stdio.h>

int main(void) {
  printf("hello cowasm wasi-sdk wrapper\n");
  return 0;
}
EOF

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" --print-multiarch \
  | grep '^wasm32-wasip1$'
env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  "$tmp/wrapper-main.c" -o "$tmp/wrapper-main.wasm"
test -s "$tmp/wrapper-main.wasm"

cat >"$tmp/wrapper-side.c" <<'EOF'
#define EXPORTED_SYMBOL __attribute__((visibility("default")))

extern int main_runtime_value(void);

EXPORTED_SYMBOL
int add_main_runtime_value(int n) {
  return n + main_runtime_value();
}
EOF

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -fPIC -shared "$tmp/wrapper-side.c" -o "$tmp/wrapper-side.so"
"$objdump" -h "$tmp/wrapper-side.so" | grep 'dylink.0'
"$strings" "$tmp/wrapper-side.so" | grep 'main_runtime_value'

if "$strings" "$tmp/wrapper-side.so" | grep -E 'lib(c|c\+\+|c\+\+abi)\.so'; then
  echo "unexpected needed_dynlibs from cowasm-cc wasi-sdk side module" >&2
  exit 1
fi
