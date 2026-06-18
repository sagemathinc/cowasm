include ../build/Makefile-vars

# SageMath uses pplpy for Python bindings to the Parma Polyhedra Library.
VERSION = 0.9.0
URL = https://files.pythonhosted.org/packages/source/p/pplpy/pplpy-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/pplpy-${VERSION}.tar.gz
TARBALL_SHA256 = 8289c50d680ce3f9eacac666cb4cdbbd8a711959e7cc7cf06f7fdb4035d0cc5d
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

CPYTHON_WASM = ${CWD}/../../python/cpython/dist/wasm
PY_CYTHON = ${CWD}/../../python/py-cython/dist/wasm
PY_GMPY2 = ${CWD}/../../python/py-gmpy2/dist/wasm
POSIX_WASI_SDK = ${CWD}/../../core/posix-wasm/dist/wasi-sdk
LIBCXX_WASI_SDK = ${CWD}/../../core/libcxx/dist/wasi-sdk
CYSIGNALS_WASI_SDK = ${PACKAGES}/cysignals/dist/wasi-sdk
PPL_WASI_SDK = ${PACKAGES}/ppl/dist/wasi-sdk
GMP_WASI_SDK = ${PACKAGES}/gmp/dist/wasi-sdk

${CPYTHON_WASM}/include/python3.14/Python.h:
	$(MAKE) -C ${CWD}/../../python/cpython wasm

${PY_CYTHON}/Cython/Compiler/Main.pyc:
	$(MAKE) -C ${CWD}/../../python/py-cython wasm

${PY_GMPY2}/gmpy2/gmpy2.pxd:
	$(MAKE) -C ${CWD}/../../python/py-gmpy2 test-wasi-sdk-standalone

${POSIX_WASI_SDK}/posix-wasm.h:
	$(MAKE) -C ${CWD}/../../core/posix-wasm test-wasi-sdk-standalone

${LIBCXX_WASI_SDK}/libcxx.so:
	$(MAKE) -C ${CWD}/../../core/libcxx test-wasi-sdk-standalone

${CYSIGNALS_WASI_SDK}/cysignals/signals.pxd:
	$(MAKE) -C ${PACKAGES}/cysignals test-wasi-sdk-standalone

${PPL_WASI_SDK}/lib/libppl.so:
	$(MAKE) -C ${PACKAGES}/ppl test-wasi-sdk-standalone

${GMP_WASI_SDK}/lib/libgmp.a:
	$(MAKE) -C ${PACKAGES}/gmp test-wasi-sdk-standalone

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	touch ${BUILD_WASI_SDK}/.build

${BUILD_WASI_SDK}/.patched: ${BUILD_WASI_SDK}/.build
	cd ${BUILD_WASI_SDK} && patch -p1 < ${SRC}/patches/01-wasi-linear-expression-arithmetic.patch
	cd ${BUILD_WASI_SDK} && patch -p1 < ${SRC}/patches/02-wasi-polyhedron-constructors.patch
	touch ${BUILD_WASI_SDK}/.patched

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${CPYTHON_WASM}/include/python3.14/Python.h ${PY_CYTHON}/Cython/Compiler/Main.pyc ${PY_GMPY2}/gmpy2/gmpy2.pxd ${POSIX_WASI_SDK}/posix-wasm.h ${LIBCXX_WASI_SDK}/libcxx.so ${CYSIGNALS_WASI_SDK}/cysignals/signals.pxd ${PPL_WASI_SDK}/lib/libppl.so ${GMP_WASI_SDK}/lib/libgmp.a ${BUILD_WASI_SDK}/.patched
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${CPYTHON_WASM} ${PY_CYTHON} ${PY_GMPY2} ${POSIX_WASI_SDK} ${LIBCXX_WASI_SDK} ${CYSIGNALS_WASI_SDK} ${PPL_WASI_SDK} ${GMP_WASI_SDK} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

test: test-wasi-sdk-standalone
