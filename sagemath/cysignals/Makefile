include ../build/Makefile-vars

# Sage interrupt and signal handling for Cython code.
VERSION = 1.12.6
URL = https://files.pythonhosted.org/packages/b9/5a/d258fd8d6ee1538b8472f39051a87d3d6aa2ab26ffa2da4ac809fb851b88/cysignals-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/cysignals-${VERSION}.tar.gz
TARBALL_SHA256 = 3ef3a37bdb244821b85475a08e2762ca1019570b369e321504995fa9a54675ce
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

CPYTHON_WASM = ${CWD}/../../python/cpython/dist/wasm
PY_CYTHON = ${CWD}/../../python/py-cython/dist/wasm
POSIX_WASI_SDK = ${CWD}/../../core/posix-wasm/dist/wasi-sdk

${CPYTHON_WASM}/include/python3.14/Python.h:
	$(MAKE) -C ${CWD}/../../python/cpython wasm

${PY_CYTHON}/Cython/Compiler/Main.pyc:
	$(MAKE) -C ${CWD}/../../python/py-cython wasm

${POSIX_WASI_SDK}/posix-wasm.h:
	$(MAKE) -C ${CWD}/../../core/posix-wasm test-wasi-sdk-standalone

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	cd ${BUILD_WASI_SDK} && patch -p1 < ${SRC}/patches/01-wasi-no-posix-signal-handlers.patch
	touch ${BUILD_WASI_SDK}/.build

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${CPYTHON_WASM}/include/python3.14/Python.h ${PY_CYTHON}/Cython/Compiler/Main.pyc ${POSIX_WASI_SDK}/posix-wasm.h ${BUILD_WASI_SDK}/.build
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${CPYTHON_WASM} ${PY_CYTHON} ${POSIX_WASI_SDK} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

test: test-wasi-sdk-standalone
