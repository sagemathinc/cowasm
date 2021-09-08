# https://pari.math.u-bordeaux.fr/download.html
VERSION = 2.13.2

INIT_CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = build
PREFIX_NATIVE = dist.native
PREFIX_WASM = dist.wasm

${BUILD}/pari-${VERSION}.tar.gz:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl --retry-max-time 120 https://pari.math.u-bordeaux.fr/pub/pari/unix/pari-${VERSION}.tar.gz -o pari-${VERSION}.tar.gz

# NATIVE

${BUILD}/pari-${VERSION}.native: ${BUILD}/pari-${VERSION}.tar.gz
	rm -rf "${PREFIX_NATIVE}" && mkdir -p "${PREFIX_NATIVE}"
	cd ${BUILD} && tar xvf pari-${VERSION}.tar.gz
	cd ${BUILD} && mv pari-${VERSION} pari-${VERSION}.native

${PREFIX_NATIVE}/.built: ${BUILD}/pari-${VERSION}.native
	cd ${BUILD}/pari-${VERSION}.native && INIT_CWD=${INIT_CWD} PREFIX=${INIT_CWD}/${PREFIX_NATIVE} ${INIT_CWD}/src/build-native.sh
	touch ${PREFIX_NATIVE}/.built

native: ${PREFIX_NATIVE}/.built



# WASM

${BUILD}/pari-${VERSION}.wasm: ${BUILD}/pari-${VERSION}.tar.gz
	rm -rf "${PREFIX_WASM}" && mkdir -p "${PREFIX_WASM}"
	cd ${BUILD} && tar xvf pari-${VERSION}.tar.gz
	cd ${BUILD} && mv pari-${VERSION} pari-${VERSION}.wasm

${PREFIX_WASM}/.built: ${BUILD}/pari-${VERSION}.wasm
	cd ${BUILD}/pari-${VERSION}.wasm && INIT_CWD=${INIT_CWD} PREFIX=${INIT_CWD}/${PREFIX_WASM} ${INIT_CWD}/src/build-wasm.sh
	touch ${PREFIX_WASM}/.built

wasm: ${PREFIX_WASM}/.built







all: native

clean:
	rm -rf "${BUILD}"

clean-all: clean
	rm -rf "${PREFIX_NATIVE}" "${PREFIX_WASM}"
