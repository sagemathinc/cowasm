include ../build/Makefile-vars

# Python/Cython interface to PARI used by Sagelite.
VERSION = 2.2.4
URL = https://files.pythonhosted.org/packages/source/c/cypari2/cypari2-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/cypari2-${VERSION}.tar.gz
TARBALL_SHA256 = f9f0e994a9a0b064619320411e1d9c303158847e055b58082efdade5ac97f613
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

CPYTHON_WASM = ${CWD}/../../python/cpython/dist/wasm
PY_CYTHON = ${CWD}/../../python/py-cython/dist/wasm
CYSIGNALS_WASI_SDK = ${PACKAGES}/cysignals/dist/wasi-sdk
PARI_WASI_SDK = ${PACKAGES}/pari/dist/wasi-sdk
GMP_WASI_SDK = ${PACKAGES}/gmp/dist/wasi-sdk
POSIX_WASI_SDK = ${CWD}/../../core/posix-wasm/dist/wasi-sdk

${CPYTHON_WASM}/include/python3.14/Python.h:
	$(MAKE) -C ${CWD}/../../python/cpython wasm

${PY_CYTHON}/Cython/Compiler/Main.pyc:
	$(MAKE) -C ${CWD}/../../python/py-cython wasm

${CYSIGNALS_WASI_SDK}/cysignals/signals.pxd:
	$(MAKE) -C ${PACKAGES}/cysignals test-wasi-sdk-standalone

${PARI_WASI_SDK}/share/pari/pari.desc:
	$(MAKE) -C ${PACKAGES}/pari test-wasi-sdk-standalone

${GMP_WASI_SDK}/lib/libgmp.a:
	$(MAKE) -C ${PACKAGES}/gmp test-wasi-sdk-standalone

${POSIX_WASI_SDK}/posix-wasm.h:
	$(MAKE) -C ${CWD}/../../core/posix-wasm test-wasi-sdk-standalone

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	touch ${BUILD_WASI_SDK}/.build

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${CPYTHON_WASM}/include/python3.14/Python.h ${PY_CYTHON}/Cython/Compiler/Main.pyc ${CYSIGNALS_WASI_SDK}/cysignals/signals.pxd ${PARI_WASI_SDK}/share/pari/pari.desc ${GMP_WASI_SDK}/lib/libgmp.a ${POSIX_WASI_SDK}/posix-wasm.h ${BUILD_WASI_SDK}/.build
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${CPYTHON_WASM} ${PY_CYTHON} ${CYSIGNALS_WASI_SDK} ${PARI_WASI_SDK} ${GMP_WASI_SDK} ${POSIX_WASI_SDK} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

test: test-wasi-sdk-standalone
