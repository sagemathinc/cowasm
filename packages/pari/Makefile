# https://pari.math.u-bordeaux.fr/download.html
VERSION = 2.13.2

INIT_CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = build
DIST_NATIVE = ${CWD}/dist/native
DIST_WASM = ${CWD}/dist/wasm
DIST_JS = ${CWD}/dist/js

GMP = ${CWD}/../gmp/dist

${BUILD}/pari-${VERSION}.tar.gz:
	mkdir -p ${BUILD}
	# retry-max-time: For some reason pari.math.u-bordeaux.fr is flaky.
	cd ${BUILD} && curl --retry-max-time 120 https://pari.math.u-bordeaux.fr/pub/pari/unix/pari-${VERSION}.tar.gz -o pari-${VERSION}.tar.gz

# NATIVE

${BUILD}/native: ${BUILD}/pari-${VERSION}.tar.gz
	rm -rf ${BUILD}/native
	cd ${BUILD} && mkdir native && tar xvf pari-${VERSION}.tar.gz -C native --strip-components=1

${DIST_NATIVE}/.built: ${BUILD}/native
	cd ${BUILD}/native && CC="zig cc" AR="zig ar" RANLIB="zig ranlib" \
		./Configure --prefix=${DIST_NATIVE} --graphic=none
	cd ${BUILD}/native/O* && make AR="zig ar" RANLIB="zig ranlib" install
	touch ${DIST_NATIVE}/.built

.PHONY: native
native: ${DIST_NATIVE}/.built


# WASM

${BUILD}/wasm: ${BUILD}/pari-${VERSION}.tar.gz
	rm -rf ${BUILD}/wasm
	cd ${BUILD} && mkdir wasm && tar xvf pari-${VERSION}.tar.gz -C wasm --strip-components=1

${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && CC="zig cc -target=wasm32-wasi" AR="zig ar" RANLIB="zig ranlib" \
		./Configure --host=wasm-emscripten --prefix=${DIST_WASM} --graphic=none
	cd ${BUILD}/wasm/Oemscripten-wasm && make AR="zig ar" RANLIB="zig ranlib" install
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built







all: native

clean:
	rm -rf "${BUILD}"

clean-all: clean
	rm -rf "${PREFIX_NATIVE}" "${PREFIX_WASM}"
