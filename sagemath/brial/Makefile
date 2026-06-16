include ../build/Makefile-vars

# SageMath 10.8 ships BRiAl 1.2.15 as a standard Boolean polynomial package.
VERSION = 1.2.15
URL = https://github.com/BRiAl/BRiAl/releases/download/${VERSION}/brial-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/brial-${VERSION}.tar.gz
TARBALL_SHA256 = dde1bfbf90821af6bca7c4480a09d89c06c8d3153078b83e8ffce3ae03366f58
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

M4RI_WASI_SDK = ${PACKAGES}/m4ri/dist/wasi-sdk
BOOST_CROPPED_WASI_SDK = ${PACKAGES}/boost-cropped/dist/wasi-sdk

${M4RI_WASI_SDK}/lib/libm4ri.a:
	$(MAKE) -C ${PACKAGES}/m4ri test-wasi-sdk-standalone

${BOOST_CROPPED_WASI_SDK}/include/boost/version.hpp:
	$(MAKE) -C ${PACKAGES}/boost-cropped test-wasi-sdk-standalone

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	cd ${BUILD_WASI_SDK} && patch -p1 < ${SRC}/patches/01-wasi-fglm-main-name.patch
	touch ${BUILD_WASI_SDK}/.build

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${M4RI_WASI_SDK}/lib/libm4ri.a ${BOOST_CROPPED_WASI_SDK}/include/boost/version.hpp ${BUILD_WASI_SDK}/.build
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${M4RI_WASI_SDK} ${BOOST_CROPPED_WASI_SDK} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

test: test-wasi-sdk-standalone
