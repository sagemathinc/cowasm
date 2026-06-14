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
touch "$tmp/extra.o"

export COWASM_TOOLCHAIN=clang
export COWASM_CLANG="$tmp/clang"
export COWASM_WASM_LD="$tmp/wasm-ld"
export COWASM_WASI_SYSROOT="$tmp/sysroot"
export COWASM_COMPILER_RT="$tmp/libclang_rt.builtins-wasm32.a"
export COWASM_FAKE_BUILTINS="$tmp/libclang_rt.builtins-wasm32.a"
export COWASM_TEST_LOG="$tmp/tool.log"

expect_no_wasm_ld() {
  if grep -F -- "wasm-ld" "$COWASM_TEST_LOG"; then
    echo "unexpected wasm-ld invocation" >&2
    exit 1
  fi
}

expect_no_linker_match() {
  local pattern="$1"
  if grep -F -- "wasm-ld" "$COWASM_TEST_LOG" | grep -E -- "$pattern"; then
    echo "unexpected linker argument matching $pattern" >&2
    exit 1
  fi
}

expect_missing_arg() {
  local option="$1"
  shift
  local err="$tmp/missing-${option//[^A-Za-z0-9]/_}.err"
  if "$wrapper" "$@" >"$err" 2>&1; then
    cat "$err"
    echo "expected $option to fail" >&2
    exit 1
  fi
  grep -F -- "cowasm: option '$option' requires an argument" "$err"
  ! grep -F -- "Traceback" "$err"
}

expect_missing_arg "-Xlinker" "$tmp/hello.c" -Xlinker
expect_missing_arg "-L" "$tmp/hello.c" -L
expect_missing_arg "-o" "$tmp/hello.c" -o
echo "-isystem" >"$tmp/missing-isystem.rsp"
expect_missing_arg "-isystem" @"$tmp/missing-isystem.rsp"

expect_unsupported_flag() {
  local option="$1"
  shift
  local err="$tmp/unsupported-${option//[^A-Za-z0-9]/_}.err"
  if "$wrapper" "$@" >"$err" 2>&1; then
    cat "$err"
    echo "expected $option to fail" >&2
    exit 1
  fi
  grep -F -- "unsupported flag '$option'" "$err"
  ! grep -F -- "Traceback" "$err"
}

expect_unsupported_flag "--experimental-pic" "$tmp/hello.c" -Wl,--experimental-pic
expect_unsupported_flag "-shared" "$tmp/hello.c" -Wl,-shared
expect_unsupported_flag "--shared" "$tmp/hello.c" -Wl,--shared
expect_unsupported_flag "-fPIE" "$tmp/hello.c" -fPIE
expect_unsupported_flag "-pie" "$tmp/hello.c" -pie
expect_unsupported_flag "--pie" "$tmp/hello.c" -Wl,--pie

err="$tmp/missing-response.err"
if "$wrapper" @"$tmp/missing.rsp" >"$err" 2>&1; then
  cat "$err"
  echo "expected missing response file to fail" >&2
  exit 1
fi
grep -F -- "cowasm: response file '$tmp/missing.rsp' does not exist" "$err"
! grep -F -- "Traceback" "$err"

echo @"$tmp/recursive.rsp" >"$tmp/recursive.rsp"
err="$tmp/recursive-response.err"
if "$wrapper" @"$tmp/recursive.rsp" >"$err" 2>&1; then
  cat "$err"
  echo "expected recursive response file to fail" >&2
  exit 1
fi
grep -F -- "cowasm: recursive response file '$tmp/recursive.rsp'" "$err"
! grep -F -- "Traceback" "$err"

: >"$COWASM_TEST_LOG"
"$wrapper" -S "$tmp/hello.c" -o "$tmp/hello.s"
test -f "$tmp/hello.s"
grep -F -- "clang" "$COWASM_TEST_LOG"
expect_no_wasm_ld

: >"$COWASM_TEST_LOG"
"$wrapper" -M "$tmp/hello.c" >"$tmp/deps.out"
grep -F -- "clang" "$COWASM_TEST_LOG"
expect_no_wasm_ld

: >"$COWASM_TEST_LOG"
"$wrapper" "$tmp/hello.c" -Xlinker -M -o "$tmp/map.wasm"
test -f "$tmp/map.wasm"
grep -F -- "wasm-ld" "$COWASM_TEST_LOG" | grep -F -- " -M "

cat >"$tmp/link.rsp" <<EOF
-DRESPONSE_FLAG
-isystem "$tmp/host-include"
-isysroot "$tmp/host-sysroot"
"$tmp/hello.c"
"$tmp/extra.o"
-Xlinker --import-memory
-Wl,--import-table
EOF

: >"$COWASM_TEST_LOG"
"$wrapper" @"$tmp/link.rsp" -o "$tmp/response.wasm"
test -f "$tmp/response.wasm"
grep -F -- "clang" "$COWASM_TEST_LOG" | grep -F -- "-DRESPONSE_FLAG"
grep -F -- "wasm-ld" "$COWASM_TEST_LOG" | grep -F -- "$tmp/extra.o"
grep -F -- "wasm-ld" "$COWASM_TEST_LOG" | grep -F -- "--import-memory"
grep -F -- "wasm-ld" "$COWASM_TEST_LOG" | grep -F -- "--import-table"
! grep -F -- "@$tmp/link.rsp" "$COWASM_TEST_LOG"
! grep -F -- "$tmp/host-include" "$COWASM_TEST_LOG"
! grep -F -- "$tmp/host-sysroot" "$COWASM_TEST_LOG"

: >"$COWASM_TEST_LOG"
"$wrapper" -Oz -fvisibility-main -Wl,--import-memory,--import-table -lm -ldl -lwasi-emulated-signal -lc "$tmp/hello.c" -o "$tmp/hello.wasm"
test -f "$tmp/hello.wasm"

grep -F -- "--target=wasm32-wasi" "$COWASM_TEST_LOG"
grep -F -- "--sysroot" "$COWASM_TEST_LOG"
grep -F -- "-Dmain=__attribute__" "$COWASM_TEST_LOG"
grep -F -- "visibility" "$COWASM_TEST_LOG"
grep -F -- "wasm-ld" "$COWASM_TEST_LOG"
grep -F -- "wasm-ld" "$COWASM_TEST_LOG" | grep -F -- "--import-memory"
grep -F -- "wasm-ld" "$COWASM_TEST_LOG" | grep -F -- "--import-table"
grep -F -- "$tmp/sysroot/lib/wasm32-wasi/crt1.o" "$COWASM_TEST_LOG"
grep -F -- "$tmp/libclang_rt.builtins-wasm32.a" "$COWASM_TEST_LOG"
expect_no_linker_match ' -lm( |$)'
expect_no_linker_match ' -ldl( |$)'
expect_no_linker_match ' -lwasi-emulated-signal( |$)'
test "$(grep -F -- "wasm-ld" "$COWASM_TEST_LOG" | grep -E -o -- ' -lc( |$)' | wc -l)" -eq 1
