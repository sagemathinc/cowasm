include ../build/Makefile-vars

# https://github.com/linbox-team/fflas-ffpack
VERSION = 2.5.0
URL = https://github.com/linbox-team/fflas-ffpack/releases/download/v${VERSION}/fflas-ffpack-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/fflas-ffpack-${VERSION}.tar.gz
TARBALL_SHA256 = dafb4c0835824d28e4f823748579be6e4c8889c9570c6ce9cce1e186c3ebbb23
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

GMP_WASI_SDK = ${PACKAGES}/gmp/dist/wasi-sdk
GIVARO_WASI_SDK = ${PACKAGES}/givaro/dist/wasi-sdk
GSL_WASI_SDK = ${PACKAGES}/gsl/dist/wasi-sdk

${GMP_WASI_SDK}/lib/libgmpxx.a:
	$(MAKE) -C ${PACKAGES}/gmp test-wasi-sdk-standalone

${GIVARO_WASI_SDK}/lib/libgivaro.a:
	$(MAKE) -C ${PACKAGES}/givaro test-wasi-sdk-standalone

${GSL_WASI_SDK}/lib/libgslcblas.a:
	$(MAKE) -C ${PACKAGES}/gsl test-wasi-sdk-standalone

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	touch ${BUILD_WASI_SDK}/.build

${BUILD_WASI_SDK}/.patched: ${BUILD_WASI_SDK}/.build
	cd ${BUILD_WASI_SDK} && \
		cat ${SRC}/patches/01-cross-compiler-name.patch | patch -p1
	touch ${BUILD_WASI_SDK}/.patched

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${GMP_WASI_SDK}/lib/libgmpxx.a ${GIVARO_WASI_SDK}/lib/libgivaro.a ${GSL_WASI_SDK}/lib/libgslcblas.a ${BUILD_WASI_SDK}/.patched
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${GMP_WASI_SDK} ${GIVARO_WASI_SDK} ${GSL_WASI_SDK} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

test: test-wasi-sdk-standalone
