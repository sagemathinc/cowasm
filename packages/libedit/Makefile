# See https://www.thrysoee.dk/editline/

VERSION = 20210910-3.1

CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
SRC = ${CWD}/src
BUILD = ${CWD}/build
DIST_NATIVE = ${CWD}/dist/native
DIST_WASM = ${CWD}/dist/wasm
PACKAGES = ${CWD}/..
TERMCAP = ${PACKAGES}/termcap/dist

all:  wasm native

${BUILD}/libedit.tar.gz:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl https://www.thrysoee.dk/editline/libedit-${VERSION}.tar.gz -o libedit.tar.gz

##################
# NATIVE
##################

${BUILD}/native: ${BUILD}/libedit.tar.gz
	rm -rf ${BUILD}/native
	mkdir -p ${BUILD}/native
	cd ${BUILD} && tar xf libedit.tar.gz -C native --strip-components=1

${DIST_NATIVE}/.built: ${BUILD}/native
	cd ${BUILD}/native && \
		CFLAGS="-I${TERMCAP}/native/include -L${TERMCAP}/native/lib" \
		CC="zig cc -Oz" \
		AR="zig ar" \
		./configure --prefix=${DIST_NATIVE}
	cd ${BUILD}/native && make -j8
	cd ${BUILD}/native && make install
	touch ${DIST_NATIVE}/.built

.PHONY: native
native: ${DIST_NATIVE}/.built


##################
# WASM
##################

${BUILD}/wasm: ${BUILD}/libedit.tar.gz
	rm -rf ${BUILD}/wasm
	mkdir -p ${BUILD}/wasm
	cd ${BUILD} && tar xf libedit.tar.gz -C wasm --strip-components=1
	cp -rv src/* ${BUILD}/wasm/src/
	cd ${BUILD}/wasm/src/ && patch -p0 < readline.patch

# For use of -D__STDC_ISO_10646__=201103L, see https://patchwork.ozlabs.org/project/buildroot/patch/1452127277-9538-1-git-send-email-sergio.prado@e-labworks.com/

${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && \
		CONFIG_SITE=${SRC}/config.site \
		CFLAGS="-I${TERMCAP}/wasm/include -L${TERMCAP}/wasm/lib -D__STDC_ISO_10646__=201103L -D__wasilibc_unmodified_upstream_signal -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_PROCESS_CLOCKS -O0 -target wasm32-wasi "  \
		RANLIB="zig ranlib" \
		AR="zig ar" \
		CC="zig-fPIC cc -Oz" \
		CXX="zig-fPIC c++ -Oz" \
		./configure \
			--host=none \
			--prefix="${DIST_WASM}"
	cd ${BUILD}/wasm && make -j8
	cd ${BUILD}/wasm && make install
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built





clean:
	rm -rf build dist
