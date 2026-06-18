include ../build/Makefile-vars

# SageMath 10.8 carries pycosat 0.6.3 as an optional SAT solver binding.
VERSION = 0.6.3
URL = https://files.pythonhosted.org/packages/source/p/pycosat/pycosat-${VERSION}.zip
TARBALL = ${UPSTREAM}/pycosat-${VERSION}.zip
TARBALL_SHA256 = 4c99874946a7e939bb941bbb019dd2c20e6068e3107c91366e7779c69d70e0ed
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

CPYTHON_WASM = ${CWD}/../../python/cpython/dist/wasm
POSIX_WASI_SDK = ${CWD}/../../core/posix-wasm/dist/wasi-sdk

${CPYTHON_WASM}/include/python3.14/Python.h:
	$(MAKE) -C ${CWD}/../../python/cpython wasm

${POSIX_WASI_SDK}/posix-wasm.h:
	$(MAKE) -C ${CWD}/../../core/posix-wasm test-wasi-sdk-standalone

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	unzip -q ${TARBALL} -d ${BUILD_WASI_SDK}
	mv ${BUILD_WASI_SDK}/pycosat-${VERSION}/* ${BUILD_WASI_SDK}/
	rmdir ${BUILD_WASI_SDK}/pycosat-${VERSION}
	touch ${BUILD_WASI_SDK}/.build

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${CPYTHON_WASM}/include/python3.14/Python.h ${POSIX_WASI_SDK}/posix-wasm.h ${BUILD_WASI_SDK}/.build
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${CPYTHON_WASM} ${POSIX_WASI_SDK} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

test: test-wasi-sdk-standalone
