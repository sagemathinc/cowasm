# See https://ftp.gnu.org/gnu/readline/?C=M;O=D
VERSION = 8.1

# https://stackoverflow.com/questions/18136918/how-to-get-current-relative-directory-of-your-makefile
INIT_CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
DIST = ${INIT_CWD}/dist
BUILD = ${INIT_CWD}/build
DIST_NATIVE = ${DIST}/native
DIST_WASM = ${DIST}/wasm

all: native wasm

${BUILD}/readline-${VERSION}.tar.gz:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl https://ftp.gnu.org/gnu/readline/readline-${VERSION}.tar.gz -o readline-${VERSION}.tar.gz

# NATIVE

${BUILD}/native: ${BUILD}/readline-${VERSION}.tar.gz
	rm -rf ${DIST_NATIVE} && mkdir -p ${DIST_NATIVE}
	cd ${BUILD} && mkdir native && tar xf readline-${VERSION}.tar.gz -C native --strip-components=1

${DIST_NATIVE}/.built: ${BUILD}/native
	cd ${BUILD}/native && AR="zig ar" CC="zig cc" ./configure --prefix=${DIST_NATIVE}
	cd ${BUILD}/native && make && make install && touch ${DIST_NATIVE}/.built

.PHONY: native
native: ${DIST_NATIVE}/.built


# WASM

${BUILD}/wasm: ${BUILD}/readline-${VERSION}.tar.gz
	rm -rf ${DIST_WASM} && mkdir -p ${DIST_WASM}
	cd ${BUILD} && mkdir wasm && tar xf readline-${VERSION}.tar.gz -C wasm --strip-components=1

${DIST_WASM}/.built: ${BUILD}/wasm
	# Horrible temporary hack because of missing bits/ headers with zig.  Will have to address this somehow...
	cd ${BUILD}/wasm && mkdir -p bits && cp /usr/include/bits/setjmp.h /usr/include/bits/wordsize.h bits/
	cd ${BUILD}/wasm && AR="zig ar" CC="zig cc -target wasm32-wasi -D_WASI_EMULATED_SIGNAL -DSIG_BLOCK -Dset -Doset" ./configure --build i686-pc-linux-gnu --host=none --prefix=${DIST_WASM}
	cd ${BUILD}/wasm && make && make install
	echo "build worked!"
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built

.PHONY: clean
clean:
	rm -rf ${BUILD} ${DIST}
