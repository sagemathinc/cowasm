# https://pari.math.u-bordeaux.fr/download.html
VERSION = 2.13.3

CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = ${CWD}/build
DIST_NATIVE = ${CWD}/dist/native
DIST_WASM = ${CWD}/dist/wasm
DIST_JS = ${CWD}/dist/js

ZCC = ${CWD}/../../bin/zcc
GMP = ${CWD}/../gmp/dist
WASMPOSIX = ${CWD}/../wasm-posix/dist


all: native wasm


#############
# Source code
#############
${BUILD}/pari-${VERSION}.tar.gz:
	mkdir -p ${BUILD}
	# retry-max-time: For some reason pari.math.u-bordeaux.fr is VERY flaky.
	cd ${BUILD} && curl --retry-max-time 600 https://pari.math.u-bordeaux.fr/pub/pari/unix/pari-${VERSION}.tar.gz -o pari-${VERSION}.tar.gz

.PHONY: source
source: ${BUILD}/pari-${VERSION}.tar.gz


# NATIVE

${BUILD}/native: ${BUILD}/pari-${VERSION}.tar.gz
	rm -rf ${BUILD}/native
	cd ${BUILD} && mkdir native && tar xf pari-${VERSION}.tar.gz -C native --strip-components=1

${DIST_NATIVE}/.built: ${BUILD}/native
	cd ${BUILD}/native && CC="zig cc" AR="zig ar" RANLIB="zig ranlib" \
		./Configure --prefix=${DIST_NATIVE} --graphic=none  --with-gmp=${GMP}/native
	cd ${BUILD}/native/O* && make AR="zig ar" RANLIB="zig ranlib" -j8 gp
	cd ${BUILD}/native/O* && make install
	touch ${DIST_NATIVE}/.built

.PHONY: native
native: ${DIST_NATIVE}/.built

.PHONY: run-python-native
run-native: ${DIST_NATIVE}/.built
	${DIST_NATIVE}/bin/gp

# WASM

${BUILD}/wasm: ${BUILD}/pari-${VERSION}.tar.gz
	rm -rf ${BUILD}/wasm
	cd ${BUILD} && mkdir wasm && tar xf pari-${VERSION}.tar.gz -C wasm --strip-components=1

${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && CC=${ZCC} AR="zig ar" RANLIB="zig ranlib" \
		./Configure --host=wasm-wasi --prefix=${DIST_WASM} --graphic=none --with-gmp=${GMP}/wasm
	# Missing bits/ headers with zig:
	cd ${BUILD}/wasm/O* && mkdir -p bits && cd bits && echo "#define __jmp_buf int"> setjmp.h && echo "" > wordsize.h
	cd ${BUILD}/wasm/O* && make -j8 AR="zig ar" RANLIB="zig ranlib" gp
	cd ${BUILD}/wasm/O* && make AR="zig ar" RANLIB="zig ranlib" install
	# Also rebuild a new version of gp-sta.wasm with the extra posix lib included by abusing EXPORT_EXE.
	cd ${BUILD}/wasm/O* && rm gp-sta && make EXPORT_EXE=${WASMPOSIX}/libwasmposix.a gp-sta
	cp ${BUILD}/wasm/O*/gp-sta.wasm ${DIST_WASM}/bin
	# Horrible temporary hack because of missing bits/ headers with zig.  Will have to address this somehow...!!
	mkdir -p ${DIST_WASM}/include/bits && cp /usr/include/bits/setjmp.h /usr/include/bits/wordsize.h ${DIST_WASM}/include/bits
	# Also build a new version of gp-sta.wasm with the extra posix lib included.
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built

.PHONY: run-wasm
run-wasm: ${DIST_WASM}/.built
	wasmer run ${DIST_WASM}/bin/gp-sta.wasm  --mapdir /:/


clean:
	rm -rf ${BUILD} ${PREFIX_NATIVE} ${PREFIX_WASM}

