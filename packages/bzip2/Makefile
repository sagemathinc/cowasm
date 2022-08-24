# See https://github.com/libarchive/bzip2/tags
VERSION=1.0.8

include ../Makefile

all: wasm

${UPSTREAM}/bzip2-${VERSION}.tar.gz:
	mkdir -p ${UPSTREAM}
	cd ${UPSTREAM} && curl -L https://github.com/libarchive/bzip2/archive/refs/tags/bzip2-${VERSION}.tar.gz -o bzip2-${VERSION}.tar.gz

##################
# NATIVE
##################

${BUILD}/native: ${UPSTREAM}/bzip2-${VERSION}.tar.gz
	rm -rf ${DIST_NATIVE} ${BUILD}/native && mkdir -p ${DIST_NATIVE} ${BUILD}/native
	cd ${BUILD} && tar xf ${UPSTREAM}/bzip2-${VERSION}.tar.gz -C native --strip-components=1

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

${BUILD}/wasm: ${UPSTREAM}/bzip2-${VERSION}.tar.gz
	rm -rf ${DIST_WASM} ${BUILD}/wasm && mkdir -p ${DIST_WASM} ${BUILD}/wasm
	cd ${BUILD} && tar xf ${UPSTREAM}/bzip2-${VERSION}.tar.gz -C wasm --strip-components=1

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
