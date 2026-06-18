include ../build/Makefile-vars

# SageMath uses primecountpy for Python bindings to the primecount C++ library.
VERSION = 0.1.1
URL = https://files.pythonhosted.org/packages/source/p/primecountpy/primecountpy-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/primecountpy-${VERSION}.tar.gz
TARBALL_SHA256 = c8561817c0be86eeffc41b97b6ef617d795f72cf3de59d9234d1c83d7e424030
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

CPYTHON_WASM = ${CWD}/../../python/cpython/dist/wasm
PY_CYTHON = ${CWD}/../../python/py-cython/dist/wasm
POSIX_WASI_SDK = ${CWD}/../../core/posix-wasm/dist/wasi-sdk
LIBCXX_WASI_SDK = ${CWD}/../../core/libcxx/dist/wasi-sdk
CYSIGNALS_WASI_SDK = ${PACKAGES}/cysignals/dist/wasi-sdk
PRIMECOUNT_WASI_SDK = ${PACKAGES}/primecount/dist/wasi-sdk
PRIMESIEVE_WASI_SDK = ${PACKAGES}/primesieve/dist/wasi-sdk

${CPYTHON_WASM}/include/python3.14/Python.h:
	$(MAKE) -C ${CWD}/../../python/cpython wasm

${PY_CYTHON}/Cython/Compiler/Main.pyc:
	$(MAKE) -C ${CWD}/../../python/py-cython wasm

${POSIX_WASI_SDK}/posix-wasm.h:
	$(MAKE) -C ${CWD}/../../core/posix-wasm test-wasi-sdk-standalone

${LIBCXX_WASI_SDK}/libcxx.so:
	$(MAKE) -C ${CWD}/../../core/libcxx test-wasi-sdk-standalone

${CYSIGNALS_WASI_SDK}/cysignals/signals.pxd:
	$(MAKE) -C ${PACKAGES}/cysignals test-wasi-sdk-standalone

${PRIMECOUNT_WASI_SDK}/lib/libprimecount.a:
	$(MAKE) -C ${PACKAGES}/primecount test-wasi-sdk-standalone

${PRIMESIEVE_WASI_SDK}/lib/libprimesieve.a:
	$(MAKE) -C ${PACKAGES}/primesieve test-wasi-sdk-standalone

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	touch ${BUILD_WASI_SDK}/.build

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${CPYTHON_WASM}/include/python3.14/Python.h ${PY_CYTHON}/Cython/Compiler/Main.pyc ${POSIX_WASI_SDK}/posix-wasm.h ${LIBCXX_WASI_SDK}/libcxx.so ${CYSIGNALS_WASI_SDK}/cysignals/signals.pxd ${PRIMECOUNT_WASI_SDK}/lib/libprimecount.a ${PRIMESIEVE_WASI_SDK}/lib/libprimesieve.a ${BUILD_WASI_SDK}/.build
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${CPYTHON_WASM} ${PY_CYTHON} ${POSIX_WASI_SDK} ${LIBCXX_WASI_SDK} ${CYSIGNALS_WASI_SDK} ${PRIMECOUNT_WASI_SDK} ${PRIMESIEVE_WASI_SDK} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

test: test-wasi-sdk-standalone
