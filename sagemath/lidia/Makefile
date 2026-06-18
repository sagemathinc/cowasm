include ../build/Makefile-vars

# SageMath uses LiDIA as a dependency of LattE integrale.
VERSION = 2.3.0+latte-patches-2019-05-02
URL = https://mirrors.mit.edu/sage/spkg/upstream/lidia/lidia-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/lidia-${VERSION}.tar.gz
TARBALL_SHA256 = a5a07e65fc48c9230e9669e4d968b4ede2cac234a49d0c8c93b85040d0d79c41
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
