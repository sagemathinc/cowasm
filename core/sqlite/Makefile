include ../build/Makefile-vars

# See https://sqlite.org/src/doc/trunk/README.md
# https://www.sqlite.org/src/tarball/sqlite.tar.gz?r=release
# NOTE: I've got "The server load is currently too high. Please try again later." for extended periods of
# time, so getting sqlite source from sqlite.org is NOT dependable at all. Also, they aren't versioned.
# hence we use github instead (noting https://stackoverflow.com/questions/46060010/download-github-release-with-curl).
#
# See https://github.com/sqlite/sqlite/tags for versions.
#
VERSION = 3.39.4

URL = https://github.com/sqlite/sqlite/archive/refs/tags/version-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/sqlite-${VERSION}.tar.gz

POSIX_WASM = $(shell cowasm-package-path @cowasm/posix-wasm)
LIBEDIT_WASM = $(shell cowasm-package-path @cowasm/libedit)
ZLIB_WASM = $(shell cowasm-package-path @cowasm/zlib)
TERMCAP_WASM = $(shell cowasm-package-path @cowasm/termcap)

all: deps wasm ${BIN}/sqlite3-wasm

include ../build/Makefile-rules

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cp ${SRC}/config.site ${BUILD_WASM}
	cd ${BUILD_WASM} && cat ${SRC}/patches/00-syscall.patch | patch -p1
	cd ${BUILD_WASM} && cat ${SRC}/patches/01-shell.patch | patch -p1
	touch ${BUILD_WASM}/.patched

# Notes on flags below.
#   - ?? MAYBE ?? Without -Oz (optimize for size rather than speed), we get 'Function addresses
#     with offsets not supported' from LLVM during final link.
#     I put the -Oz flag into CFLAGS upon studying what the emscripten port uses.
#   - We play some tricks with sqlite3.h below to ensure some things get defined (this is needed for clang15).
#   - BCC is the compiler used to build code that then gets compiled to WebAssembly.
#   - mmap doesn't really work with WASM, so we disable it below as explained
#     at https://www.sqlite.org/compile.html   However, this doesn't work yet to get
#     using a file to work yet.  .read works but not sqlite3-wasm a.sql
${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.patched
	cd ../build && make zig
	cd ${BUILD_WASM} && \
		CC="cowasm-cc" \
		BCC="zig cc ${ZIG_NATIVE_CFLAGS_GNU}" \
		RANLIB="zig ranlib" \
		AR="zig ar" \
		CFLAGS="-Oz -fvisibility-main -I${ZLIB_WASM}/include -I${LIBEDIT_WASM}/include -I${POSIX_WASM} -DSQLITE_DEFAULT_MMAP_SIZE=0" \
		LDFLAGS="-L${ZLIB_WASM}/lib -lz -L${LIBEDIT_WASM}/lib -ledit -L${TERMCAP_WASM}/lib -ltermcap" \
		./configure --host=none  --prefix="${DIST_WASM}" \
			--cache-file=config.site \
			--disable-load-extension \
			--disable-threadsafe \
			--disable-largefile \
			--disable-libtool-lock \
			--disable-tcl \
			--disable-shared \
	&&	echo '#include "posix-wasm.h"' >> config.h \
	&&  make BCC="zig cc ${ZIG_NATIVE_CFLAGS_GNU}" sqlite3.h \
	&&	echo '#include "posix-wasm.h"' >> sqlite3.h \
	&&	echo 'int sqlite3_fileio_init(sqlite3 *,char **,const sqlite3_api_routines *);' >> sqlite3.h \
	&& 	make BCC="zig cc ${ZIG_NATIVE_CFLAGS_GNU}" -j8 \
	&&	make BCC="zig cc ${ZIG_NATIVE_CFLAGS_GNU}" install
	touch ${DIST_WASM}/.built

${BIN}/sqlite3-wasm: ${DIST_WASM}/.built ${CWD}/bin/sqlite3-wasm
	ln -sf ${CWD}/bin/sqlite3-wasm ${BIN}/sqlite3-wasm

test: ${BIN}/sqlite3-wasm
	# really wimpy test, and it doesn't do anything with non-interactive stdin yet.
	echo "" | sqlite3-wasm | grep SQLite
	# TODO: This is a better test but requires implementing in python-wasm/src/wasm/posix/termios.ts
	echo "SELECT 389*5077" | sqlite3-wasm | grep 1974953