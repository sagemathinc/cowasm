#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR BOOST_CROPPED_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
boost_cropped_dir="$(cd "$4" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "tdlib" wasi-sdk "$bin_dir" "$probe_dir"

clangxx="$bin_dir/wasi-sdk-clang++-next"
default_libcxx="$("$clangxx" -target wasm32-wasip1 -print-file-name=libc++.a)"
libcxx="${default_libcxx%/noeh/libc++.a}/eh/libc++.a"
libcxxabi="${default_libcxx%/noeh/libc++.a}/eh/libc++abi.a"
libunwind="${default_libcxx%/noeh/libc++.a}/eh/libunwind.a"
libcxx_eh_dir="$(dirname "$libcxx")"
if [ ! -f "$libcxx" ] || [ ! -f "$libcxxabi" ] || [ ! -f "$libunwind" ]; then
  echo "cowasm: tdlib standalone smoke requires pinned wasi-sdk exception archives" >&2
  echo "  $libcxx" >&2
  echo "  $libcxxabi" >&2
  echo "  $libunwind" >&2
  exit 77
fi

# Raw wasi-sdk clang runs wasm-opt after linking at -Oz; keep it from picking
# up CoWasm's bin/wasm-opt when this script is launched from the package make.
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

rm -rf "$dist_dir"
mkdir -p "$dist_dir/include/treedec"

cd "$build_dir"
find src -type f \( -name '*.h' -o -name '*.hpp' \) -print |
  while IFS= read -r header; do
    install -D -m 0644 "$header" "$dist_dir/include/treedec/${header#src/}"
  done

env \
  -u MAKEFLAGS \
  -u MFLAGS \
  -u MAKELEVEL \
  -u MAKE_TERMOUT \
  -u MAKE_TERMERR \
  -u AR \
  -u CC \
  -u CXX \
  -u CPPFLAGS \
  -u CFLAGS \
  -u CXXFLAGS \
  -u LDFLAGS \
  PATH="$standalone_path" \
  "$clangxx" \
  -target wasm32-wasip1 \
  -std=c++11 \
  -Oz \
  -nostdlib++ \
  -Wno-deprecated-builtins \
  -Wno-deprecated-declarations \
  "$src_dir/test-tdlib.cpp" \
  -I"$dist_dir/include" \
  -I"$boost_cropped_dir/include" \
  -L"$libcxx_eh_dir" \
  -lc++ \
  -lc++abi \
  -lunwind \
  -lwasi-emulated-signal \
  -o "$probe_dir/tdlib-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/tdlib-test" |
  grep -F "tdlib-ok path-width=1 cycle-width=2 clique-width=4 valid=1"
