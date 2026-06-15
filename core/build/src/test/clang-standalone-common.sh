#!/usr/bin/env bash

if [ -n "${COWASM_CLANG_STANDALONE_COMMON_SH:-}" ]; then
  return 0
fi
COWASM_CLANG_STANDALONE_COMMON_SH=1

cowasm_standalone_skip_pattern="requires '(clang|wasm-ld|llvm-ar|llvm-ranlib|wasi-sdk-[^']+-next)'|requires a WASI sysroot|requires the pinned wasi-sdk sysroot|not an executable file|not a directory|not a file|WASI startup object not found"

cowasm_clang_standalone_skip_if_unconfigured() {
  local smoke_name="$1"
  local log="$2"

  if grep -E "$cowasm_standalone_skip_pattern" "$log" >/dev/null; then
    echo "Skipping ${smoke_name} standalone smoke: requested WASI toolchain is not configured."
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

cowasm_clang_standalone_wasi_runner() {
  local bin_dir
  bin_dir="$(cd "$1" && pwd)"

  if [ -n "${COWASM_WASI_RUN:-}" ]; then
    if [ -x "$COWASM_WASI_RUN" ]; then
      printf '%s\n' "$COWASM_WASI_RUN"
      return 0
    fi
    echo "cowasm: COWASM_WASI_RUN='$COWASM_WASI_RUN' is not executable" >&2
    return 1
  fi

  for candidate in \
    "$bin_dir/../core/kernel/node_modules/.bin/wasi-run" \
    "$bin_dir/../core/dylink/node_modules/.bin/wasi-run" \
    "$bin_dir/../node_modules/.pnpm/node_modules/.bin/wasi-run"; do
    if [ -x "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  echo "cowasm: could not find wasi-run; set COWASM_WASI_RUN=/path/to/wasi-run" >&2
  return 1
}

cowasm_clang_standalone_run_wasi() {
  local bin_dir="$1"
  shift

  local runner
  runner="$(cowasm_clang_standalone_wasi_runner "$bin_dir")"

  local program="$1"
  shift
  if [ "${program%.wasm}" = "$program" ] && [ -f "$program" ]; then
    ln -sf "$program" "$program.wasm"
    program="$program.wasm"
  fi

  "$runner" "$program" "$@"
}

cowasm_standalone_probe() {
  local smoke_name="$1"
  local toolchain="$2"
  local bin_dir="$3"
  local probe_dir="$4"

  cat >"$probe_dir/probe.c" <<'EOF'
int main(int argc, char **argv) {
  return argc == 0 || argv == 0;
}
EOF

  local probe_log="$probe_dir/probe.log"
  cowasm_clang_standalone_run_or_skip "$smoke_name" "$probe_log" \
    env COWASM_TOOLCHAIN="$toolchain" "$bin_dir/cowasm-cc" \
      "$probe_dir/probe.c" -o "$probe_dir/probe.wasm"

  local archive_log="$probe_dir/archive.log"
  cowasm_clang_standalone_run_or_skip "$smoke_name" "$archive_log" \
    env COWASM_TOOLCHAIN="$toolchain" "$bin_dir/cowasm-cc" \
      -c "$probe_dir/probe.c" -o "$probe_dir/probe.o"
  cowasm_clang_standalone_append_or_skip "$smoke_name" "$archive_log" \
    env COWASM_TOOLCHAIN="$toolchain" "$bin_dir/cowasm-ar" \
      rc "$probe_dir/libprobe.a" "$probe_dir/probe.o"
  cowasm_clang_standalone_append_or_skip "$smoke_name" "$archive_log" \
    env COWASM_TOOLCHAIN="$toolchain" "$bin_dir/cowasm-ranlib" \
      "$probe_dir/libprobe.a"
}

cowasm_clang_standalone_probe() {
  cowasm_standalone_probe "$1" clang "$2" "$3"
}
