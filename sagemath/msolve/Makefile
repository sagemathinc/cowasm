include ../build/Makefile-vars

# SageMath 10.8 carries msolve 0.8.0 as an optional polynomial-system solver.
VERSION = 0.8.0
URL = https://mirrors.mit.edu/sage/spkg/upstream/msolve/msolve-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/msolve-${VERSION}.tar.gz
TARBALL_SHA256 = 319ba0de67dca967dea40cb6e4dacf44eab387c2f0c2416b71842c11affbadfd
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

GMP_WASI_SDK = ${PACKAGES}/gmp/dist/wasi-sdk
MPFR_WASI_SDK = ${PACKAGES}/mpfr/dist/wasi-sdk
FLINT_WASI_SDK = ${PACKAGES}/flint/dist/wasi-sdk

${GMP_WASI_SDK}/lib/libgmp.a:
	$(MAKE) -C ${PACKAGES}/gmp test-wasi-sdk-standalone

${MPFR_WASI_SDK}/lib/libmpfr.a: ${GMP_WASI_SDK}/lib/libgmp.a
	$(MAKE) -C ${PACKAGES}/mpfr test-wasi-sdk-standalone

${FLINT_WASI_SDK}/lib/libflint.a: ${GMP_WASI_SDK}/lib/libgmp.a ${MPFR_WASI_SDK}/lib/libmpfr.a
	$(MAKE) -C ${PACKAGES}/flint test-wasi-sdk-standalone

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	cd ${BUILD_WASI_SDK} && patch -p1 < ${SRC}/patches/01-blockwied-guard.patch
	touch ${BUILD_WASI_SDK}/.build

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${GMP_WASI_SDK}/lib/libgmp.a ${MPFR_WASI_SDK}/lib/libmpfr.a ${FLINT_WASI_SDK}/lib/libflint.a ${BUILD_WASI_SDK}/.build
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${GMP_WASI_SDK} ${MPFR_WASI_SDK} ${FLINT_WASI_SDK} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

test: test-wasi-sdk-standalone
