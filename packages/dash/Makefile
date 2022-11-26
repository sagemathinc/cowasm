# This builds the dash shell.

include ../build/Makefile-vars

# See https://github.com/sagemathinc/dash/releases which is a mirror of
# https://git.kernel.org/pub/scm/utils/dash/dash.git without the autotools dependency.
VERSION = 0.6.0

URL = https://github.com/sagemathinc/dash/archive/refs/tags/${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/dash-${VERSION}.tar.gz

LIBEDIT_WASM = $(shell cowasm-package-path @cowasm/libedit)
TERMCAP = ${PACKAGES}/termcap/dist

all: wasm ${BIN}/dash-wasm-raw

include ../build/Makefile-rules


${BUILD_WASM}/.patched: ${BUILD_WASM}/.build
	cp ${SRC}/extra.h ${BUILD_WASM}/src/setjmp.h
	mkdir -p ${BUILD_WASM}/src/bits
	cp ${SRC}/extra.h ${BUILD_WASM}/src/bits/setjmp.h
	ln -s ${SRC}/rebuild.sh ${BUILD_WASM}/rebuild.sh
	ln -s ${SRC}/update.sh ${BUILD_WASM}/update.sh  # for developing upstream
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
${DIST_WASM}/.built: node_modules ${BUILD_WASM}/.patched
	rm -rf ${DIST_WASM}
	cd ${BUILD_WASM} \
		&&	CONFIG_SITE=${BUILD_WASM}/config.site \
			CC="cowasm-cc" \
			CFLAGS="-O0 -fvisibility-main -DJOBS=0  -I${LIBEDIT_WASM}/include -I${PACKAGES}/posix-wasm/dist/wasm" \
			LDFLAGS="-L${LIBEDIT_WASM}/lib -ledit -L${TERMCAP}/wasm/lib -ltermcap" \
			./configure \
				--with-libedit \
				--prefix=${DIST_WASM} \
				--host=none \
		&&	make -j8 install
	ln -sf ${DIST_WASM}/bin/dash ${DIST_WASM}/bin/sh
	touch ${DIST_WASM}/.built

${BIN}/dash-wasm-raw: ${DIST_WASM}/.built ${CWD}/bin/dash-wasm
	ln -sf ${CWD}/bin/dash-wasm ${BIN}/dash-wasm-raw

test: ${BIN}/dash-wasm-raw
	# test doing a little arithmetic
	echo "echo \$$((389*5077))" | ${BIN}/dash-wasm-raw | grep 1974953
	# test that a syntax error doesn't terminate the shell (i.e., no longjmp exception handling)
	echo "); echo 'I am still alive'" | ${BIN}/dash-wasm-raw |grep alive
