include ../build/Makefile-vars

# SageMath ships MPFRCX 0.6.3 as an optional multiprecision polynomial package.
VERSION = 0.6.3
URL = https://www.multiprecision.org/downloads/mpfrcx-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/mpfrcx-${VERSION}.tar.gz
TARBALL_SHA256 = 9da9b3614c0a3e00e6ed2b82fc935d1c838d97074dc59cb388f8fafbe3db8594
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

GMP_WASI_SDK = ${PACKAGES}/gmp/dist/wasi-sdk
MPFR_WASI_SDK = ${PACKAGES}/mpfr/dist/wasi-sdk
MPC_WASI_SDK = ${PACKAGES}/mpc/dist/wasi-sdk

${GMP_WASI_SDK}/lib/libgmp.a:
	$(MAKE) -C ${PACKAGES}/gmp test-wasi-sdk-standalone

${MPFR_WASI_SDK}/lib/libmpfr.a: ${GMP_WASI_SDK}/lib/libgmp.a
	$(MAKE) -C ${PACKAGES}/mpfr test-wasi-sdk-standalone

${MPC_WASI_SDK}/lib/libmpc.a: ${GMP_WASI_SDK}/lib/libgmp.a ${MPFR_WASI_SDK}/lib/libmpfr.a
	$(MAKE) -C ${PACKAGES}/mpc test-wasi-sdk-standalone

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	touch ${BUILD_WASI_SDK}/.build

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${GMP_WASI_SDK}/lib/libgmp.a ${MPFR_WASI_SDK}/lib/libmpfr.a ${MPC_WASI_SDK}/lib/libmpc.a ${BUILD_WASI_SDK}/.build
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${GMP_WASI_SDK} ${MPFR_WASI_SDK} ${MPC_WASI_SDK} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

test: test-wasi-sdk-standalone
