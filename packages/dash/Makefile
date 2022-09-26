# This builds the dash shell.

include ../build/Makefile-vars

# See https://git.kernel.org/pub/scm/utils/dash/dash.git
VERSION = 0.5.11.5

URL = https://git.kernel.org/pub/scm/utils/dash/dash.git/snapshot/dash-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/dash-${VERSION}.tar.gz

all: wasm

include ../build/Makefile-rules

${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cp ${SRC}/extra.h ${BUILD_WASM}/src/setjmp.h
	mkdir -p ${BUILD_WASM}/src/bits
	cp ${SRC}/extra.h ${BUILD_WASM}/src/bits/setjmp.h
	echo "ac_cv_func_sigsetmask=no" > ${BUILD_WASM}/config.site
	cd ${BUILD_WASM} && cat ${SRC}/patches/01-jobs-extra-include.patch | patch -p1
	cd ${BUILD_WASM} && cat ${SRC}/patches/02-nodes-extra-include.patch | patch -p1
	touch ${BUILD_WASM}/.patched

${DIST_WASM}/.built: ${BUILD_WASM}/.patched
	cd ${BUILD_WASM} \
		&&	./autogen.sh \
		&&	CONFIG_SITE=${BUILD_WASM}/config.site CC="zig cc -target wasm32-wasi" CFLAGS="-D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_GETPID -D_WASI_EMULATED_PROCESS_CLOCKS -I${PACKAGES}/posix-wasm/dist/wasm" ./configure --prefix=${DIST_WASM} --host=none \
		&&	make -j8 \
		&&	make install
	touch ${DIST_WASM}/.built
