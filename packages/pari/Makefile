# https://pari.math.u-bordeaux.fr/download.html
VERSION = 2.13.2

CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = build
DIST_NATIVE = ${CWD}/dist/native
DIST_WASM = ${CWD}/dist/wasm
DIST_JS = ${CWD}/dist/js
ZCC = ${CWD}/../../bin/zcc

GMP = ${CWD}/../gmp/dist

${BUILD}/pari-${VERSION}.tar.gz:
	mkdir -p ${BUILD}
	# retry-max-time: For some reason pari.math.u-bordeaux.fr is VERY flaky.
	cd ${BUILD} && curl --retry-max-time 600 https://pari.math.u-bordeaux.fr/pub/pari/unix/pari-${VERSION}.tar.gz -o pari-${VERSION}.tar.gz

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


# WASM

${BUILD}/wasm: ${BUILD}/pari-${VERSION}.tar.gz
	rm -rf ${BUILD}/wasm
	cd ${BUILD} && mkdir wasm && tar xf pari-${VERSION}.tar.gz -C wasm --strip-components=1

${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && CC=${ZCC} AR="zig ar" RANLIB="zig ranlib" \
		./Configure --host=wasm-wasi --prefix=${DIST_WASM} --graphic=none --with-gmp=${GMP}/wasm
	# Horrible temporary hack because of missing bits/ headers with zig.  Will have to address this somehow...
	cd ${BUILD}/wasm/O* && cp /usr/include/bits/setjmp.h /usr/include/bits/wordsize.h bits/
	cd ${BUILD}/wasm/O* && make AR="zig ar" RANLIB="zig ranlib" gp
	cd ${BUILD}/wasm/O* && make AR="zig ar" RANLIB="zig ranlib" install
	cp ${BUILD}/wasm/O*/gp-sta.wasm ${DIST_WASM}/bin
	# Horrible temporary hack because of missing bits/ headers with zig.  Will have to address this somehow...!!
	mkdir ${DIST_WASM}/include/bits && cp /usr/include/bits/setjmp.h /usr/include/bits/wordsize.h ${DIST_WASM}/include/bits
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built

all: native wasm

clean:
	rm -rf "${BUILD}"

clean-all: clean
	rm -rf "${PREFIX_NATIVE}" "${PREFIX_WASM}"


######

src/hello: src/hello.c
	cd src && zig cc pari-add.c hello.c -o hello -L${DIST_NATIVE}/lib -L${GMP}/native/lib -I${DIST_NATIVE}/include -I${GMP}/native/include -lpari -lgmp

src/hello.wasm: src/hello.c
	cd src && zig cc -target wasm32-wasi pari-add.c hello.c -o hello.wasm ${DIST_WASM}/lib/libpari.a ${GMP}/wasm/lib/libgmp.a -I${DIST_WASM}/include -I${GMP}/wasm/include -lc -D_WASI_EMULATED_SIGNAL

src/pari-add-c-native.o: src/pari-add.c
	cd src && zig cc -c pari-add.c -o pari-add-c-native.o  -I${DIST_NATIVE}/include -I${GMP}/native/include -L${DIST_NATIVE}/lib -L${GMP}/native/lib -lpari -lgmp

src/pari-add-c-wasm.o: src/pari-add.c
	cd src && zig cc -target wasm32-wasi -c pari-add.c -o pari-add-c-wasm.o ${DIST_WASM}/lib/libpari.a ${GMP}/wasm/lib/libgmp.a -I${DIST_WASM}/include -I${GMP}/wasm/include -lc -D_WASI_EMULATED_SIGNAL

test-pari-add: src/pari-add-c-native.o
	cd src && zig test pari-add.zig -I. -L${DIST_NATIVE}/lib -L${GMP}/native/lib -I${DIST_NATIVE}/include -I${GMP}/native/include -lpari -lgmp -lc pari-add-c-native.o

src/pari-add.wasm: src/pari-add.zig src/pari-add-c-wasm.o
	cd src && zig build-lib -target wasm32-wasi pari-add.zig src/pari-add-c-wasm.o  -I. -I${DIST_WASM}/include -I${GMP}/wasm/include -lc -D_WASI_EMULATED_SIGNAL