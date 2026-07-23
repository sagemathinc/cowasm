include ../build/Makefile-vars

# Controlled local Sagelite build probe.  This intentionally starts from the
# developer checkout named in agents/sagelite-build-plan.md.
SAGELITE_SOURCE ?= /home/user/sagelite
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk
SAGELITE_DOCTEST_CORPUS ?= ${SRC}/doctest-corpus/basic-pure-math.txt
SAGELITE_DOCTEST_DB ?= ${DIST_WASI_SDK}/sagelite-doctests.sqlite3
SAGELITE_DOCTEST_PATH_ROOT ?= $(realpath ${CWD}/../..)
SAGELITE_DOCTEST_DB_PATH = $(strip $(if $(filter /%,${SAGELITE_DOCTEST_DB}),\
	${SAGELITE_DOCTEST_DB},\
	${SAGELITE_DOCTEST_PATH_ROOT}/${SAGELITE_DOCTEST_DB}))
SAGELITE_DOCTEST_SOURCE ?= ${BUILD_WASI_SDK}
SAGELITE_DOCTEST_PROFILE ?= node
SAGELITE_DOCTEST_TIMEOUT ?= 0
SAGELITE_DOCTEST_JOBS ?= 4
SAGELITE_DOCTEST_ALLOW_FAILURES ?= 1
SAGELITE_DOCTEST_CANDIDATE_MIN_PASSED ?= 1
SAGELITE_DOCTEST_CANDIDATE_INVALID_FLAGS ?= --ignore-invalid --quiet-invalid
SAGELITE_DOCTEST_CANDIDATE_MENTIONED ?= ${CWD}/../../agents/sagelite-test-driven-port-plan.md
SAGELITE_DOCTEST_CANDIDATE_DATABASES ?= ${SAGELITE_DOCTEST_DB_PATH}
SAGELITE_DOCTEST_CANDIDATE_DATABASE_GLOB_ROOT ?= ${SAGELITE_DOCTEST_PATH_ROOT}
SAGELITE_DOCTEST_CANDIDATE_DATABASE_GLOB ?=
SAGELITE_DOCTEST_CANDIDATE_FAIL_ON_ROWS ?= 0
SAGELITE_DOCTEST_CANDIDATE_FLAGS ?= --strict-frontier --min-runner-version 95
SAGELITE_DOCTEST_SOURCE_FRONTIER_MENTIONED ?= ${CWD}/../../agents/sagelite-test-driven-port-plan.md
SAGELITE_DOCTEST_SOURCE_FRONTIER_DATABASE_GLOB_ROOT ?= ${SAGELITE_DOCTEST_PATH_ROOT}
SAGELITE_DOCTEST_SOURCE_FRONTIER_DATABASE_GLOB ?=
SAGELITE_DOCTEST_SOURCE_FRONTIER_DATABASES ?=
SAGELITE_DOCTEST_SOURCE_FRONTIER_REQUIRE_DATABASE ?= 0
SAGELITE_DOCTEST_SOURCE_FRONTIER_SUBTRACT_FILE_ERRORS ?= 1
SAGELITE_DOCTEST_SOURCE_FRONTIER_FAIL_ON_ROWS ?= 0
SAGELITE_DOCTEST_SOURCE_FRONTIER_MIN_RUNNABLE_PROMPTS ?= 1
SAGELITE_DOCTEST_SOURCE_FRONTIER_EXTENSIONS ?=
SAGELITE_DOCTEST_SOURCE_FRONTIER_DATABASE_FLAGS ?= \
  --strict-frontier --min-runner-version 95 \
  --ignore-invalid-databases --quiet-invalid-databases
SAGELITE_DOCTEST_SOURCE_FRONTIER_FLAGS ?= --exclude-file-skip-directives
SAGELITE_DOCTEST_GUARDED_DATABASE_GLOB ?= \
  .tmp/current-run/**/*.sqlite3 .tmp/codex-sagelite/**/*.sqlite3
SAGELITE_DOCTEST_GUARDED_RUNNER_VERSION ?= 95
SAGELITE_DOCTEST_GUARDED_CANDIDATE_FLAGS = \
  --strict-frontier --min-runner-version ${SAGELITE_DOCTEST_GUARDED_RUNNER_VERSION}
SAGELITE_DOCTEST_GUARDED_DIAGNOSTIC_FLAGS = \
  ${SAGELITE_DOCTEST_GUARDED_CANDIDATE_FLAGS} \
  --suppress-superseded-failures --dedupe-paths \
  --include-failure-detail --failure-detail-limit 240
SAGELITE_DOCTEST_GUARDED_SOURCE_FLAGS = \
  --strict-frontier --min-runner-version ${SAGELITE_DOCTEST_GUARDED_RUNNER_VERSION} \
  --ignore-invalid-databases --quiet-invalid-databases

all: test-wasi-sdk-standalone

CPYTHON_WASM = ${CWD}/../../python/cpython/dist/wasi-sdk
CPYTHON_WASI_SDK_ZLIB = ${CPYTHON_WASM}/lib/python3.14/lib-dynload/zlib.cpython-314-wasm32-wasi.so
CPYTHON_WASI_SDK_BZ2 = ${CPYTHON_WASM}/lib/python3.14/lib-dynload/_bz2.cpython-314-wasm32-wasi.so
CPYTHON_WASI_SDK_UNICODEDATA = ${CPYTHON_WASM}/lib/python3.14/lib-dynload/unicodedata.cpython-314-wasm32-wasi.so
CPYTHON_WASI_SDK_SAGELITE_IMPORT_DEPS = \
	${CPYTHON_WASI_SDK_ZLIB} \
	${CPYTHON_WASI_SDK_BZ2} \
	${CPYTHON_WASI_SDK_UNICODEDATA}
PY_CYTHON = ${CWD}/../../python/py-cython/dist/wasm
PY_NUMPY = ${CWD}/../../python/py-numpy/dist/wasm
PY_GMPY2 = ${CWD}/../../python/py-gmpy2/dist/wasm
PY_MPMATH = ${CWD}/../../python/py-mpmath/dist/wasm
PY_JINJA2 = ${CWD}/../../python/py-jinja2/dist/wasm
PY_MESON = ${CWD}/../../python/py-meson/dist/wasm
PY_NINJA = ${CWD}/../../python/py-ninja/dist/native
PY_PACKAGING = ${CWD}/../../python/py-packaging/dist/wasm
PY_PLATFORMDIRS = ${CWD}/../../python/py-platformdirs/dist/wasm
PYTHON_WASM = ${CWD}/../../python/python-wasm
CONWAY_POLYNOMIALS_WASI_SDK = ${PACKAGES}/conway-polynomials/dist/wasi-sdk
PRIMECOUNTPY_WASI_SDK = ${PACKAGES}/primecountpy/dist/wasi-sdk
LRCALC_PYTHON_WASI_SDK = ${PACKAGES}/lrcalc-python/dist/wasi-sdk
POSIX_WASI_SDK = ${CWD}/../../core/posix-wasm/dist/wasi-sdk
LIBCXX_WASI_SDK = ${CWD}/../../core/libcxx/dist/wasi-sdk
CYSIGNALS_WASI_SDK = ${PACKAGES}/cysignals/dist/wasi-sdk
MEMORY_ALLOCATOR_WASI_SDK = ${PACKAGES}/memory-allocator/dist/wasi-sdk
CYPARI2_WASI_SDK = ${PACKAGES}/cypari2/dist/wasi-sdk
LIBBRAIDING_WASI_SDK = ${PACKAGES}/libbraiding/dist/wasi-sdk
RW_WASI_SDK = ${PACKAGES}/rw/dist/wasi-sdk
IML_WASI_SDK = ${PACKAGES}/iml/dist/wasi-sdk
BOOST_CROPPED_WASI_SDK = ${PACKAGES}/boost-cropped/dist/wasi-sdk
GMP_WASI_SDK = ${PACKAGES}/gmp/dist/wasi-sdk
GLPK_WASI_SDK = ${PACKAGES}/glpk/dist/wasi-sdk
NAUTY_WASI_SDK = ${PACKAGES}/nauty/dist/wasi-sdk
PLANARITY_WASI_SDK = ${PACKAGES}/planarity/dist/wasi-sdk
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

.PHONY: cpython-wasi-sdk-sagelite-imports
cpython-wasi-sdk-sagelite-imports:
	$(MAKE) -C ${CWD}/../../python/cpython \
		$(foreach dep,${CPYTHON_WASI_SDK_SAGELITE_IMPORT_DEPS},$(abspath ${dep}))

${PY_CYTHON}/Cython/Compiler/Main.pyc:
	$(MAKE) -C ${CWD}/../../python/py-cython wasm

${PY_NUMPY}/numpy/__init__.py:
	$(MAKE) -C ${CWD}/../../python/py-numpy wasm

${PY_GMPY2}/gmpy2/__init__.py:
	$(MAKE) -C ${CWD}/../../python/py-gmpy2 wasm

${PY_MPMATH}/mpmath/__init__.py:
	$(MAKE) -C ${CWD}/../../python/py-mpmath test-wasi-sdk-standalone

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

${LRCALC_PYTHON_WASI_SDK}/lrcalc.cpython-314-wasm32-wasi.so:
	$(MAKE) -C ${PACKAGES}/lrcalc-python test-wasi-sdk-standalone

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

${LIBBRAIDING_WASI_SDK}/lib/libbraiding.a:
	$(MAKE) -C ${PACKAGES}/libbraiding test-wasi-sdk-standalone

${RW_WASI_SDK}/lib/librw.a:
	$(MAKE) -C ${PACKAGES}/rw test-wasi-sdk-standalone

${IML_WASI_SDK}/lib/libiml.a:
	$(MAKE) -C ${PACKAGES}/iml test-wasi-sdk-standalone

${BOOST_CROPPED_WASI_SDK}/include/boost/graph/adjacency_list.hpp:
	$(MAKE) -C ${PACKAGES}/boost-cropped test-wasi-sdk-standalone

${GMP_WASI_SDK}/lib/libgmp.a:
	$(MAKE) -C ${PACKAGES}/gmp test-wasi-sdk-standalone

${GLPK_WASI_SDK}/lib/libglpk.a:
	$(MAKE) -C ${PACKAGES}/glpk test-wasi-sdk-standalone

${NAUTY_WASI_SDK}/bin/geng:
	$(MAKE) -C ${PACKAGES}/nauty test-wasi-sdk-standalone

${PLANARITY_WASI_SDK}/lib/libplanarity.a:
	$(MAKE) -C ${PACKAGES}/planarity test-wasi-sdk-standalone

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

.PHONY: test-sagelite-patch-syntax
test-sagelite-patch-syntax:
	git apply --numstat ${SRC}/patches/01-wasi-optional-host-libs.patch > /dev/null

${BUILD_WASI_SDK}/.build: ${SRC}/patches/01-wasi-optional-host-libs.patch | test-sagelite-patch-syntax
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
test-wasi-sdk-standalone: ${CPYTHON_WASM}/include/python3.14/Python.h cpython-wasi-sdk-sagelite-imports ${PY_CYTHON}/Cython/Compiler/Main.pyc ${PY_NUMPY}/numpy/__init__.py ${PY_GMPY2}/gmpy2/__init__.py ${PY_MPMATH}/mpmath/__init__.py ${PY_JINJA2}/jinja2/__init__.py ${PY_MESON}/mesonbuild/mesonmain.py ${PY_NINJA}/bin/ninja ${PY_PACKAGING}/packaging/__init__.pyc ${PY_PLATFORMDIRS}/platformdirs/__init__.py ${PYTHON_WASM}/dist/.built ${PYTHON_WASM}/dist/python.wasm ${CONWAY_POLYNOMIALS_WASI_SDK}/conway_polynomials/__init__.py ${PRIMECOUNTPY_WASI_SDK}/primecountpy/primecount.cpython-314-wasm32-wasi.so ${LRCALC_PYTHON_WASI_SDK}/lrcalc.cpython-314-wasm32-wasi.so ${POSIX_WASI_SDK}/posix-wasm.h ${LIBCXX_WASI_SDK}/libcxx.so ${CYSIGNALS_WASI_SDK}/cysignals/signals.pxd ${MEMORY_ALLOCATOR_WASI_SDK}/memory_allocator/memory_allocator.pxd ${CYPARI2_WASI_SDK}/cypari2/auto_paridecl.pxd ${LIBBRAIDING_WASI_SDK}/lib/libbraiding.a ${RW_WASI_SDK}/lib/librw.a ${IML_WASI_SDK}/lib/libiml.a ${BOOST_CROPPED_WASI_SDK}/include/boost/graph/adjacency_list.hpp ${GMP_WASI_SDK}/lib/libgmp.a ${GLPK_WASI_SDK}/lib/libglpk.a ${NAUTY_WASI_SDK}/bin/geng ${PLANARITY_WASI_SDK}/lib/libplanarity.a ${MPFR_WASI_SDK}/include/mpfr.h ${MPFI_WASI_SDK}/lib/libmpfi.a ${GF2X_WASI_SDK}/lib/libgf2x.a ${NTL_WASI_SDK}/lib/libntl.a ${PARI_WASI_SDK}/lib/libpari.a ${GSL_WASI_SDK}/lib/libgslcblas.a ${M4RI_WASI_SDK}/include/m4ri/m4ri.h ${M4RIE_WASI_SDK}/include/m4rie/m4rie.h ${LIBPNG_WASI_SDK}/lib/libpng.a ${BUILD_WASI_SDK}/.cowasm-sagelite-source-revision ${BUILD_WASI_SDK}/.cowasm-sagelite-source-tree-state ${BUILD_WASI_SDK}/.patched
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${CPYTHON_WASM} ${PY_CYTHON} ${PY_NUMPY} ${PY_GMPY2} ${PY_MPMATH} ${PY_JINJA2} ${PY_MESON} ${PY_NINJA} ${PY_PACKAGING} ${PY_PLATFORMDIRS} ${PYTHON_WASM} ${CONWAY_POLYNOMIALS_WASI_SDK} ${PRIMECOUNTPY_WASI_SDK} ${LRCALC_PYTHON_WASI_SDK} ${CYSIGNALS_WASI_SDK} ${MEMORY_ALLOCATOR_WASI_SDK} ${POSIX_WASI_SDK} ${LIBCXX_WASI_SDK} ${CYPARI2_WASI_SDK} ${LIBBRAIDING_WASI_SDK} ${RW_WASI_SDK} ${IML_WASI_SDK} ${GLPK_WASI_SDK} ${NAUTY_WASI_SDK} ${PLANARITY_WASI_SDK} || status=$$?; \
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
	mkdir -p "$$(dirname ${SAGELITE_DOCTEST_DB_PATH})"
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
	COWASM_SAGELITE_DOCTEST_JOBS="${SAGELITE_DOCTEST_JOBS}" \
	${CWD}/bin/sage -t \
	  --profile "${SAGELITE_DOCTEST_PROFILE}" \
	  --timeout "${SAGELITE_DOCTEST_TIMEOUT}" \
	  --sqlite "${SAGELITE_DOCTEST_DB_PATH}" \
	  $$files || status=$$?; \
	if [ "$$status" -ne 0 ]; then \
	  echo "Sagelite doctest corpus completed with doctest failures; results are in ${SAGELITE_DOCTEST_DB_PATH}." >&2; \
	  if [ "${SAGELITE_DOCTEST_ALLOW_FAILURES}" != "1" ]; then exit "$$status"; fi; \
	fi

.PHONY: sage-doctest-candidates
sage-doctest-candidates:
	python3 ${SRC}/doctest-corpus-candidates.py \
	  --corpus "${SAGELITE_DOCTEST_CORPUS}" \
	  --source-root "${SAGELITE_DOCTEST_SOURCE}" \
	  --min-passed "${SAGELITE_DOCTEST_CANDIDATE_MIN_PASSED}" \
	  $(foreach path,${SAGELITE_DOCTEST_CANDIDATE_MENTIONED},--mentioned-file "$(if $(filter /%,$(path)),$(path),${SAGELITE_DOCTEST_PATH_ROOT}/$(path))") \
	  $(foreach pattern,${SAGELITE_DOCTEST_CANDIDATE_DATABASE_GLOB},--database-glob "$(if $(filter /%,$(pattern)),$(pattern),${SAGELITE_DOCTEST_CANDIDATE_DATABASE_GLOB_ROOT}/$(pattern))") \
	  $(foreach database,${SAGELITE_DOCTEST_CANDIDATE_DATABASES},"$(if $(filter /%,$(database)),$(database),${SAGELITE_DOCTEST_PATH_ROOT}/$(database))") \
	  $(if $(filter 1 true yes,${SAGELITE_DOCTEST_CANDIDATE_FAIL_ON_ROWS}),--fail-on-rows,) \
	  ${SAGELITE_DOCTEST_CANDIDATE_INVALID_FLAGS} \
	  ${SAGELITE_DOCTEST_CANDIDATE_FLAGS}

.PHONY: sage-doctest-candidate-paths
sage-doctest-candidate-paths: SAGELITE_DOCTEST_CANDIDATE_FLAGS += --paths-only
sage-doctest-candidate-paths: sage-doctest-candidates

.PHONY: sage-doctest-guarded-frontier-check
sage-doctest-guarded-frontier-check:
	$(MAKE) -C ${CWD} sage-doctest-candidates \
	  SAGELITE_DOCTEST_CANDIDATE_DATABASES= \
	  'SAGELITE_DOCTEST_CANDIDATE_DATABASE_GLOB=${SAGELITE_DOCTEST_GUARDED_DATABASE_GLOB}' \
	  'SAGELITE_DOCTEST_CANDIDATE_FLAGS=${SAGELITE_DOCTEST_GUARDED_CANDIDATE_FLAGS}'
	$(MAKE) -C ${CWD} sage-doctest-candidates \
	  SAGELITE_DOCTEST_CANDIDATE_DATABASES= \
	  'SAGELITE_DOCTEST_CANDIDATE_DATABASE_GLOB=${SAGELITE_DOCTEST_GUARDED_DATABASE_GLOB}' \
	  'SAGELITE_DOCTEST_CANDIDATE_FLAGS=${SAGELITE_DOCTEST_GUARDED_DIAGNOSTIC_FLAGS} --near-misses'
	$(MAKE) -C ${CWD} sage-doctest-candidates \
	  SAGELITE_DOCTEST_CANDIDATE_DATABASES= \
	  'SAGELITE_DOCTEST_CANDIDATE_DATABASE_GLOB=${SAGELITE_DOCTEST_GUARDED_DATABASE_GLOB}' \
	  'SAGELITE_DOCTEST_CANDIDATE_FLAGS=${SAGELITE_DOCTEST_GUARDED_DIAGNOSTIC_FLAGS} --file-errors'
	$(MAKE) -C ${CWD} sage-doctest-candidates \
	  SAGELITE_DOCTEST_CANDIDATE_DATABASES= \
	  'SAGELITE_DOCTEST_CANDIDATE_DATABASE_GLOB=${SAGELITE_DOCTEST_GUARDED_DATABASE_GLOB}' \
	  'SAGELITE_DOCTEST_CANDIDATE_FLAGS=${SAGELITE_DOCTEST_GUARDED_CANDIDATE_FLAGS} --skipped-only --exclude-file-skip-directives --include-skip-tags --include-skip-reasons --dedupe-paths'
	$(MAKE) -C ${CWD} sage-doctest-source-frontier \
	  'SAGELITE_DOCTEST_SOURCE_FRONTIER_DATABASE_GLOB=${SAGELITE_DOCTEST_GUARDED_DATABASE_GLOB}' \
	  'SAGELITE_DOCTEST_SOURCE_FRONTIER_DATABASE_FLAGS=${SAGELITE_DOCTEST_GUARDED_SOURCE_FLAGS}' \
	  SAGELITE_DOCTEST_SOURCE_FRONTIER_FLAGS=--exclude-file-skip-directives

.PHONY: sage-doctest-source-frontier
sage-doctest-source-frontier:
	python3 ${SRC}/doctest-source-frontier.py \
	  --corpus "${SAGELITE_DOCTEST_CORPUS}" \
	  --source-root "${SAGELITE_DOCTEST_SOURCE}" \
	  $(foreach path,${SAGELITE_DOCTEST_SOURCE_FRONTIER_MENTIONED},--mentioned-file "$(if $(filter /%,$(path)),$(path),${SAGELITE_DOCTEST_PATH_ROOT}/$(path))") \
	  $(foreach database,${SAGELITE_DOCTEST_SOURCE_FRONTIER_DATABASES},--subtract-database "$(if $(filter /%,$(database)),$(database),${SAGELITE_DOCTEST_PATH_ROOT}/$(database))") \
	  $(foreach pattern,${SAGELITE_DOCTEST_SOURCE_FRONTIER_DATABASE_GLOB},--subtract-database-glob "$(if $(filter /%,$(pattern)),$(pattern),${SAGELITE_DOCTEST_SOURCE_FRONTIER_DATABASE_GLOB_ROOT}/$(pattern))") \
	  $(if $(filter 1 true yes,${SAGELITE_DOCTEST_SOURCE_FRONTIER_REQUIRE_DATABASE}),--require-subtraction-database,) \
	  $(if $(filter 1 true yes,${SAGELITE_DOCTEST_SOURCE_FRONTIER_SUBTRACT_FILE_ERRORS}),--subtract-file-error-runs,) \
	  $(if $(filter 1 true yes,${SAGELITE_DOCTEST_SOURCE_FRONTIER_FAIL_ON_ROWS}),--fail-on-rows,) \
	  $(if $(filter-out 0,${SAGELITE_DOCTEST_SOURCE_FRONTIER_MIN_RUNNABLE_PROMPTS}),--min-runnable-prompts "${SAGELITE_DOCTEST_SOURCE_FRONTIER_MIN_RUNNABLE_PROMPTS}",) \
	  $(foreach extension,${SAGELITE_DOCTEST_SOURCE_FRONTIER_EXTENSIONS},--extension "$(extension)") \
	  ${SAGELITE_DOCTEST_SOURCE_FRONTIER_DATABASE_FLAGS} \
	  ${SAGELITE_DOCTEST_SOURCE_FRONTIER_FLAGS}

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

.PHONY: clean
clean: clean-wasi-sdk
	rm -rf ${BUILD} ${DIST} node_modules

test: test-wasi-sdk-standalone
