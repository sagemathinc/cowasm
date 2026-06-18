include ../build/Makefile-vars

# Controlled local Sagelite build probe.  This intentionally starts from the
# developer checkout named in agents/sagelite-build-plan.md.
SAGELITE_SOURCE ?= /home/user/sagelite
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

CPYTHON_WASM = ${CWD}/../../python/cpython/dist/wasm
PY_CYTHON = ${CWD}/../../python/py-cython/dist/wasm
PY_NUMPY = ${CWD}/../../python/py-numpy/dist/wasm
PY_GMPY2 = ${CWD}/../../python/py-gmpy2/dist/wasm
PY_MESON = ${CWD}/../../python/py-meson/dist/wasm
PY_NINJA = ${CWD}/../../python/py-ninja/dist/native
POSIX_WASI_SDK = ${CWD}/../../core/posix-wasm/dist/wasi-sdk
CYSIGNALS_WASI_SDK = ${PACKAGES}/cysignals/dist/wasi-sdk
MEMORY_ALLOCATOR_WASI_SDK = ${PACKAGES}/memory-allocator/dist/wasi-sdk

${CPYTHON_WASM}/include/python3.14/Python.h:
	$(MAKE) -C ${CWD}/../../python/cpython wasm

${PY_CYTHON}/Cython/Compiler/Main.pyc:
	$(MAKE) -C ${CWD}/../../python/py-cython wasm

${PY_NUMPY}/numpy/__init__.py:
	$(MAKE) -C ${CWD}/../../python/py-numpy wasm

${PY_GMPY2}/gmpy2/__init__.py:
	$(MAKE) -C ${CWD}/../../python/py-gmpy2 wasm

${PY_MESON}/mesonbuild/mesonmain.py:
	$(MAKE) -C ${CWD}/../../python/py-meson all

${PY_NINJA}/bin/ninja:
	$(MAKE) -C ${CWD}/../../python/py-ninja all

${POSIX_WASI_SDK}/posix-wasm.h:
	$(MAKE) -C ${CWD}/../../core/posix-wasm test-wasi-sdk-standalone

${CYSIGNALS_WASI_SDK}/cysignals/signals.pxd:
	$(MAKE) -C ${PACKAGES}/cysignals test-wasi-sdk-standalone

${MEMORY_ALLOCATOR_WASI_SDK}/memory_allocator/memory_allocator.pxd:
	$(MAKE) -C ${PACKAGES}/memory-allocator test-wasi-sdk-standalone

${BUILD_WASI_SDK}/.build:
	test -d ${SAGELITE_SOURCE}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	cd ${SAGELITE_SOURCE} && tar --exclude .git -cf - . | tar -xf - -C ${BUILD_WASI_SDK}
	touch ${BUILD_WASI_SDK}/.build

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${CPYTHON_WASM}/include/python3.14/Python.h ${PY_CYTHON}/Cython/Compiler/Main.pyc ${PY_NUMPY}/numpy/__init__.py ${PY_GMPY2}/gmpy2/__init__.py ${PY_MESON}/mesonbuild/mesonmain.py ${PY_NINJA}/bin/ninja ${POSIX_WASI_SDK}/posix-wasm.h ${CYSIGNALS_WASI_SDK}/cysignals/signals.pxd ${MEMORY_ALLOCATOR_WASI_SDK}/memory_allocator/memory_allocator.pxd ${BUILD_WASI_SDK}/.build
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${CPYTHON_WASM} ${PY_CYTHON} ${PY_NUMPY} ${PY_GMPY2} ${CYSIGNALS_WASI_SDK} ${MEMORY_ALLOCATOR_WASI_SDK} ${POSIX_WASI_SDK} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

.PHONY: clean
clean: clean-wasi-sdk
	rm -rf ${BUILD} ${DIST} node_modules

test: test-wasi-sdk-standalone
