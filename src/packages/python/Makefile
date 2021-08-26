
PYTHON_VERSION = 3.9.6

# https://stackoverflow.com/questions/18136918/how-to-get-current-relative-directory-of-your-makefile
INIT_CWD:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
BUILD = build
PREFIX_NATIVE = dist.native
PREFIX_WASM = dist.wasm

${BUILD}/Python-${PYTHON_VERSION}.tar.xz:
	mkdir -p ${BUILD}
	cd ${BUILD} && curl https://www.python.org/ftp/python/${PYTHON_VERSION}/Python-${PYTHON_VERSION}.tar.xz -o Python-${PYTHON_VERSION}.tar.xz

# NATIVE

${BUILD}/Python-${PYTHON_VERSION}.native: ${BUILD}/Python-${PYTHON_VERSION}.tar.xz
	rm -rf "${PREFIX_NATIVE}" && mkdir -p "${PREFIX_NATIVE}"
	cd ${BUILD} && tar xvf Python-${PYTHON_VERSION}.tar.xz
	cd ${BUILD} && mv Python-${PYTHON_VERSION} Python-${PYTHON_VERSION}.native

${PREFIX_NATIVE}/.built: ${BUILD}/Python-${PYTHON_VERSION}.native
	cd ${BUILD}/Python-${PYTHON_VERSION}.native && INIT_CWD=${INIT_CWD} PREFIX=${INIT_CWD}/${PREFIX_NATIVE} ${INIT_CWD}/src/build/build-native.sh
	touch ${PREFIX_NATIVE}/.built

native: ${PREFIX_NATIVE}/.built


# WASM

${BUILD}/Python-${PYTHON_VERSION}.wasm: ${BUILD}/Python-${PYTHON_VERSION}.tar.xz
	rm -rf "${PREFIX_WASM}" && mkdir -p "${PREFIX_WASM}"
	cd ${BUILD} && tar xvf Python-${PYTHON_VERSION}.tar.xz
	cd ${BUILD} && mv Python-${PYTHON_VERSION} Python-${PYTHON_VERSION}.wasm

${PREFIX_WASM}/.built: ${BUILD}/Python-${PYTHON_VERSION}.wasm
	cd ${BUILD}/Python-${PYTHON_VERSION}.wasm && INIT_CWD=${INIT_CWD} PREFIX=${INIT_CWD}/${PREFIX_WASM} ${INIT_CWD}/src/build/build-wasm.sh
	touch ${PREFIX_WASM}/.built

wasm: ${PREFIX_WASM}/.built



all: native wasm

clean:
	rm -rf "${BUILD}"

clean-all: clean
	rm -rf "${PREFIX_NATIVE}" "${PREFIX_WASM}"
