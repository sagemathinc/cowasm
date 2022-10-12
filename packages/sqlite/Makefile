include ../build/Makefile-vars

# See https://sqlite.org/src/doc/trunk/README.md
# https://www.sqlite.org/src/tarball/sqlite.tar.gz?r=release
# NOTE: I've got "The server load is currently too high. Please try again later." for extended periods of
# time, so getting sqlite source from sqlite.org is NOT dependable at all. Also, they aren't versioned.
# hence we use github instead (noting https://stackoverflow.com/questions/46060010/download-github-release-with-curl).
#
# See https://github.com/sqlite/sqlite/tags for versions.
#
VERSION = 3.39.3

URL = https://github.com/sqlite/sqlite/archive/refs/tags/version-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/sqlite-${VERSION}.tar.gz

ZLIB = ${PACKAGES}/zlib/dist
LIBEDIT = ${PACKAGES}/libedit/dist
POSIX_WASM = ${PACKAGES}/posix-wasm/dist/wasm

all: wasm

include ../build/Makefile-rules

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cp ${SRC}/config.site ${BUILD_WASM}
	cp ${POSIX_WASM}/posix-wasm.h ${BUILD_WASM}
	cd ${BUILD_WASM} && cat ${SRC}/patches/00-syscall.patch | patch -p1
	touch ${BUILD_WASM}/.patched

# Notes on flags below.
#   - ?? MAYBE ?? Without -Oz (optimize for size rather than speed), we get 'Function addresses
#     with offsets not supported' from LLVM during final link.
#     I put the -Oz flag into CFLAGS upon studying what the emscripten port uses.
#   - We play some tricks with sqlite3.h below to ensure some things get defined (this is needed for clang15).
${DIST_WASM}/.built: ${BUILD_WASM}/.patched
	cd ${BUILD_WASM} && \
		CC="waszee-cc" \
		RANLIB="zig ranlib" \
		AR="zig ar" \
		CFLAGS="-Oz -I${ZLIB}/wasm/include -I${LIBEDIT}/wasm/include " \
		LDFLAGS="-lc -L${ZLIB}/wasm/lib  -L${LIBEDIT}/wasm/lib " \
		./configure --host=none  --prefix="${DIST_WASM}" \
			--cache-file=config.site \
			--disable-load-extension \
			--disable-threadsafe \
			--disable-largefile \
			--disable-libtool-lock \
			--disable-tcl \
			--disable-shared \
	&&	echo '#include "posix-wasm.h"' >> config.h \
	&&  make sqlite3.h \
	&&	echo '#include "posix-wasm.h"' >> sqlite3.h \
	&&	echo 'int sqlite3_fileio_init(sqlite3 *,char **,const sqlite3_api_routines *);' >> sqlite3.h \
	&& 	make BCC="zig cc ${ZIG_NATIVE_CFLAGS_GNU}" -j8 \
	&&	make BCC="zig cc ${ZIG_NATIVE_CFLAGS_GNU}" install
	touch ${DIST_WASM}/.built
