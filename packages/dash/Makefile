# This builds the dash shell.

include ../build/Makefile-vars

# See https://github.com/sagemathinc/dash/releases which is a mirror of
# https://git.kernel.org/pub/scm/utils/dash/dash.git without the autotools dependency.
VERSION = 0.5.11.1

URL = https://github.com/sagemathinc/dash/archive/refs/tags/${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/dash-${VERSION}.tar.gz

LIBEDIT = ${PACKAGES}/libedit/dist
TERMCAP = ${PACKAGES}/termcap/dist

all: native wasm

include ../build/Makefile-rules

# Build a statically linked native binary.

# The -L for libedit is just to make autoconf happy.

${DIST_NATIVE}/.built: ${BUILD_NATIVE}/.build
	rm -rf ${DIST_NATIVE}
	cd ${BUILD_NATIVE} \
		&&	CC="zig cc" \
			CFLAGS="-Oz -I${LIBEDIT}/native/include" \
			LDFLAGS="-L${LIBEDIT}/native/lib/ ${LIBEDIT}/native/lib/libedit.a ${TERMCAP}/native/lib/libtermcap.a" \
			./configure --with-libedit --prefix=${DIST_NATIVE} \
		&&	make -j8 \
		&&  make install
	ln -sf ${PWD}/bin/dash-native ${BIN}/dash-native
	touch ${DIST_NATIVE}/.built



${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cp ${SRC}/extra.h ${BUILD_WASM}/src/setjmp.h
	mkdir -p ${BUILD_WASM}/src/bits
	cp ${SRC}/extra.h ${BUILD_WASM}/src/bits/setjmp.h
	ln -s ${SRC}/rebuild.sh ${BUILD_WASM}/rebuild.sh
	echo "ac_cv_func_sigsetmask=no" > ${BUILD_WASM}/config.site
	cd ${BUILD_WASM} \
		&&	cat ${SRC}/patches/01-jobs-extra-include.patch | patch -p1 \
		&&	cat ${SRC}/patches/02-nodes-extra-include.patch | patch -p1 \
		&&	cat ${SRC}/patches/03-emacs-default.patch | patch -p1 \
		&&	cat ${SRC}/patches/04-vforkexec.patch | patch -p1
	touch ${BUILD_WASM}/.patched

# NOTES:
#   - -DJOBS=0 is to completely disable job control, which isn't supported for WASM yet.
#      Right now the first place this fails is in savefd(int from, int ofd), where it uses
#      a fcntl argument that is simply not implemented in WASI yet.  We will probably have
#      to rewrite savefd to use a non-wasi fcntl that we implement.
#   - TODO: I'll probably move libedit and libtermcap to the core (OR their own shared library!)
#     so they don't have to be included here, which will make dash much smaller.  But for now this is fine.
#     They add about 120KB.
${DIST_WASM}/.built: ${BUILD_WASM}/.patched
	rm -rf ${DIST_WASM}
	cd ${BUILD_WASM} \
		&&	CONFIG_SITE=${BUILD_WASM}/config.site \
			CC="cowasm-cc" \
			CFLAGS="-fvisibility-main -DJOBS=0 -Oz -I${LIBEDIT}/wasm/include -I${PACKAGES}/posix-wasm/dist/wasm" \
			LDFLAGS="-L${LIBEDIT}/wasm/lib -ledit -L${TERMCAP}/wasm/lib -ltermcap" \
			./configure \
				--with-libedit \
				--prefix=${DIST_WASM} \
				--host=none \
		&&	make -j8
	mkdir -p ${DIST_WASM}/bin
	cp ${BUILD_WASM}/src/dash ${DIST_WASM}/bin/dash.wasm
	touch ${DIST_WASM}/.built

test: wasm
	# The $$ here is to escape the dollar sign; it's actually 'echo "$(2+3)"':
	echo 'echo "$$((2+3))"' | ${BIN}/cowasm ./dist/wasm/bin/dash.wasm | grep 5
