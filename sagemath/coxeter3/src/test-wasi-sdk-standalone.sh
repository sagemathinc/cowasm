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

cowasm_standalone_probe "coxeter3" wasi-sdk "$bin_dir" "$probe_dir"

standalone_ldlibs=(-lwasi-emulated-signal -lwasi-emulated-process-clocks)
cxxflags=(
  -Oz
  -fvisibility-main
  -Wno-nontrivial-memcall
  -Wno-shift-op-parentheses
  -Wno-sometimes-uninitialized
  -Wno-unused-function
  -Wno-unused-variable
)

rm -rf "$dist_dir"
mkdir -p "$dist_dir/bin" "$dist_dir/include/coxeter" "$dist_dir/lib" "$dist_dir/share/coxeter"

cd "$build_dir"
rm -f ./*.o coxeter libcoxeter.a

sources=(*.cpp)
for source in "${sources[@]}"; do
  env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-c++" \
    "${cxxflags[@]}" \
    -c "$source" \
    -o "${source%.cpp}.o"
done

library_objects=()
for object in ./*.o; do
  if [ "$(basename "$object")" != "main.o" ]; then
    library_objects+=("$object")
  fi
done

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-ar" rc libcoxeter.a "${library_objects[@]}"
env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-ranlib" libcoxeter.a

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-c++" \
  "${cxxflags[@]}" \
  ./*.o \
  "${standalone_ldlibs[@]}" \
  -o coxeter

cp libcoxeter.a "$dist_dir/lib/"
cp coxeter "$dist_dir/bin/"
cp ./*.h ./*.hpp "$dist_dir/include/coxeter/"
cp -R coxeter_matrices headers messages "$dist_dir/share/coxeter/"

banner="$(
  cd "$dist_dir/share/coxeter" &&
    printf 'q\n' |
      cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/coxeter"
)"

printf '%s\n' "$banner" | grep -F "This is Coxeter version 3.1."
printf '%s\n' "$banner" | grep -F "coxeter :"

echo "coxeter3-ok banner static-library headers data"
