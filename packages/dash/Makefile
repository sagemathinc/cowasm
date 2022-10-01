# This builds the dash shell.

include ../build/Makefile-vars

# See https://github.com/sagemathinc/dash/releases which is a mirror of
# https://git.kernel.org/pub/scm/utils/dash/dash.git without the autotools dependency.
VERSION = 0.5.11

URL = https://github.com/sagemathinc/dash/archive/refs/tags/${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/dash-noautotools-${VERSION}.tar.gz

LIBEDIT = ${PACKAGES}/libedit/dist
TERMCAP = ${PACKAGES}/termcap/dist

all: native wasm

include ../build/Makefile-rules


${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	rm -rf ${DIST_NATIVE}
	cd ${BUILD_NATIVE} \
		&&	CC="zig cc" CFLAGS="-Oz -I${LIBEDIT}/native/include" LDFLAGS=" -L${LIBEDIT}/native/lib -L${TERMCAP}/native/lib -ltermcap" ./configure --with-libedit --prefix=${DIST_NATIVE} \
		&&	make -j8 \
		&&  make install
	ln -sf ${SRC}/dash-native ${BIN}/dash-native
	touch ${DIST_NATIVE}/.built



${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cp ${SRC}/extra.h ${BUILD_WASM}/src/setjmp.h
	mkdir -p ${BUILD_WASM}/src/bits
	cp ${SRC}/extra.h ${BUILD_WASM}/src/bits/setjmp.h
	echo "ac_cv_func_sigsetmask=no" > ${BUILD_WASM}/config.site
	cd ${BUILD_WASM} && cat ${SRC}/patches/01-jobs-extra-include.patch | patch -p1
	cd ${BUILD_WASM} && cat ${SRC}/patches/02-nodes-extra-include.patch | patch -p1
	touch ${BUILD_WASM}/.patched

${DIST_WASM}/.built: ${BUILD_WASM}/.patched
	rm -rf ${DIST_WASM}
	cd ${BUILD_WASM} \
		&&	CONFIG_SITE=${BUILD_WASM}/config.site CC="zig cc -target wasm32-wasi" CFLAGS="-Oz -I${LIBEDIT}/wasm/include -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_GETPID -D_WASI_EMULATED_PROCESS_CLOCKS -I${PACKAGES}/posix-wasm/dist/wasm" ./configure --with-libedit --prefix=${DIST_WASM} --host=none \
		&&	make -j8 \
		&&  zig ar -crs libdash.a src/*.o
	mkdir -p ${DIST_WASM}/lib
	cp ${BUILD_WASM}/libdash.a ${DIST_WASM}/lib
	touch ${DIST_WASM}/.built
