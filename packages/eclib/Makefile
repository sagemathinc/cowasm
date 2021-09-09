BUILD = build
CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
DIST_NATIVE = ${CWD}/dist/native
DIST_WASM = ${CWD}/dist/wasm
DIST_JS = ${CWD}/dist/js
GMP = ${CWD}/../gmp/dist/
MPFR = ${CWD}/../mpfr/dist/
PARI = ${CWD}/../pari/dist/
NTL = ${CWD}/../ntl/dist/
FLINT = ${CWD}/../flint/dist/

all: ${DIST_NATIVE}/.built ${DIST_WASM}/.built

${BUILD}/eclib:
	mkdir -p ${BUILD}
	cd ${BUILD} && git clone https://github.com/JohnCremona/eclib.git && cd eclib

.PHONY: source
source: ${BUILD}/eclib


## Native library

${BUILD}/native: ${BUILD}/eclib
	rm -rf ${BUILD}/native
	cd ${BUILD} && git clone --depth=1 eclib native && ./autogen.sh

${DIST_NATIVE}/.built: ${BUILD}/native
	cd ${BUILD}/native && \
	CXXFLAGS="-I${GMP}/native/include  -I${MPFR}/native/include"  LDFLAGS="-L${GMP}/native/lib  -L${MPFR}/native/lib" \
	LIBS="-lgmp -lmpfr" CC="zig cc" CXX="zig c++" AR="zig ar" \
	./configure \
		--with-pari=${PARI}/native  \
		--with-ntl=${NTL}/native    \
		--with-flint=${FLINT}/native   \
		--prefix=${DIST_NATIVE}
	# A hack -- change the empty BOOST_LIBS to let us link in gmp.
	make BOOST_LIBS="-lgmp" install
	touch ${DIST_NATIVE}/.built

.PHONY: native
native: ${DIST_NATIVE}/.built


## WebAssembly library

${BUILD}/wasm: ${BUILD}/eclib
	rm -rf ${BUILD}/wasm
	cd ${BUILD} && git clone --depth=1 eclib wasm && ./autogen.sh

${DIST_WASM}/.built: ${BUILD}/wasm
	cd ${BUILD}/wasm && \
	CXXFLAGS="-I${GMP}/wasm/include  -I${MPFR}/wasm/include"  LDFLAGS="-L${GMP}/wasm/lib  -L${MPFR}/wasm/lib" \
	LIBS="-lgmp -lmpfr" CC="zig cc -target wasm32-wasi" CXX="zig c++ -target wasm32-wasi" AR="zig ar" \
	./configure \
		--with-pari=${PARI}/wasm  \
		--with-ntl=${NTL}/wasm    \
		--with-flint=${FLINT}/wasm   \
		--prefix=${DIST_WASM} \
		--enable-shared=no \
		--enable-static=yes \
		--with-boost=no
	# We change PTHREAD_CFLAGS, which would be -pthread, which would break linking with all
	# our other libraries.   Also a hack -- change the empty BOOST_LIBS to let us link in gmp.
	make PTHREAD_CFLAGS="" BOOST_LIBS="-lgmp" install
	touch ${DIST_WASM}/.built

.PHONY: wasm
wasm: ${DIST_WASM}/.built

clean:
	rm -rf ${DIST_NATIVE} ${DIST_WASM} ${DIST_JS} ${CWD}/dist/tsconfig.tsbuildinfo ${BUILD}/native ${BUILD}/wasm  node_modules