#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR SRC_DIR" >&2
  exit 2
fi

build_dir="$1"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
src_dir="$(cd "$4" && pwd)"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "posix-wasm" wasi-sdk "$bin_dir" "$probe_dir"

rm -rf "$build_dir" "$dist_dir"
mkdir -p "$build_dir/compat/sys" "$dist_dir/bits" "$dist_dir/lib/fts" "$dist_dir/sys"

cat >"$build_dir/compat/sys/wait.h" <<'EOF'
#ifndef _SYS_WAIT_H
#define _SYS_WAIT_H

#include <sys/types.h>

typedef enum { P_ALL = 0, P_PID = 1, P_PGID = 2, P_PIDFD = 3 } idtype_t;

#define WEXITSTATUS(s) (((s)&0xff00) >> 8)
#define WTERMSIG(s) ((s)&0x7f)
#define WSTOPSIG(s) WEXITSTATUS(s)
#define WIFEXITED(s) (!WTERMSIG(s))
#define WIFSTOPPED(s) ((short)((((s)&0xffff) * 0x10001) >> 8) > 0x7f00)
#define WIFSIGNALED(s) (((s)&0xffff) - 1U < 0xffu)

pid_t wait(int *status);
pid_t waitpid(pid_t pid, int *status, int options);

#endif
EOF

cat >"$build_dir/compat/termios.h" <<'EOF'
#ifndef COWASM_POSIX_WASM_WASI_SDK_TERMIOS_H
#define COWASM_POSIX_WASM_WASI_SDK_TERMIOS_H

typedef unsigned char cc_t;
typedef unsigned int speed_t;
typedef unsigned int tcflag_t;

#define NCCS 32

struct termios {
  tcflag_t c_iflag;
  tcflag_t c_oflag;
  tcflag_t c_cflag;
  tcflag_t c_lflag;
  cc_t c_cc[NCCS];
  speed_t c_ispeed;
  speed_t c_ospeed;
};

struct winsize {
  unsigned short ws_row;
  unsigned short ws_col;
  unsigned short ws_xpixel;
  unsigned short ws_ypixel;
};

#endif
EOF

cat >"$build_dir/compat/netdb.h" <<'EOF'
#ifndef COWASM_POSIX_WASM_WASI_SDK_NETDB_H
#define COWASM_POSIX_WASM_WASI_SDK_NETDB_H

#ifndef WASMPOSIX
#include <__typedef_socklen_t.h>
#endif

#ifndef EAI_NONAME
#define EAI_NONAME -2
#endif
#ifndef AI_PASSIVE
#define AI_PASSIVE 0x01
#endif
#ifndef AI_CANONNAME
#define AI_CANONNAME 0x02
#endif
#ifndef AI_NUMERICHOST
#define AI_NUMERICHOST 0x04
#endif
#ifndef AI_NUMERICSERV
#define AI_NUMERICSERV 0x400
#endif

struct sockaddr;
struct addrinfo;

struct hostent {
  char *h_name;
  char **h_aliases;
  int h_addrtype;
  int h_length;
  char **h_addr_list;
};

struct servent {
  char *s_name;
  char **s_aliases;
  int s_port;
  char *s_proto;
};

extern int h_errno;

int getaddrinfo(const char *node, const char *service,
                const struct addrinfo *hints, struct addrinfo **res);
void freeaddrinfo(struct addrinfo *res);
const char *gai_strerror(int errcode);
struct hostent *gethostbyname(const char *name);
struct hostent *gethostbyaddr(const void *addr, socklen_t len, int type);
struct hostent *getipnodebyaddr(const void *addr, size_t len, int af,
                                int *error_num);
void freehostent(struct hostent *ent);
struct servent *getservbyport(int port, const char *proto);

#endif
EOF

objects=(
  posix-wasm.o
  threads.o
  lib/builtins/muldc3.o
  lib/builtins/mulsc3.o
  lib/builtins/multc3.o
  lib/legacy/err.o
  lib/stdlib/qsort_nr.o
  lib/temp/__randname.o
  lib/temp/mkdtemp.o
  lib/temp/mkstemps.o
  lib/fts/fts.o
  lib/fts/cowasm_stat.o
  lib/bsd/strtonum.o
  lib/bsd/setmode.o
  lib/bsd/merge.o
  lib/bsd/heapsort.o
  lib/bsd/strtoq.o
  lib/bsd/rpmatch.o
)

cflags=(
  -Oz
  -fPIC
  -I"$build_dir/compat"
  -I"$src_dir"
)

for object in "${objects[@]}"; do
  source="$src_dir/${object%.o}.c"
  output="$build_dir/$object"
  mkdir -p "$(dirname "$output")"
  COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
    "${cflags[@]}" \
    -c "$source" \
    -o "$output"
done

archive_inputs=()
for object in "${objects[@]}"; do
  archive_inputs+=("$build_dir/$object")
done

COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-ar" rc \
  "$build_dir/libposix.a" \
  "${archive_inputs[@]}"
COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-ranlib" "$build_dir/libposix.a"

cp "$build_dir/libposix.a" "$dist_dir/libposix.a"
cp "$src_dir/bits/setjmp.h" "$dist_dir/bits/setjmp.h"
cp "$src_dir/emscripten.h" "$src_dir/posix-wasm.h" "$dist_dir/"
cp "$src_dir/lib/fts/fts.h" "$dist_dir/lib/fts/fts.h"
cp "$build_dir/compat/netdb.h" "$build_dir/compat/termios.h" "$dist_dir/"
cp "$build_dir/compat/sys/wait.h" "$dist_dir/sys/wait.h"

cat >"$probe_dir/posix-wasm-test.c" <<'EOF'
#include <stdio.h>
#include <string.h>

#include "posix-wasm.h"

int main(void) {
  char buf[32];
  const char *errstr = "unset";
  long long value = strtonum("42", 1, 100, &errstr);
  if (value != 42 || errstr != 0) return 1;
  if (siprintf(buf, "%lld", value) != 2) return 2;
  if (strcmp(buf, "42") != 0) return 3;

  char templ[] = "/tmp/cowasm-posix-XXXXXX";
  if (mkdtemp(templ) == 0) return 4;

  return 0;
}
EOF

COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -fvisibility-main \
  -I"$dist_dir" \
  "$probe_dir/posix-wasm-test.c" \
  "$dist_dir/libposix.a" \
  -o "$probe_dir/posix-wasm-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/posix-wasm-test"
