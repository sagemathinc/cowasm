include ../build/Makefile-vars

# SageMath's tdlib package is the treedec library for tree decompositions.
VERSION = 0.9.3
URL = https://github.com/freetdi/tdlib/archive/refs/tags/${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/tdlib-${VERSION}.tar.gz
TARBALL_SHA256 = d1730c98f41dcb23bbd0bd8de9dbec51df015304f28a38935848925901594ae8
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

BOOST_CROPPED_WASI_SDK = ${PACKAGES}/boost-cropped/dist/wasi-sdk

${BOOST_CROPPED_WASI_SDK}/include/boost/version.hpp:
	$(MAKE) -C ${PACKAGES}/boost-cropped test-wasi-sdk-standalone

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	cd ${BUILD_WASI_SDK} && ./bootstrap
	touch ${BUILD_WASI_SDK}/.build

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${BOOST_CROPPED_WASI_SDK}/include/boost/version.hpp ${BUILD_WASI_SDK}/.build
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	MAKEFLAGS= MFLAGS= MAKELEVEL=0 ${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${BOOST_CROPPED_WASI_SDK} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

test: test-wasi-sdk-standalone
