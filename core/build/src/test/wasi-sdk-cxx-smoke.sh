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

expect_no_log_match() {
  local pattern="$1"
  if grep -F -- "$pattern" "$COWASM_TEST_LOG"; then
    echo "unexpected compiler argument matching $pattern" >&2
    exit 1
  fi
}

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

cat >"$tmp/module.cpp" <<'EOF'
extern "C" int cowasm_test_square(int x) {
  return x * x;
}
EOF

: >"$COWASM_TEST_LOG"
"$wrapper" \
  -Oz \
  -shared \
  "$tmp/module.cpp" \
  -Wl,-soname,libmodule.so \
  -Wl,-rpath,/host/lib \
  -Wl,-z,defs \
  -Wl,--as-needed \
  -Wl,--no-undefined \
  -Xlinker -rpath -Xlinker /other/host/lib \
  -Xlinker -z -Xlinker now \
  -lm \
  -ldl \
  -lc \
  -o "$tmp/libmodule.so"
test -f "$tmp/libmodule.so"

grep -F -- "-shared" "$COWASM_TEST_LOG"
grep -F -- "-nostdlib" "$COWASM_TEST_LOG"
grep -F -- "--allow-undefined" "$COWASM_TEST_LOG"
grep -F -- "--no-entry" "$COWASM_TEST_LOG"
grep -F -- "--strip-all" "$COWASM_TEST_LOG"
expect_no_log_match "-soname"
expect_no_log_match "-rpath"
expect_no_log_match "/host/lib"
expect_no_log_match "-z"
expect_no_log_match "--as-needed"
expect_no_log_match "--no-undefined"
expect_no_log_match " -lm"
expect_no_log_match " -ldl"
expect_no_log_match " -lc"
