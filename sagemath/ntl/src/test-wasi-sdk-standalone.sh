#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 5 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR GMP_DIR GF2X_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
gmp_dir="$(cd "$4" && pwd)"
gf2x_dir="$(cd "$5" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "ntl" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

cat >"$probe_dir/cowasm-wasi-c++" <<EOF
#!/usr/bin/env bash
set -euo pipefail

out=""
compile_only=0
prev=""
for arg in "\$@"; do
  if [ "\$prev" = "-o" ]; then
    out="\$arg"
  fi
  case "\$arg" in
    -c|-S|-E|-M|-MM) compile_only=1 ;;
    -o*) if [ "\$arg" != "-o" ]; then out="\${arg#-o}"; fi ;;
  esac
  prev="\$arg"
done

if [ "\$compile_only" -eq 0 ] && [ -n "\$out" ] &&
   [ "\${out%.o}" = "\$out" ] && [ "\${out%.a}" = "\$out" ] &&
   [ "\${out%.so}" = "\$out" ] && [ "\${out%.wasm}" = "\$out" ]; then
  wasm_out="\$out.wasm"
  args=()
  prev=""
  replaced=0
  for arg in "\$@"; do
    if [ "\$prev" = "-o" ]; then
      args+=("\$wasm_out")
      prev=""
      replaced=1
      continue
    fi
    if [ "\$arg" = "-o" ]; then
      args+=("\$arg")
      prev="-o"
      continue
    fi
    if [ "\$replaced" -eq 0 ] && [[ "\$arg" == -o* ]] && [ "\$arg" != "-o" ]; then
      args+=("-o\$wasm_out")
      replaced=1
      continue
    fi
    args+=("\$arg")
  done
  env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-c++" "\${args[@]}"
  cat >"\$out" <<'RUNNER'
#!/usr/bin/env bash
set -euo pipefail
script="\$0"
wasm="\$script.wasm"
rm -f /mach_desc.h 2>/dev/null || true
"$bin_dir/../core/kernel/node_modules/.bin/wasi-run" "\$wasm" "\$@"
if [ -f /mach_desc.h ]; then
  mv /mach_desc.h ./mach_desc.h
fi
RUNNER
  chmod +x "\$out"
else
  env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-c++" "\$@"
fi
EOF
chmod +x "$probe_dir/cowasm-wasi-c++"

standalone_ldlibs=(-lwasi-emulated-signal -lwasi-emulated-process-clocks)
rm -rf "$dist_dir"

cd "$build_dir/src"
env \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      AR="$bin_dir/cowasm-ar" \
      RANLIB="$bin_dir/cowasm-ranlib" \
      CXX="$probe_dir/cowasm-wasi-c++" \
      CXXFLAGS="-Oz -fPIC -fvisibility-main" \
      LDFLAGS="${standalone_ldlibs[*]}" \
      PREFIX="$dist_dir" \
      GMP_PREFIX="$gmp_dir" \
      GF2X_PREFIX="$gf2x_dir" \
      NATIVE=off \
      TUNE=generic \
      NTL_THREADS=off \
      SHARED=off \
      NTL_GF2X_LIB=on

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make install

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-c++" \
  -fvisibility-main \
  "$src_dir/test-ntl.cpp" \
  -I"$dist_dir/include" \
  -I"$gmp_dir/include" \
  -I"$gf2x_dir/include" \
  -L"$dist_dir/lib" \
  -L"$gmp_dir/lib" \
  -L"$gf2x_dir/lib" \
  -lntl \
  -lgmp \
  -lgf2x \
  -lm \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/ntl-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/ntl-test" |
  grep -F "ntl-ok integer=2^200 polynomial=(x+1)^4 mod-factors=2 gf2x-factors=2 matrix-det=22 lll-rank=3 lll-det-square=45166875625 gf2e-factors=2 zz_p-interpolate=11 derivative=49"

cat >"$probe_dir/ntl-side.cpp" <<'EOF'
#include <NTL/ZZ.h>

extern "C" __attribute__((visibility("default")))
long ntl_side_smoke(void) {
  NTL::ZZ x = NTL::power2_ZZ(80);
  return NTL::NumBits(x);
}
EOF

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-c++" \
  -shared \
  -fPIC \
  "$probe_dir/ntl-side.cpp" \
  -I"$dist_dir/include" \
  -I"$gmp_dir/include" \
  -I"$gf2x_dir/include" \
  -L"$dist_dir/lib" \
  -L"$gmp_dir/lib" \
  -L"$gf2x_dir/lib" \
  -lntl \
  -lgmp \
  -lgf2x \
  -lm \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/ntl-side.so"
