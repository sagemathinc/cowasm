# See https://sourceware.org/bzip2/downloads.html

INIT_CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
DIST = ${INIT_CWD}/dist
BUILD = ${INIT_CWD}/build
DIST_NATIVE = ${DIST}/native
DIST_WASM = ${DIST}/wasm

all: wasm

${BUILD}/bzip2-latest.tar.gz:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl https://sourceware.org/pub/bzip2/bzip2-latest.tar.gz -o bzip2-latest.tar.gz

# NATIVE

${BUILD}/native: ${BUILD}/bzip2-latest.tar.gz
	rm -rf ${DIST_NATIVE} && mkdir -p ${DIST_NATIVE}
	cd ${BUILD} && mkdir native && tar xf bzip2-latest.tar.gz -C native --strip-components=1

${DIST_NATIVE}/.built: ${BUILD}/native
	cd ${BUILD}/native && \
		make AR="zig ar" \
		CC="zig cc" \
		RANLIB="zig ranlib" \
		PREFIX=${DIST_NATIVE} \
		install -j8
	touch ${DIST_NATIVE}/.built

.PHONY: native
native: ${DIST_NATIVE}/.built

##################
# WASM - STATIC
##################

${BUILD}/wasm: ${BUILD}/bzip2-latest.tar.gz
	rm -rf ${DIST_WASM} && mkdir -p ${DIST_WASM}
	cd ${BUILD} && mkdir wasm && tar xf bzip2-latest.tar.gz -C wasm --strip-components=1

${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && \
		make AR="zig ar" \
		CC="zig-fPIC cc" \
		RANLIB="zig ranlib" \
		PREFIX="${DIST_WASM}" \
		install -j8
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built

.PHONY: clean
clean:
	rm -rf ${BUILD} ${DIST}
