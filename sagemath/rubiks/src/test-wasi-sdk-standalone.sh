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

cowasm_standalone_probe "rubiks" wasi-sdk "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir/bin"

cxxflags=(
  -Oz
  -Wno-empty-body
  -Wno-deprecated-declarations
)

cflags_gnu89=(
  -std=gnu89
  -Oz
  -fvisibility-main
  -Wno-implicit-int
  -Wno-implicit-function-declaration
  -Wno-deprecated-non-prototype
  -Wno-return-type
)

clangxx="$bin_dir/wasi-sdk-clang++-next"
default_libcxx="$("$clangxx" -target wasm32-wasip1 -print-file-name=libc++.a)"
libcxx="${default_libcxx%/noeh/libc++.a}/eh/libc++.a"
libcxxabi="${default_libcxx%/noeh/libc++.a}/eh/libc++abi.a"
libunwind="${default_libcxx%/noeh/libc++.a}/eh/libunwind.a"
libcxx_eh_dir="$(dirname "$libcxx")"
if [ ! -f "$libcxx" ] || [ ! -f "$libcxxabi" ] || [ ! -f "$libunwind" ]; then
  echo "cowasm: rubiks standalone smoke requires pinned wasi-sdk exception archives" >&2
  echo "  $libcxx" >&2
  echo "  $libcxxabi" >&2
  echo "  $libunwind" >&2
  exit 77
fi

standalone_path=""
IFS=:
for path_entry in $PATH; do
  path_entry_real="$(cd "${path_entry:-.}" 2>/dev/null && pwd || true)"
  if [ "$path_entry_real" = "$bin_dir" ]; then
    continue
  fi
  if [ -z "$standalone_path" ]; then
    standalone_path="$path_entry"
  else
    standalone_path="$standalone_path:$path_entry"
  fi
done
unset IFS

build_cpp_program() {
  local out="$1"
  shift
  local objects=()
  for source in "$@"; do
    local object="$probe_dir/$(basename "${source%.*}").o"
    env PATH="$standalone_path" "$clangxx" \
      -target wasm32-wasip1 \
      "${cxxflags[@]}" \
      -c "$source" \
      -o "$object"
    objects+=("$object")
  done
  env PATH="$standalone_path" "$clangxx" \
    -target wasm32-wasip1 \
    "${cxxflags[@]}" \
    -nostdlib++ \
    "${objects[@]}" \
    -L"$libcxx_eh_dir" \
    -lc++ \
    -lc++abi \
    -lunwind \
    -o "$out"
}

empty_cflags=()
empty_ldflags=()
dik_wasi_cflags=(-include "$src_dir/dik-wasi-prototypes.h")
reid_wasi_cflags=(-include "$src_dir/reid-wasi-compat.h")
reid_optimal_wasi_cflags=(-include "$src_dir/reid-wasi-compat.h")
reid_optimal_wasi_ldflags=(-Wl,-z,stack-size=1048576)

build_c_program_with_compile_and_link_flags() {
  local out="$1"
  shift
  local -n extra_flags="$1"
  shift
  local -n extra_ldflags="$1"
  shift
  local objects=()
  for source in "$@"; do
    local object="$probe_dir/$(basename "${source%.*}").o"
    env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
      "${cflags_gnu89[@]}" \
      "${extra_flags[@]}" \
      -c "$source" \
      -o "$object"
    objects+=("$object")
  done
  env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
    "${cflags_gnu89[@]}" \
    "${extra_flags[@]}" \
    "${objects[@]}" \
    "${extra_ldflags[@]}" \
    -o "$out"
}

build_c_program_with_flags() {
  local out="$1"
  shift
  build_c_program_with_compile_and_link_flags "$out" "$1" empty_ldflags "${@:2}"
}

build_c_program() {
  local out="$1"
  shift
  build_c_program_with_flags "$out" empty_cflags "$@"
}

build_cpp_program \
  "$dist_dir/bin/cu2" \
  "$build_dir/dietz/cu2/cu2.cpp" \
  "$build_dir/dietz/cu2/main.cpp"

build_cpp_program \
  "$dist_dir/bin/cubex" \
  "$build_dir/dietz/solver/cubex.cpp" \
  "$build_dir/dietz/solver/main.cpp"

build_cpp_program \
  "$dist_dir/bin/mcube" \
  "$build_dir/dietz/mcube/mcube.cpp" \
  "$build_dir/dietz/mcube/main.cpp"

build_c_program_with_flags \
  "$dist_dir/bin/dikcube" \
  dik_wasi_cflags \
  "$build_dir/dik/cube.c" \
  "$build_dir/dik/phase1.c" \
  "$build_dir/dik/phase2.c" \
  "$build_dir/dik/setcube.c" \
  "$build_dir/dik/permcube.c" \
  "$build_dir/dik/prntsol.c" \
  "$build_dir/dik/globals.c"

build_c_program \
  "$dist_dir/bin/size222" \
  "$build_dir/dik/size222.c"

build_c_program_with_compile_and_link_flags \
  "$dist_dir/bin/optimal" \
  reid_optimal_wasi_cflags \
  reid_optimal_wasi_ldflags \
  "$build_dir/reid/optimal.c"

build_c_program \
  "$dist_dir/bin/twist" \
  "$build_dir/reid/twist.c"

for program in cu2 cubex mcube dikcube size222 optimal twist; do
  ln -sf "$program" "$dist_dir/bin/$program.wasm"
done

cu2_log="$probe_dir/cu2.log"
printf '\n\n\n' |
  cowasm_clang_standalone_run_wasi \
    "$bin_dir" \
    "$dist_dir/bin/cu2" \
    YYBOOROGWGRYYGBORBWWWRGB >"$cu2_log"
grep -F "200 cube solved ok." "$cu2_log"
grep -F "201 terminating successfully." "$cu2_log"

cubex_log="$probe_dir/cubex.log"
printf '\n' |
  cowasm_clang_standalone_run_wasi \
    "$bin_dir" \
    "$dist_dir/bin/cubex" \
    212212212333333333626626626555555555141141141464464464 >"$cubex_log"
grep -F "200 cube solved ok." "$cubex_log"
grep -F "201 terminating successfully." "$cubex_log"

mcube_log="$probe_dir/mcube.log"
printf '\n\n\n' |
  cowasm_clang_standalone_run_wasi \
    "$bin_dir" \
    "$dist_dir/bin/mcube" \
    U:1111111111111111 \
    L:2222333333332222 \
    F:5555222222225555 \
    R:4444555555554444 \
    B:3333444444443333 \
    D:6666666666666666 >"$mcube_log"
grep -F "200 cube solved ok." "$mcube_log"
grep -F "202 2 moves 11 groups 0 0 0 0 0 0 0 0 1 1 0" "$mcube_log"
grep -F "inner top left" "$mcube_log"
grep -F "inner bottom left" "$mcube_log"
grep -F "201 terminating successfully." "$mcube_log"

dik_log="$probe_dir/dikcube.log"
printf 'F\n' |
  cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/dikcube" -t >"$dik_log"
grep -F "Solution ( 1+ 0= 1): F3" "$dik_log"

size222_log="$probe_dir/size222.log"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/size222" >"$size222_log"
grep -F "2644 with 11 turns" "$size222_log"

twist_log="$probe_dir/twist.log"
printf 'F\n' |
  cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/twist" >"$twist_log"
grep -F "LF UR UB UL RF DR DB DL FU FD BR BL LFU URB UBL LDF RUF RFD DLB DBR" "$twist_log"

optimal_log="$probe_dir/optimal.log"
printf 'UF UR UB UL DF DR DB DL FR FL BR BL UFR URB UBL ULF DRF DFL DLB DBR\n' |
  cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/optimal" >"$optimal_log"
grep -F "initializing distance table" "$optimal_log"
grep -F "cube is already solved!" "$optimal_log"

optimal_turn_log="$probe_dir/optimal-turn.log"
printf 'LF UR UB UL RF DR DB DL FU FD BR BL LFU URB UBL LDF RUF RFD DLB DBR\n' |
  cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/optimal" >"$optimal_turn_log"
grep -F "position has 4-fold symmetry" "$optimal_turn_log"
grep -F " F'  (1q*, 1f)" "$optimal_turn_log"
grep -F "depth  1q completed" "$optimal_turn_log"

echo "rubiks-ok cu2 cubex mcube dikcube size222 twist optimal-solved optimal-turn"
