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

cowasm_standalone_probe "libsemigroups" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

cat >"$probe_dir/pkg-config" <<'EOF'
#!/usr/bin/env bash
case "$1" in
  --version) echo 0.29.2; exit 0 ;;
  --atleast-pkgconfig-version) exit 0 ;;
  --exists|--atleast-version|--exact-version|--max-version) exit 1 ;;
  --cflags|--libs) exit 0 ;;
  *) exit 1 ;;
esac
EOF
chmod +x "$probe_dir/pkg-config"

rm -rf "$dist_dir"

cd "$build_dir"
env \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  CC="$bin_dir/cowasm-cc" \
  CXX="$bin_dir/cowasm-c++" \
  PKG_CONFIG="$probe_dir/pkg-config" \
  CPPFLAGS="-I$build_dir/extern/eigen-3.3.9" \
  CFLAGS="-Oz -fvisibility-main" \
  CXXFLAGS="-Oz -fvisibility-main" \
  LDFLAGS="-lwasi-emulated-signal" \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --disable-shared \
      --enable-static \
      --disable-backward \
      --disable-hpcombi \
      --disable-fmt \
      --disable-eigen \
      --disable-popcnt \
      --disable-clzll \
      --disable-dependency-tracking

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make install
mkdir -p "$dist_dir/include"
cp -R "$build_dir/extern/eigen-3.3.9/Eigen" "$dist_dir/include/"

clangxx="$bin_dir/wasi-sdk-clang++-next"
default_libcxx="$("$clangxx" -target wasm32-wasip1 -print-file-name=libc++.a)"
default_libdir="$(dirname "$default_libcxx")"
if [ "$(basename "$default_libdir")" = "noeh" ] && [ -f "$(dirname "$default_libdir")/eh/libc++.a" ]; then
  eh_libdir="$(dirname "$default_libdir")/eh"
  libcxx="$eh_libdir/libc++.a"
  libcxxabi="$eh_libdir/libc++abi.a"
  libunwind="$eh_libdir/libunwind.a"
elif [ -f "$default_libdir/libc++-exceptions.a" ]; then
  libcxx="$default_libdir/libc++-exceptions.a"
  libcxxabi="$default_libdir/libc++abi-exceptions.a"
  libunwind="$default_libdir/libunwind-exceptions.a"
else
  echo "Skipping libsemigroups wasi-sdk standalone smoke: exception-enabled C++ runtime archives are not available."
  exit 77
fi

cat >"$probe_dir/libsemigroups-test.cpp" <<'EOF'
#include <iostream>

#include "libsemigroups/froidure-pin.hpp"
#include "libsemigroups/transf.hpp"

int main() {
  using libsemigroups::FroidurePin;
  using libsemigroups::Transf;

  FroidurePin<Transf<>> semigroup({
      Transf<>({1, 3, 4, 2, 3}),
      Transf<>({3, 2, 1, 3, 3}),
  });

  if (semigroup.size() != 88 || semigroup.number_of_rules() != 18 ||
      semigroup.number_of_generators() != 2) {
    return 1;
  }

  auto word = semigroup.factorisation(Transf<>({3, 4, 4, 4, 4}));
  if (word.size() != 9) {
    return 1;
  }

  std::cout << "libsemigroups-ok transf-size=" << semigroup.size()
            << " rules=" << semigroup.number_of_rules()
            << " factor-word-length=" << word.size() << "\n";
  return 0;
}
EOF

env -u MAKEFLAGS -u MFLAGS -u MAKELEVEL PATH=/usr/bin:/bin "$clangxx" \
  -target wasm32-wasip1 \
  -Oz \
  -mllvm -wasm-enable-eh \
  -mllvm -wasm-use-legacy-eh=false \
  "$probe_dir/libsemigroups-test.cpp" \
  -I"$dist_dir/include" \
  -L"$dist_dir/lib" \
  -lsemigroups \
  "$libcxx" \
  "$libcxxabi" \
  "$libunwind" \
  -lwasi-emulated-signal \
  -o "$probe_dir/libsemigroups-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/libsemigroups-test" |
  grep -F "libsemigroups-ok transf-size=88 rules=18 factor-word-length=9"
