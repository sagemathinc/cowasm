#!/usr/bin/env bash

if [ -n "${COWASM_CLANG_STANDALONE_COMMON_SH:-}" ]; then
  return 0
fi
COWASM_CLANG_STANDALONE_COMMON_SH=1

cowasm_clang_standalone_skip_pattern="requires '(clang|wasm-ld|llvm-ar|llvm-ranlib)'|requires a WASI sysroot|not an executable file|not a directory|not a file|WASI startup object not found"

cowasm_clang_standalone_skip_if_unconfigured() {
  local smoke_name="$1"
  local log="$2"

  if grep -E "$cowasm_clang_standalone_skip_pattern" "$log" >/dev/null; then
    echo "Skipping ${smoke_name} clang standalone smoke: direct clang/lld WASI toolchain is not configured."
    cat "$log"
    exit 77
  fi
}

cowasm_clang_standalone_run_or_skip() {
  local smoke_name="$1"
  local log="$2"
  shift 2

  if ! "$@" >"$log" 2>&1; then
    cowasm_clang_standalone_skip_if_unconfigured "$smoke_name" "$log"
    cat "$log"
    exit 1
  fi
}

cowasm_clang_standalone_append_or_skip() {
  local smoke_name="$1"
  local log="$2"
  shift 2

  if ! "$@" >>"$log" 2>&1; then
    cowasm_clang_standalone_skip_if_unconfigured "$smoke_name" "$log"
    cat "$log"
    exit 1
  fi
}

cowasm_clang_standalone_probe() {
  local smoke_name="$1"
  local bin_dir="$2"
  local probe_dir="$3"

  cat >"$probe_dir/probe.c" <<'EOF'
int main(int argc, char **argv) {
  return argc == 0 || argv == 0;
}
EOF

  local probe_log="$probe_dir/probe.log"
  cowasm_clang_standalone_run_or_skip "$smoke_name" "$probe_log" \
    env COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-cc" \
      "$probe_dir/probe.c" -o "$probe_dir/probe.wasm"

  local archive_log="$probe_dir/archive.log"
  cowasm_clang_standalone_run_or_skip "$smoke_name" "$archive_log" \
    env COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-cc" \
      -c "$probe_dir/probe.c" -o "$probe_dir/probe.o"
  cowasm_clang_standalone_append_or_skip "$smoke_name" "$archive_log" \
    env COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-ar" \
      rc "$probe_dir/libprobe.a" "$probe_dir/probe.o"
  cowasm_clang_standalone_append_or_skip "$smoke_name" "$archive_log" \
    env COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-ranlib" \
      "$probe_dir/libprobe.a"
}
