# See https://gmplib.org for versions.
VERSION = 6.2.1

BUILD = build
PREFIX_NATIVE = dist/native
PREFIX_WASM = dist/wasm
SOURCE = ${BUILD}/gmp-${VERSION}.tar.bz2

${BUILD}/gmp-${VERSION}.tar.bz2:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl https://gmplib.org/download/gmp/gmp-${VERSION}.tar.bz2 -o gmp-${VERSION}.tar.bz2

.PHONY: source
source: ${BUILD}/gmp-${VERSION}.tar.bz2


clean:
	rm -rf ${PREFIX_NATIVE} ${PREFIX_WASM} ${BUILD}