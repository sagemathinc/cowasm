# See https://www.thrysoee.dk/editline/

VERSION = 20210910-3.1

CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
SRC = ${CWD}/src
BUILD = ${CWD}/build
DIST_NATIVE = ${CWD}/dist/native
DIST_WASM = ${CWD}/dist/wasm
DIST_WASM_SHARED = ${CWD}/dist/wasm-shared
PACKAGES = ${CWD}/..
TERMCAP = ${PACKAGES}/termcap/dist

all:  wasm


${BUILD}/libedit.tar.gz:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl https://www.thrysoee.dk/editline/libedit-${VERSION}.tar.gz -o libedit.tar.gz

# NATIVE - not used

${BUILD}/native: ${BUILD}/libedit.tar.gz
	rm -rf ${BUILD}/native
	mkdir -p ${BUILD}/native
	cd ${BUILD} && tar xf libedit.tar.gz -C native --strip-components=1

${DIST_NATIVE}/.built: ${BUILD}/native
	cd ${BUILD}/native && CFLAGS="-I${TERMCAP}/native/include -L${TERMCAP}/native/lib" CC="zig cc -Oz" AR="zig ar" ./configure --prefix=${DIST_NATIVE}
	cd ${BUILD}/native && make -j8
	cd ${BUILD}/native && make install
	touch ${DIST_NATIVE}/.built

.PHONY: native
native: ${DIST_NATIVE}/.built


##################
# WASM - STATIC
##################

${BUILD}/wasm: ${BUILD}/libedit.tar.gz
	rm -rf ${BUILD}/wasm
	mkdir -p ${BUILD}/wasm
	cd ${BUILD} && tar xf libedit.tar.gz -C wasm --strip-components=1
	cp -rv src/* ${BUILD}/wasm/src/
	cd ${BUILD}/wasm/src/ && patch -p0 < readline.patch

# For use of -D__STDC_ISO_10646__=201103L, see https://patchwork.ozlabs.org/project/buildroot/patch/1452127277-9538-1-git-send-email-sergio.prado@e-labworks.com/
${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && CONFIG_SITE=${SRC}/config.site CFLAGS="-I${TERMCAP}/wasm/include -L${TERMCAP}/wasm/lib -D__STDC_ISO_10646__=201103L"  RANLIB="zig ranlib" AR="zig ar" CC="zig-fPIC cc -Oz" CXX="zig c++ -Oz -target wasm32-wasi-musl -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_GETPID" \
		./configure \
			--host=none \
			--prefix="${DIST_WASM}"
	cd ${BUILD}/wasm && make -j8
	cd ${BUILD}/wasm && make install
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built


##################
# WASM - SHARED
##################


${BUILD}/wasm-shared: ${BUILD}/libedit.tar.gz
	rm -rf ${BUILD}/wasm-shared
	mkdir -p ${BUILD}/wasm-shared
	cd ${BUILD} && tar xf libedit.tar.gz -C wasm-shared --strip-components=1
	cp -rv src/* ${BUILD}/wasm-shared/src/
	cd ${BUILD}/wasm-shared/src/ && patch -p0 < readline.patch

# For use of -D__STDC_ISO_10646__=201103L, see https://patchwork.ozlabs.org/project/buildroot/patch/1452127277-9538-1-git-send-email-sergio.prado@e-labworks.com/
${DIST_WASM_SHARED}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && CONFIG_SITE=${SRC}/config.site CFLAGS="-I${TERMCAP}/wasm/include -L${TERMCAP}/wasm/lib -D__STDC_ISO_10646__=201103L"  RANLIB="zig ranlib" AR="zig ar" CC="zig-fPIC cc -Oz" CXX="zig-fPIC c++ -Oz" \
		./configure \
			--host=none \
			--prefix="${DIST_WASM_SHARED}"
	cd ${BUILD}/wasm && make -j8
	cd ${BUILD}/wasm && make install
	touch ${DIST_WASM_SHARED}/.built

.PHONY: wasm-shared
wasm-shared: ${DIST_WASM_SHARED}/.built


clean:
	rm -rf build dist
