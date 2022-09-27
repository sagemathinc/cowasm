include ../build/Makefile-vars

# See https://ftp.gnu.org/pub/gnu/ncurses/?C=M;O=D
VERSION = 6.3
URL = https://ftp.gnu.org/gnu/ncurses/ncurses-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/ncurses-${VERSION}.tar.gz
POSIX_WASM = ${PACKAGES}/posix-wasm/dist/wasm
TERMCAP = ${PACKAGES}/termcap/dist/wasm

all:  wasm

include ../build/Makefile-rules

# NATIVE -- we do not use this

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ${BUILD_NATIVE} \
		&& CC="zig cc ${ZIG_NATIVE_CFLAGS} " AR="zig ar ${ZIG_NATIVE_CFLAGS} " ./configure --prefix=${DIST_NATIVE} \
		&& make -j8 \
		&& make install
	strip ${DIST_NATIVE}/bin/vis
	touch ${DIST_NATIVE}/.built

# WASM.

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	# Patch terminfo.src, since there are two obscure entries (of the thousands) that prevent "make install" from working.
	cd ${BUILD_WASM}/misc && patch -p0 < ${SRC}/00-terminfo.patch
	# Obviously, these should be done as patches:
	cd ${BUILD_WASM}/ncurses/tty && echo '#include "posix-wasm.h"' | cat - lib_tstp.c > tmp && mv tmp lib_tstp.c
	cd ${BUILD_WASM}/progs && echo '#include "posix-wasm.h"' | cat - tset.c > tmp && mv tmp tset.c
	cd ${BUILD_WASM}/test && echo '#include "posix-wasm.h"' | cat - picsmap.c > tmp && mv tmp picsmap.c
	touch ${BUILD_WASM}/.patched

# The fPIC build would use CC="zig-fPIC cc" CXX="zig-fPIC c++"
# but isn't working

${DIST_WASM}/.built: ${BUILD_WASM}/.patched
	cd ${BUILD_WASM} \
		&&	RANLIB="zig ranlib" \
			AR="zig ar" \
			CC="zig cc -target wasm32-wasi-musl -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_GETPID" \
			CXX="zig c++ -target wasm32-wasi-musl -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_GETPID" \
			CFLAGS="-I${TERMCAP}/include -L${TERMCAP}/lib -I${POSIX_WASM}" \
			CXXFLAGS="-I${TERMCAP}/include -L${TERMCAP}/lib -I${POSIX_WASM}" \
			./configure \
				--enable-termcap \
				--disable-stripping \
				--build=`./config.guess` \
				--host=none \
				--prefix="${DIST_WASM}" \
				--with-build-cc="zig cc" \
		&& 	make -j8 \
		&& 	make -j8 install
	# this makes it much easier to use for client libraries:
	cd ${DIST_WASM}/include && ln -s ncurses/curses.h .
	touch ${DIST_WASM}/.built
