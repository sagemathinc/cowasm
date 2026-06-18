include ../build/Makefile-vars

# SageMath ships isl as an optional GMP-backed integer set library.
VERSION = 0.20
URL = https://mirrors.mit.edu/sage/spkg/upstream/isl/isl-${VERSION}.tar.bz2
TARBALL = ${UPSTREAM}/isl-${VERSION}.tar.bz2
TARBALL_SHA256 = b587e083eb65a8b394e833dea1744f21af3f0e413a448c17536b5549ae42a4c2
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk
GMP_WASI_SDK = ${PACKAGES}/gmp/dist/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

${GMP_WASI_SDK}/lib/libgmp.a:
	$(MAKE) -C ${PACKAGES}/gmp test-wasi-sdk-standalone

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	touch ${BUILD_WASI_SDK}/.build

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${GMP_WASI_SDK}/lib/libgmp.a ${BUILD_WASI_SDK}/.build
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${GMP_WASI_SDK} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

test: test-wasi-sdk-standalone
