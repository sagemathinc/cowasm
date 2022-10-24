include ../build/Makefile-vars

# See https://ftp.gnu.org/pub/gnu/ncurses/?C=M;O=D
VERSION = 6.3
URL = https://ftp.gnu.org/gnu/ncurses/ncurses-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/ncurses-${VERSION}.tar.gz
POSIX_WASM = ${PACKAGES}/posix-wasm/dist/wasm
TERMCAP = ${PACKAGES}/termcap/dist/wasm

all:  wasm

include ../build/Makefile-rules

# NATIVE -- we do not use this, since pretty much any reasonable native build host has curses already.

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	cd ${BUILD_NATIVE} \
		&&	CC="zig cc ${ZIG_NATIVE_CFLAGS} " \
			CXX="zig c++ ${ZIG_NATIVE_CFLAGS} " \
			AR="zig ar ${ZIG_NATIVE_CFLAGS} " \
			CFLAGS="-Oz -I${TERMCAP}/include -L${TERMCAP}/lib -I${POSIX_WASM}" \
			CXXFLAGS="-Oz -I${TERMCAP}/include -L${TERMCAP}/lib -I${POSIX_WASM}" \
			./configure \
				--prefix=${DIST_NATIVE} \
				--without-ada \
				--without-manpages \
				--without-progs \
				--without-tests \
				--without-ticlib \
				--enable-termcap \
				--disable-stripping \
		&& make -j8 \
		&& make -j8 install.libs
	touch ${DIST_NATIVE}/.built

# WASM.

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	# Patch terminfo.src, since there are two obscure entries (of the thousands) that prevent "make install" from working.
	cd ${BUILD_WASM}/misc && patch -p0 < ${SRC}/00-terminfo.patch
	# Obviously, these should be done as patches:
	cd ${BUILD_WASM}/ncurses/tty && echo '#include "posix-wasm.h"' | cat - lib_tstp.c > tmp && mv tmp lib_tstp.c
	cd ${BUILD_WASM}/progs && echo '#include "posix-wasm.h"' | cat - tset.c > tmp && mv tmp tset.c
	cd ${BUILD_WASM}/test && echo '#include "posix-wasm.h"' | cat - picsmap.c > tmp && mv tmp picsmap.c
	cd ${BUILD_WASM} && cat ${SRC}/patches/01-disable-ncurses-test.patch | patch -p1
	touch ${BUILD_WASM}/.patched

${DIST_WASM}/.built: ${BUILD_WASM}/.patched
	cd ${BUILD_WASM} \
		&&	RANLIB="zig ranlib" \
			AR="zig ar" \
			CC="cowasm-cc" \
			CXX="cowasm-c++" \
			CFLAGS="-Oz -I${TERMCAP}/include -L${TERMCAP}/lib -I${POSIX_WASM}" \
			CXXFLAGS="-Oz -I${TERMCAP}/include -L${TERMCAP}/lib -I${POSIX_WASM}" \
			./configure \
				--without-ada \
				--without-manpages \
				--without-progs \
				--without-tests \
				--enable-termcap \
				--disable-stripping \
				--build=`./config.guess` \
				--host=none \
				--prefix="${DIST_WASM}" \
				--with-build-cc="zig cc" \
		&& 	make -j8 \
		&& 	make -j8 install.libs
	# this makes it much easier to use for client libraries:
	cd ${DIST_WASM}/include && ln -sf ncurses/curses.h .
	touch ${DIST_WASM}/.built

${BUILD_WASM}/test/.built: ${DIST_WASM}/.built
	cd ${BUILD_WASM}/test \
		&& RANLIB="zig ranlib" \
			AR="zig ar" \
			CC="cowasm-cc" \
			CFLAGS="-Oz -fvisibility-main  -I${TERMCAP}/include  -I${POSIX_WASM} -I${DIST_WASM}/include" \
			LDFLAGS="-L${TERMCAP}/lib  -L${DIST_WASM}/lib -lncurses" \
			./configure \
				--without-ada \
				--without-manpages \
				--without-progs \
				--without-pthread \
				--disable-stripping \
				--build=`../config.guess` \
				--host=none \
				--prefix="${DIST_WASM}" \
				--with-build-cc="zig cc" \
		&& echo "#undef USE_PTHREADS" >> ncurses_cfg.h \
		&& 	make -j8
	touch ${BUILD_WASM}/test/.built

${DIST_WASM}/bin/hello: ${DIST_WASM}/.built  ${SRC}/hello.c
	mkdir -p ${DIST_WASM}/bin
	${BIN}/cowasm-cc -Werror=main -v -fvisibility-main -Oz -I${DIST_WASM}/include/ncurses -I${DIST_WASM}/include -L${DIST_WASM}/lib -lncurses ${SRC}/hello.c -o ${DIST_WASM}/bin/hello


test: ${BUILD_WASM}/test/.built
	echo "all the (supported) ncurses test programs built successfully"