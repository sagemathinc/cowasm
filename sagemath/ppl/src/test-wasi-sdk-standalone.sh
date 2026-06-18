#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 5 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR GMP_DIR GLPK_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
gmp_dir="$(cd "$4" && pwd)"
glpk_dir="$(cd "$5" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"
zig_wasi_libc="$repo_dir/core/build/build/zig/dist/native/lib/libc/wasi"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "ppl" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

libcxx_noeh="$("$bin_dir/wasi-sdk-clang++-next" -target wasm32-wasip1 -print-file-name=libc++.a)"
libcxxabi="${libcxx_noeh%/noeh/libc++.a}/eh/libc++abi.a"
libunwind="${libcxx_noeh%/noeh/libc++.a}/eh/libunwind.a"
clangxx="$bin_dir/wasi-sdk-clang++-next"
wasm_ld="$bin_dir/wasi-sdk-wasm-ld-next"
objdump="$bin_dir/wasi-sdk-llvm-objdump-next"
nm="$bin_dir/wasi-sdk-llvm-nm-next"
strings="$bin_dir/wasi-sdk-llvm-strings-next"
if [ ! -f "$libcxxabi" ] || [ ! -f "$libunwind" ]; then
  echo "cowasm: ppl standalone smoke requires pinned wasi-sdk exception archives" >&2
  echo "  $libcxxabi" >&2
  echo "  $libunwind" >&2
  exit 77
fi

# The exception-enabled wasi-sdk output is not accepted by the wasm-opt build in
# CoWasm's bin directory. Use absolute compiler paths and keep that bin
# directory out of PATH while configure, make, and the smoke link run.
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

cd "$build_dir"
env \
  PATH="$standalone_path" \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  CC="$bin_dir/cowasm-cc" \
  CXX="$bin_dir/cowasm-c++" \
  CC_FOR_BUILD="zig cc ${ZIG_NATIVE_CFLAGS:-}" \
  CPPFLAGS="-I$gmp_dir/include -I$glpk_dir/include" \
  CFLAGS="-Oz -fPIC -fvisibility-main" \
  CXXFLAGS="-Oz -std=c++11 -fPIC -fvisibility-main" \
  LDFLAGS="-L$gmp_dir/lib -L$glpk_dir/lib -lwasi-emulated-signal" \
  LIBS="-lglpk -lsetjmp -lgmpxx -lgmp -lwasi-emulated-signal -lm" \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --disable-shared \
      --enable-static \
      --disable-documentation \
      --disable-ppl_lcdd \
      --disable-ppl_lpsol \
      --disable-ppl_pips \
      --enable-interfaces=cxx \
      --with-gmp="$gmp_dir"

find . -name Makefile -exec sed -i.bak -e 's/ -Weverything//g' {} +
sed -f ./ppl-config.sed config.h >ppl-config.h

PATH="$standalone_path" COWASM_TOOLCHAIN=wasi-sdk make -C src -j"$jobs" libppl.la
PATH="$standalone_path" COWASM_TOOLCHAIN=wasi-sdk make -C src install-libLTLIBRARIES install-includeHEADERS

test -f "$dist_dir/include/ppl.hh"
test -f "$dist_dir/lib/libppl.a"
cat >"$dist_dir/include/ppl_cowasm_shim.hh" <<'EOF'
#ifndef PPL_COWASM_SHIM_HH
#define PPL_COWASM_SHIM_HH

#include <ppl.hh>

extern "C" {
Parma_Polyhedra_Library::C_Polyhedron*
cowasm_ppl_new_c_polyhedron_dim(
    Parma_Polyhedra_Library::dimension_type dim,
    Parma_Polyhedra_Library::Degenerate_Element kind);
Parma_Polyhedra_Library::C_Polyhedron*
cowasm_ppl_new_c_polyhedron_constraints(
    const Parma_Polyhedra_Library::Constraint_System* cs);
Parma_Polyhedra_Library::C_Polyhedron*
cowasm_ppl_new_c_polyhedron_generators(
    const Parma_Polyhedra_Library::Generator_System* gs);
Parma_Polyhedra_Library::C_Polyhedron*
cowasm_ppl_new_c_polyhedron_copy(
    const Parma_Polyhedra_Library::C_Polyhedron* ph);

Parma_Polyhedra_Library::NNC_Polyhedron*
cowasm_ppl_new_nnc_polyhedron_dim(
    Parma_Polyhedra_Library::dimension_type dim,
    Parma_Polyhedra_Library::Degenerate_Element kind);
Parma_Polyhedra_Library::NNC_Polyhedron*
cowasm_ppl_new_nnc_polyhedron_constraints(
    const Parma_Polyhedra_Library::Constraint_System* cs);
Parma_Polyhedra_Library::NNC_Polyhedron*
cowasm_ppl_new_nnc_polyhedron_generators(
    const Parma_Polyhedra_Library::Generator_System* gs);
Parma_Polyhedra_Library::NNC_Polyhedron*
cowasm_ppl_new_nnc_polyhedron_copy(
    const Parma_Polyhedra_Library::NNC_Polyhedron* ph);
Parma_Polyhedra_Library::NNC_Polyhedron*
cowasm_ppl_new_nnc_polyhedron_from_c(
    const Parma_Polyhedra_Library::C_Polyhedron* ph);
}

#endif
EOF

data_symbols="$probe_dir/ppl-data-symbols.txt"
"$nm" -g --defined-only "$dist_dir/lib/libppl.a" 2>/dev/null |
  awk '$2 ~ /^[BDV]$/ && $3 ~ /^_/ { print $3 }' |
  sort -u >"$data_symbols"
test -s "$data_symbols"

data_exports_cpp="$probe_dir/ppl-data-exports.cpp"
{
  cat <<'EOF'
#include <ppl.hh>
#include <ctype.h>
#include <locale.h>
#include <stdarg.h>
#include <stdio.h>
#include <string.h>

using namespace Parma_Polyhedra_Library;

extern "C" __attribute__((noreturn)) void abort(void) {
  __builtin_trap();
  __builtin_unreachable();
}

extern "C" int getc(FILE*) { return EOF; }
extern "C" int ungetc(int, FILE*) { return EOF; }
extern "C" size_t fread(void*, size_t, size_t, FILE*) { return 0; }
extern "C" size_t fwrite(const void*, size_t size, size_t count, FILE*) {
  return count == 0 ? 0 : size == 0 ? count : count;
}
extern "C" int fflush(FILE*) { return 0; }
extern "C" int putc(int c, FILE*) { return c; }
extern "C" int fgetc(FILE*) { return EOF; }
extern "C" int fprintf(FILE*, const char*, ...) { return 0; }
extern "C" int vfprintf(FILE*, const char*, va_list) { return 0; }
extern "C" int printf(const char*, ...) { return 0; }
extern "C" int fputc(int c, FILE*) { return c; }
extern "C" int ferror(FILE*) { return 1; }
extern "C" int puts(const char*) { return 0; }
extern "C" int putchar(int c) { return c; }
extern "C" int snprintf(char* s, size_t n, const char*, ...) {
  if (s != NULL && n != 0) {
    s[0] = '\0';
  }
  return 0;
}
extern "C" int vsnprintf(char* s, size_t n, const char*, va_list) {
  if (s != NULL && n != 0) {
    s[0] = '\0';
  }
  return 0;
}
extern "C" int vsprintf(char* s, const char*, va_list) {
  if (s != NULL) {
    s[0] = '\0';
  }
  return 0;
}
extern "C" int sscanf(const char*, const char*, ...) { return 0; }
extern "C" int fscanf(FILE*, const char*, ...) { return 0; }
extern "C" int raise(int) { return 0; }
extern "C" int isspace(int c) {
  return c == ' ' || c == '\f' || c == '\n' || c == '\r' || c == '\t' ||
      c == '\v';
}
extern "C" int isxdigit(int c) {
  return (c >= '0' && c <= '9') || (c >= 'A' && c <= 'F') ||
      (c >= 'a' && c <= 'f');
}
extern "C" struct lconv* localeconv(void) {
  static struct lconv locale = {};
  return &locale;
}
extern "C" char* nl_langinfo(int) {
  static char empty[] = "";
  return empty;
}
extern "C" long strtol(const char* nptr, char** endptr, int base) {
  const char* p = nptr;
  while (isspace(static_cast<unsigned char>(*p))) {
    ++p;
  }
  int sign = 1;
  if (*p == '+' || *p == '-') {
    sign = *p == '-' ? -1 : 1;
    ++p;
  }
  if (base == 0) {
    base = 10;
    if (p[0] == '0' && (p[1] == 'x' || p[1] == 'X')) {
      base = 16;
      p += 2;
    } else if (p[0] == '0') {
      base = 8;
    }
  } else if (base == 16 && p[0] == '0' && (p[1] == 'x' || p[1] == 'X')) {
    p += 2;
  }
  long value = 0;
  const char* last = p;
  for (;;) {
    int digit = -1;
    if (*p >= '0' && *p <= '9') {
      digit = *p - '0';
    } else if (*p >= 'A' && *p <= 'Z') {
      digit = *p - 'A' + 10;
    } else if (*p >= 'a' && *p <= 'z') {
      digit = *p - 'a' + 10;
    }
    if (digit < 0 || digit >= base) {
      break;
    }
    value = value * base + digit;
    last = ++p;
  }
  if (endptr != NULL) {
    *endptr = const_cast<char*>(last);
  }
  return sign * value;
}

#define PPL_DATA_EXPORT(wrapper, symbol)                                      \
  extern "C" char wrapper[] __asm__(#symbol);                                \
  extern "C" __attribute__((visibility("default"))) void                    \
      *__WASM_EXPORT__##symbol(void) {                                       \
    return wrapper;                                                           \
  }

extern "C" __attribute__((visibility("default"))) C_Polyhedron*
cowasm_ppl_new_c_polyhedron_dim(dimension_type dim, Degenerate_Element kind) {
  return new C_Polyhedron(dim, kind);
}

extern "C" __attribute__((visibility("default"))) C_Polyhedron*
cowasm_ppl_new_c_polyhedron_constraints(const Constraint_System* cs) {
  return new C_Polyhedron(*cs);
}

extern "C" __attribute__((visibility("default"))) C_Polyhedron*
cowasm_ppl_new_c_polyhedron_generators(const Generator_System* gs) {
  return new C_Polyhedron(*gs);
}

extern "C" __attribute__((visibility("default"))) C_Polyhedron*
cowasm_ppl_new_c_polyhedron_copy(const C_Polyhedron* ph) {
  return new C_Polyhedron(*ph);
}

extern "C" __attribute__((visibility("default"))) NNC_Polyhedron*
cowasm_ppl_new_nnc_polyhedron_dim(dimension_type dim, Degenerate_Element kind) {
  return new NNC_Polyhedron(dim, kind);
}

extern "C" __attribute__((visibility("default"))) NNC_Polyhedron*
cowasm_ppl_new_nnc_polyhedron_constraints(const Constraint_System* cs) {
  return new NNC_Polyhedron(*cs);
}

extern "C" __attribute__((visibility("default"))) NNC_Polyhedron*
cowasm_ppl_new_nnc_polyhedron_generators(const Generator_System* gs) {
  return new NNC_Polyhedron(*gs);
}

extern "C" __attribute__((visibility("default"))) NNC_Polyhedron*
cowasm_ppl_new_nnc_polyhedron_copy(const NNC_Polyhedron* ph) {
  return new NNC_Polyhedron(*ph);
}

extern "C" __attribute__((visibility("default"))) NNC_Polyhedron*
cowasm_ppl_new_nnc_polyhedron_from_c(const C_Polyhedron* ph) {
  return new NNC_Polyhedron(*ph);
}

EOF
  awk '{ printf "PPL_DATA_EXPORT(cowasm_ppl_data_export_%d, %s)\n", NR, $0 }' \
    "$data_symbols"
} >"$data_exports_cpp"

"$clangxx" -target wasm32-wasip1 \
  -Oz \
  -fPIC \
  -std=c++11 \
  -I"$dist_dir/include" \
  -I"$gmp_dir/include" \
  -I"$glpk_dir/include" \
  -c "$data_exports_cpp" \
  -o "$probe_dir/ppl-data-exports.o"

"$bin_dir/wasi-sdk-clang-next" -target wasm32-wasip1 \
  -Oz \
  -fPIC \
  -D__wasilibc_unmodified_upstream=1 \
  -I"$zig_wasi_libc/dlmalloc/include" \
  -I"$zig_wasi_libc/libc-top-half/musl/arch/generic" \
  -c "$zig_wasi_libc/dlmalloc/src/dlmalloc.c" \
  -o "$probe_dir/dlmalloc.o"
"$bin_dir/wasi-sdk-clang-next" -target wasm32-wasip1 \
  -Oz \
  -fPIC \
  -c "$zig_wasi_libc/libc-bottom-half/sources/sbrk.c" \
  -o "$probe_dir/sbrk.o"
"$bin_dir/wasi-sdk-clang-next" -target wasm32-wasip1 \
  -Oz \
  -fPIC \
  -c "$zig_wasi_libc/libc-bottom-half/sources/errno.c" \
  -o "$probe_dir/errno.o"

"$wasm_ld" \
  --experimental-pic \
  -shared \
  --allow-undefined \
  --no-entry \
  --export-all \
  --whole-archive \
    "$dist_dir/lib/libppl.a" \
    "$gmp_dir/lib/libgmpxx.a" \
    "$gmp_dir/lib/libgmp.a" \
  --no-whole-archive \
    "$glpk_dir/lib/libglpk.a" \
    "$probe_dir/ppl-data-exports.o" \
    "$probe_dir/dlmalloc.o" \
    "$probe_dir/sbrk.o" \
    "$probe_dir/errno.o" \
  -o "$dist_dir/lib/libppl.so"

test -s "$dist_dir/lib/libppl.so"
"$objdump" -h "$dist_dir/lib/libppl.so" | grep 'dylink.0'
if "$strings" "$dist_dir/lib/libppl.so" | grep 'needed_dynlibs'; then
  echo "unexpected needed_dynlibs from PPL side module" >&2
  exit 1
fi
for symbol in \
  _ZN23Parma_Polyhedra_Library17Coefficient_one_pE \
  _ZN23Parma_Polyhedra_Library18Coefficient_zero_pE \
  _ZN23Parma_Polyhedra_Library17Linear_Expression6zero_pE
do
  "$nm" -g "$dist_dir/lib/libppl.so" |
    grep -F " T __WASM_EXPORT__${symbol}"
done

env \
  -u MAKEFLAGS \
  -u MFLAGS \
  -u MAKELEVEL \
  -u MAKE_TERMOUT \
  -u MAKE_TERMERR \
  PATH="$standalone_path" \
  COWASM_TOOLCHAIN=wasi-sdk \
  "$bin_dir/cowasm-c++" \
  -fvisibility-main \
  -Oz \
  -std=c++11 \
  "$src_dir/test-ppl.cpp" \
  -I"$dist_dir/include" \
  -I"$gmp_dir/include" \
  -I"$glpk_dir/include" \
  -L"$dist_dir/lib" \
  -L"$glpk_dir/lib" \
  -L"$gmp_dir/lib" \
  -lppl \
  -lglpk \
  -lsetjmp \
  -lgmpxx \
  -lgmp \
  "$libcxxabi" \
  "$libunwind" \
  -lwasi-emulated-signal \
  -lm \
  -o "$probe_dir/ppl-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/ppl-test" |
  grep -F "ppl-ok poly-max=18/1 poly-min=-14/1 mip-max=25/1 hull=contains minimized-generators=checked"
