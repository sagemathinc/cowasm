include ../build/Makefile-vars

# Controlled local Sagelite build probe.  This intentionally starts from the
# developer checkout named in agents/sagelite-build-plan.md.
SAGELITE_SOURCE ?= /home/user/sagelite
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk
SAGELITE_DOCTEST_CORPUS ?= ${SRC}/doctest-corpus/basic-pure-math.txt
SAGELITE_DOCTEST_DB ?= ${DIST_WASI_SDK}/sagelite-doctests.sqlite3
SAGELITE_DOCTEST_SOURCE ?= ${BUILD_WASI_SDK}
SAGELITE_DOCTEST_PROFILE ?= node
SAGELITE_DOCTEST_TIMEOUT ?= 0
SAGELITE_DOCTEST_ALLOW_FAILURES ?= 1

all: test-wasi-sdk-standalone

CPYTHON_WASM = ${CWD}/../../python/cpython/dist/wasi-sdk
PY_CYTHON = ${CWD}/../../python/py-cython/dist/wasm
PY_NUMPY = ${CWD}/../../python/py-numpy/dist/wasm
PY_GMPY2 = ${CWD}/../../python/py-gmpy2/dist/wasm
PY_JINJA2 = ${CWD}/../../python/py-jinja2/dist/wasm
PY_MESON = ${CWD}/../../python/py-meson/dist/wasm
PY_NINJA = ${CWD}/../../python/py-ninja/dist/native
PY_PACKAGING = ${CWD}/../../python/py-packaging/dist/wasm
PY_PLATFORMDIRS = ${CWD}/../../python/py-platformdirs/dist/wasm
PYTHON_WASM = ${CWD}/../../python/python-wasm
CONWAY_POLYNOMIALS_WASI_SDK = ${PACKAGES}/conway-polynomials/dist/wasi-sdk
PRIMECOUNTPY_WASI_SDK = ${PACKAGES}/primecountpy/dist/wasi-sdk
POSIX_WASI_SDK = ${CWD}/../../core/posix-wasm/dist/wasi-sdk
LIBCXX_WASI_SDK = ${CWD}/../../core/libcxx/dist/wasi-sdk
CYSIGNALS_WASI_SDK = ${PACKAGES}/cysignals/dist/wasi-sdk
MEMORY_ALLOCATOR_WASI_SDK = ${PACKAGES}/memory-allocator/dist/wasi-sdk
CYPARI2_WASI_SDK = ${PACKAGES}/cypari2/dist/wasi-sdk
BOOST_CROPPED_WASI_SDK = ${PACKAGES}/boost-cropped/dist/wasi-sdk
GMP_WASI_SDK = ${PACKAGES}/gmp/dist/wasi-sdk
MPFR_WASI_SDK = ${PACKAGES}/mpfr/dist/wasi-sdk
MPFI_WASI_SDK = ${PACKAGES}/mpfi/dist/wasi-sdk
GF2X_WASI_SDK = ${PACKAGES}/gf2x/dist/wasi-sdk
NTL_WASI_SDK = ${PACKAGES}/ntl/dist/wasi-sdk
PARI_WASI_SDK = ${PACKAGES}/pari/dist/wasi-sdk
GSL_WASI_SDK = ${PACKAGES}/gsl/dist/wasi-sdk
M4RI_WASI_SDK = ${PACKAGES}/m4ri/dist/wasi-sdk
M4RIE_WASI_SDK = ${PACKAGES}/m4rie/dist/wasi-sdk
LIBPNG_WASI_SDK = ${CWD}/../../core/libpng/dist/wasi-sdk

${CPYTHON_WASM}/include/python3.14/Python.h:
	$(MAKE) -C ${CWD}/../../python/cpython wasi-sdk-cpython

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

${PY_PACKAGING}/packaging/__init__.pyc:
	$(MAKE) -C ${CWD}/../../python/py-packaging wasm

${PY_PLATFORMDIRS}/platformdirs/__init__.py:
	$(MAKE) -C ${CWD}/../../python/py-platformdirs wasm

${PYTHON_WASM}/dist/.built ${PYTHON_WASM}/dist/python.wasm:
	$(MAKE) -C ${PYTHON_WASM} all

${CONWAY_POLYNOMIALS_WASI_SDK}/conway_polynomials/__init__.py:
	$(MAKE) -C ${PACKAGES}/conway-polynomials test-wasi-sdk-standalone

${PRIMECOUNTPY_WASI_SDK}/primecountpy/primecount.cpython-314-wasm32-wasi.so:
	$(MAKE) -C ${PACKAGES}/primecountpy test-wasi-sdk-standalone

${POSIX_WASI_SDK}/posix-wasm.h:
	$(MAKE) -C ${CWD}/../../core/posix-wasm test-wasi-sdk-standalone

${LIBCXX_WASI_SDK}/libcxx.so:
	$(MAKE) -C ${CWD}/../../core/libcxx test-wasi-sdk-standalone

${CYSIGNALS_WASI_SDK}/cysignals/signals.pxd:
	$(MAKE) -C ${PACKAGES}/cysignals test-wasi-sdk-standalone

${MEMORY_ALLOCATOR_WASI_SDK}/memory_allocator/memory_allocator.pxd:
	$(MAKE) -C ${PACKAGES}/memory-allocator test-wasi-sdk-standalone

${CYPARI2_WASI_SDK}/cypari2/auto_paridecl.pxd:
	$(MAKE) -C ${PACKAGES}/cypari2 test-wasi-sdk-standalone

${BOOST_CROPPED_WASI_SDK}/include/boost/graph/adjacency_list.hpp:
	$(MAKE) -C ${PACKAGES}/boost-cropped test-wasi-sdk-standalone

${GMP_WASI_SDK}/lib/libgmp.a:
	$(MAKE) -C ${PACKAGES}/gmp test-wasi-sdk-standalone

${MPFR_WASI_SDK}/include/mpfr.h:
	$(MAKE) -C ${PACKAGES}/mpfr test-wasi-sdk-standalone

${MPFI_WASI_SDK}/lib/libmpfi.a:
	$(MAKE) -C ${PACKAGES}/mpfi test-wasi-sdk-standalone

${GF2X_WASI_SDK}/lib/libgf2x.a:
	$(MAKE) -C ${PACKAGES}/gf2x test-wasi-sdk-standalone

${NTL_WASI_SDK}/lib/libntl.a:
	$(MAKE) -C ${PACKAGES}/ntl test-wasi-sdk-standalone

${PARI_WASI_SDK}/lib/libpari.a:
	$(MAKE) -C ${PACKAGES}/pari test-wasi-sdk-standalone

${GSL_WASI_SDK}/lib/libgslcblas.a:
	$(MAKE) -C ${PACKAGES}/gsl test-wasi-sdk-standalone

${M4RI_WASI_SDK}/include/m4ri/m4ri.h:
	$(MAKE) -C ${PACKAGES}/m4ri test-wasi-sdk-standalone

${M4RIE_WASI_SDK}/include/m4rie/m4rie.h:
	$(MAKE) -C ${PACKAGES}/m4rie test-wasi-sdk-standalone

${LIBPNG_WASI_SDK}/lib/libpng.a:
	$(MAKE) -C ${CWD}/../../core/libpng test-wasi-sdk-standalone

${BUILD_WASI_SDK}/.build: ${SRC}/patches/01-wasi-optional-host-libs.patch
	test -d ${SAGELITE_SOURCE}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	cd ${SAGELITE_SOURCE} && tar --exclude .git -cf - . | tar -xf - -C ${BUILD_WASI_SDK}
	git -C ${SAGELITE_SOURCE} rev-parse --verify HEAD > ${BUILD_WASI_SDK}/.cowasm-sagelite-source-revision
	touch ${BUILD_WASI_SDK}/.build

force-sagelite-source-metadata:

.PHONY: force-sagelite-source-metadata

${BUILD_WASI_SDK}/.cowasm-sagelite-source-revision: force-sagelite-source-metadata | ${BUILD_WASI_SDK}/.build
	git -C ${SAGELITE_SOURCE} rev-parse --verify HEAD > $@

${BUILD_WASI_SDK}/.cowasm-sagelite-source-tree-state: force-sagelite-source-metadata | ${BUILD_WASI_SDK}/.build
	if [ -z "$$(git -C ${SAGELITE_SOURCE} status --porcelain --untracked-files=all)" ]; then \
	  echo clean > $@; \
	else \
	  echo dirty > $@; \
	fi

${BUILD_WASI_SDK}/.patched: ${BUILD_WASI_SDK}/.build ${SRC}/patches/01-wasi-optional-host-libs.patch
	cd ${BUILD_WASI_SDK} && patch -p1 < ${SRC}/patches/01-wasi-optional-host-libs.patch
	touch ${BUILD_WASI_SDK}/.patched

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${CPYTHON_WASM}/include/python3.14/Python.h ${PY_CYTHON}/Cython/Compiler/Main.pyc ${PY_NUMPY}/numpy/__init__.py ${PY_GMPY2}/gmpy2/__init__.py ${PY_JINJA2}/jinja2/__init__.py ${PY_MESON}/mesonbuild/mesonmain.py ${PY_NINJA}/bin/ninja ${PY_PACKAGING}/packaging/__init__.pyc ${PY_PLATFORMDIRS}/platformdirs/__init__.py ${PYTHON_WASM}/dist/.built ${PYTHON_WASM}/dist/python.wasm ${CONWAY_POLYNOMIALS_WASI_SDK}/conway_polynomials/__init__.py ${PRIMECOUNTPY_WASI_SDK}/primecountpy/primecount.cpython-314-wasm32-wasi.so ${POSIX_WASI_SDK}/posix-wasm.h ${LIBCXX_WASI_SDK}/libcxx.so ${CYSIGNALS_WASI_SDK}/cysignals/signals.pxd ${MEMORY_ALLOCATOR_WASI_SDK}/memory_allocator/memory_allocator.pxd ${CYPARI2_WASI_SDK}/cypari2/auto_paridecl.pxd ${BOOST_CROPPED_WASI_SDK}/include/boost/graph/adjacency_list.hpp ${GMP_WASI_SDK}/lib/libgmp.a ${MPFR_WASI_SDK}/include/mpfr.h ${MPFI_WASI_SDK}/lib/libmpfi.a ${GF2X_WASI_SDK}/lib/libgf2x.a ${NTL_WASI_SDK}/lib/libntl.a ${PARI_WASI_SDK}/lib/libpari.a ${GSL_WASI_SDK}/lib/libgslcblas.a ${M4RI_WASI_SDK}/include/m4ri/m4ri.h ${M4RIE_WASI_SDK}/include/m4rie/m4rie.h ${LIBPNG_WASI_SDK}/lib/libpng.a ${BUILD_WASI_SDK}/.cowasm-sagelite-source-revision ${BUILD_WASI_SDK}/.cowasm-sagelite-source-tree-state ${BUILD_WASI_SDK}/.patched
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${CPYTHON_WASM} ${PY_CYTHON} ${PY_NUMPY} ${PY_GMPY2} ${PY_JINJA2} ${PY_MESON} ${PY_NINJA} ${PY_PACKAGING} ${PY_PLATFORMDIRS} ${PYTHON_WASM} ${CONWAY_POLYNOMIALS_WASI_SDK} ${PRIMECOUNTPY_WASI_SDK} ${CYSIGNALS_WASI_SDK} ${MEMORY_ALLOCATOR_WASI_SDK} ${POSIX_WASI_SDK} ${LIBCXX_WASI_SDK} ${CYPARI2_WASI_SDK} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: test-sage-doctest-corpus
test-sage-doctest-corpus: ${BUILD_WASI_SDK}/.patched
	test -f ${DIST_WASI_SDK}/electron-resources/sagelite-electron-resources.json || \
	  (echo "Sagelite Electron resources are missing; run make -C sagemath/sagelite test-wasi-sdk-standalone first." >&2; exit 2)
	test -f ${SAGELITE_DOCTEST_CORPUS}
	test -d ${SAGELITE_DOCTEST_SOURCE}
	mkdir -p "$$(dirname ${SAGELITE_DOCTEST_DB})"
	@files="$$(grep -Ev '^[[:space:]]*($$|#)' ${SAGELITE_DOCTEST_CORPUS} | \
	  while IFS= read -r file; do \
	    case "$$file" in \
	      /*) printf '%s\n' "$$file" ;; \
	      *) printf '%s\n' "${SAGELITE_DOCTEST_SOURCE}/$$file" ;; \
	    esac; \
	  done)"; \
	status=0; \
	COWASM_PYTHON_WASM_NODE="${PYTHON_WASM}/dist/node.js" \
	COWASM_SAGELITE_ELECTRON_RESOURCES="${DIST_WASI_SDK}/electron-resources" \
	COWASM_SAGELITE_DOCTEST_SOURCE_ROOT="${SAGELITE_DOCTEST_SOURCE}" \
	${CWD}/bin/sage -t \
	  --profile "${SAGELITE_DOCTEST_PROFILE}" \
	  --timeout "${SAGELITE_DOCTEST_TIMEOUT}" \
	  --sqlite "${SAGELITE_DOCTEST_DB}" \
	  $$files || status=$$?; \
	if [ "$$status" -ne 0 ]; then \
	  echo "Sagelite doctest corpus completed with doctest failures; results are in ${SAGELITE_DOCTEST_DB}." >&2; \
	  if [ "${SAGELITE_DOCTEST_ALLOW_FAILURES}" != "1" ]; then exit "$$status"; fi; \
	fi

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

.PHONY: clean
clean: clean-wasi-sdk
	rm -rf ${BUILD} ${DIST} node_modules

test: test-wasi-sdk-standalone
