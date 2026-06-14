#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 5 ]; then
  echo "usage: test-clang-standalone.sh BUILD_DIR DIST_DIR BIN_DIR ZLIB_DIST_DIR SRC_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
zlib_dist_dir="$(cd "$4" && pwd)"
src_dir="$(cd "$5" && pwd)"
jobs="${JOBS:-8}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_clang_standalone_probe "libgit2" "$bin_dir" "$probe_dir"

cmake_build="$build_dir/cowasm-clang-build"
compat_dir="$probe_dir/compat"

rm -rf "$dist_dir" "$cmake_build"
mkdir -p "$dist_dir" "$cmake_build" "$compat_dir"

cat >"$compat_dir/netdb.h" <<'EOF'
#ifndef COWASM_CLANG_COMPAT_NETDB_H
#define COWASM_CLANG_COMPAT_NETDB_H

#include <stddef.h>
#include <sys/socket.h>

#ifndef EAI_NONAME
#define EAI_NONAME -2
#endif

#ifndef AF_UNSPEC
#define AF_UNSPEC 0
#endif

struct addrinfo {
  int ai_flags;
  int ai_family;
  int ai_socktype;
  int ai_protocol;
  socklen_t ai_addrlen;
  struct sockaddr *ai_addr;
  char *ai_canonname;
  struct addrinfo *ai_next;
};

static int getaddrinfo(const char *node, const char *service,
                       const struct addrinfo *hints, struct addrinfo **res) {
  (void)node;
  (void)service;
  (void)hints;
  *res = 0;
  return EAI_NONAME;
}

static void freeaddrinfo(struct addrinfo *res) {
  (void)res;
}

static const char *gai_strerror(int errcode) {
  (void)errcode;
  return "address lookup is not available in this standalone smoke";
}

#endif
EOF

cat >"$compat_dir/pwd.h" <<'EOF'
#ifndef COWASM_CLANG_COMPAT_PWD_H
#define COWASM_CLANG_COMPAT_PWD_H

#include <errno.h>
#include <stddef.h>
#include <sys/types.h>

struct passwd {
  char *pw_name;
  char *pw_passwd;
  uid_t pw_uid;
  gid_t pw_gid;
  char *pw_gecos;
  char *pw_dir;
  char *pw_shell;
};

static int getpwuid_r(uid_t uid, struct passwd *pwd, char *buf,
                      size_t buflen, struct passwd **result) {
  (void)uid;
  (void)pwd;
  (void)buf;
  (void)buflen;
  *result = 0;
  return ENOENT;
}

#endif
EOF

cat >"$compat_dir/cowasm-libgit2-compat.h" <<'EOF'
#ifndef COWASM_LIBGIT2_COMPAT_H
#define COWASM_LIBGIT2_COMPAT_H

#include <sys/types.h>

#define COWASM_UNUSED __attribute__((unused))

static COWASM_UNUSED pid_t cowasm_getpid(void) { return 1; }
static COWASM_UNUSED pid_t cowasm_getppid(void) { return 1; }
static COWASM_UNUSED pid_t cowasm_getpgid(pid_t pid) {
  (void)pid;
  return 1;
}
static COWASM_UNUSED pid_t cowasm_getsid(pid_t pid) {
  (void)pid;
  return 1;
}
static COWASM_UNUSED uid_t cowasm_getuid(void) { return 0; }
static COWASM_UNUSED uid_t cowasm_geteuid(void) { return 0; }
static COWASM_UNUSED gid_t cowasm_getgid(void) { return 0; }
static COWASM_UNUSED int cowasm_getloadavg(double loadavg[], int nelem) {
  int i;
  for (i = 0; i < nelem; i++)
    loadavg[i] = 0;
  return nelem;
}

#endif
EOF

cd "$build_dir"
for patch_file in \
  "$src_dir/patches/00-fix_missing_max_align.patch" \
  "$src_dir/patches/01-realpath-cast.patch" \
  "$src_dir/patches/02-validate_ownership.patch"; do
  if ! patch --dry-run -p1 <"$patch_file" >/dev/null 2>&1; then
    continue
  fi
  patch -p1 <"$patch_file"
done

cd "$cmake_build"
COWASM_TOOLCHAIN=clang cmake "$build_dir" \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_SYSTEM_NAME=Generic \
  -DCMAKE_TRY_COMPILE_TARGET_TYPE=STATIC_LIBRARY \
  -DCMAKE_C_COMPILER="$bin_dir/cowasm-cc" \
  -DCMAKE_C_FLAGS="-Oz -D_WASI_EMULATED_MMAN -Dgetpid=cowasm_getpid -Dgetppid=cowasm_getppid -Dgetpgid=cowasm_getpgid -Dgetsid=cowasm_getsid -Dgetuid=cowasm_getuid -Dgeteuid=cowasm_geteuid -Dgetgid=cowasm_getgid -Dgetloadavg=cowasm_getloadavg -include $compat_dir/cowasm-libgit2-compat.h -I$compat_dir -I$zlib_dist_dir/include" \
  -DCMAKE_AR="$bin_dir/cowasm-ar" \
  -DCMAKE_RANLIB="$bin_dir/cowasm-ranlib" \
  -DCMAKE_SIZEOF_VOID_P=4 \
  -DREGEX_BACKEND=regcomp \
  -DSONAME=OFF \
  -DUSE_HTTPS=OFF \
  -DBUILD_TESTS=OFF \
  -DBUILD_CLI=OFF \
  -DTHREADSAFE=OFF \
  -DUSE_THREADS:BOOL=OFF \
  -DUSE_SSH=OFF \
  -DBUILD_CLAR=OFF \
  -DBUILD_EXAMPLES=OFF \
  -DBUILD_SHARED_LIBS=OFF \
  -DGIT_QSORT_S:INTERNAL=

COWASM_TOOLCHAIN=clang cmake --build . --target libgit2package --parallel "$jobs"

mkdir -p "$dist_dir/include" "$dist_dir/lib"
cp liblibgit2package.a "$dist_dir/lib/libgit2.a"
cp -R "$build_dir/include/." "$dist_dir/include/"

COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-cc" \
  -fvisibility-main \
  -Oz \
  -I"$dist_dir/include" \
  -I"$zlib_dist_dir/include" \
  -L"$dist_dir/lib" \
  -L"$zlib_dist_dir/lib" \
  "$src_dir/test-init.c" \
  -lgit2 \
  -lz \
  -lwasi-emulated-mman \
  -o "$probe_dir/test-init"

repo_dir="$probe_dir/testrepo"
cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/test-init" "$repo_dir" |
  grep "git init succeeded"

test -d "$repo_dir/.git"
