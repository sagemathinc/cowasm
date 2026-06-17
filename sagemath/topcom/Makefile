include ../build/Makefile-vars

# TOPCOM computes triangulations of point configurations and oriented matroids.
VERSION = 1_1_2
PACKAGE_VERSION = 1.1.2
URL = https://github.com/sagemath/sage-package/releases/download/tars/TOPCOM-${VERSION}.tgz
TARBALL = ${UPSTREAM}/TOPCOM-${VERSION}.tgz
TARBALL_SHA256 = 4fb10754ee5b76056441fea98f2c8dee5db6f2984d8c14283b49239ad4378ab6
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

GMP_WASI_SDK = ${PACKAGES}/gmp/dist/wasi-sdk
CDDLIB_WASI_SDK = ${PACKAGES}/cddlib/dist/wasi-sdk

${GMP_WASI_SDK}/lib/libgmpxx.a:
	$(MAKE) -C ${PACKAGES}/gmp test-wasi-sdk-standalone

${CDDLIB_WASI_SDK}/lib/libcddgmp.a: ${GMP_WASI_SDK}/lib/libgmpxx.a
	$(MAKE) -C ${PACKAGES}/cddlib test-wasi-sdk-standalone

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	touch ${BUILD_WASI_SDK}/.build

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${GMP_WASI_SDK}/lib/libgmpxx.a ${CDDLIB_WASI_SDK}/lib/libcddgmp.a ${BUILD_WASI_SDK}/.build
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${GMP_WASI_SDK} ${CDDLIB_WASI_SDK} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

test: test-wasi-sdk-standalone
