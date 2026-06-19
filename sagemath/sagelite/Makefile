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
PY_JINJA2 = ${CWD}/../../python/py-jinja2/dist/wasm
PY_MESON = ${CWD}/../../python/py-meson/dist/wasm
PY_NINJA = ${CWD}/../../python/py-ninja/dist/native
POSIX_WASI_SDK = ${CWD}/../../core/posix-wasm/dist/wasi-sdk
CYSIGNALS_WASI_SDK = ${PACKAGES}/cysignals/dist/wasi-sdk
MEMORY_ALLOCATOR_WASI_SDK = ${PACKAGES}/memory-allocator/dist/wasi-sdk
CYPARI2_WASI_SDK = ${PACKAGES}/cypari2/dist/wasi-sdk
MPFI_WASI_SDK = ${PACKAGES}/mpfi/dist/wasi-sdk
NTL_WASI_SDK = ${PACKAGES}/ntl/dist/wasi-sdk
PARI_WASI_SDK = ${PACKAGES}/pari/dist/wasi-sdk
GSL_WASI_SDK = ${PACKAGES}/gsl/dist/wasi-sdk
LIBPNG_WASI_SDK = ${CWD}/../../core/libpng/dist/wasi-sdk

${CPYTHON_WASM}/include/python3.14/Python.h:
	$(MAKE) -C ${CWD}/../../python/cpython wasm

${PY_CYTHON}/Cython/Compiler/Main.pyc:
	$(MAKE) -C ${CWD}/../../python/py-cython wasm

${PY_NUMPY}/numpy/__init__.py:
	$(MAKE) -C ${CWD}/../../python/py-numpy wasm

${PY_GMPY2}/gmpy2/__init__.py:
	$(MAKE) -C ${CWD}/../../python/py-gmpy2 wasm

${PY_JINJA2}/jinja2/__init__.py:
	$(MAKE) -C ${CWD}/../../python/py-jinja2 wasm

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

${CYPARI2_WASI_SDK}/cypari2/auto_paridecl.pxd:
	$(MAKE) -C ${PACKAGES}/cypari2 test-wasi-sdk-standalone

${MPFI_WASI_SDK}/lib/libmpfi.a:
	$(MAKE) -C ${PACKAGES}/mpfi test-wasi-sdk-standalone

${NTL_WASI_SDK}/lib/libntl.a:
	$(MAKE) -C ${PACKAGES}/ntl test-wasi-sdk-standalone

${PARI_WASI_SDK}/lib/libpari.a:
	$(MAKE) -C ${PACKAGES}/pari test-wasi-sdk-standalone

${GSL_WASI_SDK}/lib/libgslcblas.a:
	$(MAKE) -C ${PACKAGES}/gsl test-wasi-sdk-standalone

${LIBPNG_WASI_SDK}/lib/libpng.a:
	$(MAKE) -C ${CWD}/../../core/libpng test-wasi-sdk-standalone

${BUILD_WASI_SDK}/.build:
	test -d ${SAGELITE_SOURCE}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	cd ${SAGELITE_SOURCE} && tar --exclude .git -cf - . | tar -xf - -C ${BUILD_WASI_SDK}
	touch ${BUILD_WASI_SDK}/.build

${BUILD_WASI_SDK}/.patched: ${BUILD_WASI_SDK}/.build
	cd ${BUILD_WASI_SDK} && patch -p1 < ${SRC}/patches/01-wasi-optional-host-libs.patch
	touch ${BUILD_WASI_SDK}/.patched

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${CPYTHON_WASM}/include/python3.14/Python.h ${PY_CYTHON}/Cython/Compiler/Main.pyc ${PY_NUMPY}/numpy/__init__.py ${PY_GMPY2}/gmpy2/__init__.py ${PY_JINJA2}/jinja2/__init__.py ${PY_MESON}/mesonbuild/mesonmain.py ${PY_NINJA}/bin/ninja ${POSIX_WASI_SDK}/posix-wasm.h ${CYSIGNALS_WASI_SDK}/cysignals/signals.pxd ${MEMORY_ALLOCATOR_WASI_SDK}/memory_allocator/memory_allocator.pxd ${CYPARI2_WASI_SDK}/cypari2/auto_paridecl.pxd ${MPFI_WASI_SDK}/lib/libmpfi.a ${NTL_WASI_SDK}/lib/libntl.a ${PARI_WASI_SDK}/lib/libpari.a ${GSL_WASI_SDK}/lib/libgslcblas.a ${LIBPNG_WASI_SDK}/lib/libpng.a ${BUILD_WASI_SDK}/.patched
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${CPYTHON_WASM} ${PY_CYTHON} ${PY_NUMPY} ${PY_GMPY2} ${PY_JINJA2} ${PY_MESON} ${PY_NINJA} ${CYSIGNALS_WASI_SDK} ${MEMORY_ALLOCATOR_WASI_SDK} ${POSIX_WASI_SDK} ${CYPARI2_WASI_SDK} || status=$$?; \
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
