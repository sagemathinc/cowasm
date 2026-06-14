#!/usr/bin/env bash
set -euo pipefail

cowasm_ar="${1:?usage: archive-wrapper-smoke.sh /path/to/cowasm-ar /path/to/cowasm-ranlib}"
cowasm_ranlib="${2:?usage: archive-wrapper-smoke.sh /path/to/cowasm-ar /path/to/cowasm-ranlib}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

cat >"$tmp/zig" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

printf 'zig' >>"$COWASM_TEST_LOG"
printf ' %q' "$@" >>"$COWASM_TEST_LOG"
printf '\n' >>"$COWASM_TEST_LOG"
EOF
chmod +x "$tmp/zig"

cat >"$tmp/llvm-ar" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

printf 'llvm-ar' >>"$COWASM_TEST_LOG"
printf ' %q' "$@" >>"$COWASM_TEST_LOG"
printf '\n' >>"$COWASM_TEST_LOG"
EOF
chmod +x "$tmp/llvm-ar"

cat >"$tmp/llvm-ranlib" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

printf 'llvm-ranlib' >>"$COWASM_TEST_LOG"
printf ' %q' "$@" >>"$COWASM_TEST_LOG"
printf '\n' >>"$COWASM_TEST_LOG"
EOF
chmod +x "$tmp/llvm-ranlib"

cat >"$tmp/custom-ar" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

printf 'custom-ar' >>"$COWASM_TEST_LOG"
printf ' %q' "$@" >>"$COWASM_TEST_LOG"
printf '\n' >>"$COWASM_TEST_LOG"
EOF
chmod +x "$tmp/custom-ar"

cat >"$tmp/custom-ranlib" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

printf 'custom-ranlib' >>"$COWASM_TEST_LOG"
printf ' %q' "$@" >>"$COWASM_TEST_LOG"
printf '\n' >>"$COWASM_TEST_LOG"
EOF
chmod +x "$tmp/custom-ranlib"

export PATH="$tmp:$PATH"
export COWASM_TEST_LOG="$tmp/tool.log"
touch "$tmp/foo.o"

: >"$COWASM_TEST_LOG"
COWASM_TOOLCHAIN= "$cowasm_ar" rcs "$tmp/libfoo.a" "$tmp/foo.o"
COWASM_TOOLCHAIN= "$cowasm_ranlib" "$tmp/libfoo.a"
grep -F -- "zig ar rcs $tmp/libfoo.a $tmp/foo.o" "$COWASM_TEST_LOG"
grep -F -- "zig ranlib $tmp/libfoo.a" "$COWASM_TEST_LOG"

: >"$COWASM_TEST_LOG"
COWASM_TOOLCHAIN=clang "$cowasm_ar" rcs "$tmp/libfoo.a" "$tmp/foo.o"
COWASM_TOOLCHAIN=clang "$cowasm_ranlib" "$tmp/libfoo.a"
grep -F -- "llvm-ar rcs $tmp/libfoo.a $tmp/foo.o" "$COWASM_TEST_LOG"
grep -F -- "llvm-ranlib $tmp/libfoo.a" "$COWASM_TEST_LOG"

: >"$COWASM_TEST_LOG"
COWASM_TOOLCHAIN=clang \
  COWASM_AR="$tmp/custom-ar" \
  COWASM_RANLIB="$tmp/custom-ranlib" \
  "$cowasm_ar" rcs "$tmp/libfoo.a" "$tmp/foo.o"
COWASM_TOOLCHAIN=clang \
  COWASM_AR="$tmp/custom-ar" \
  COWASM_RANLIB="$tmp/custom-ranlib" \
  "$cowasm_ranlib" "$tmp/libfoo.a"
grep -F -- "custom-ar rcs $tmp/libfoo.a $tmp/foo.o" "$COWASM_TEST_LOG"
grep -F -- "custom-ranlib $tmp/libfoo.a" "$COWASM_TEST_LOG"

err="$tmp/unsupported.err"
if COWASM_TOOLCHAIN=other "$cowasm_ar" rcs "$tmp/libfoo.a" "$tmp/foo.o" >"$err" 2>&1; then
  cat "$err"
  echo "expected unsupported toolchain to fail" >&2
  exit 1
fi
grep -F -- "supported values are 'zig' and 'clang'" "$err"
! grep -F -- "Traceback" "$err"
