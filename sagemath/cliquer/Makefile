include ../build/Makefile-vars

# SageMath ships Cliquer as a standard graph-theory package.
VERSION = 1.22
URL = https://github.com/dimpase/autocliquer/releases/download/v${VERSION}/cliquer-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/cliquer-${VERSION}.tar.gz
TARBALL_SHA256 = 6ff79e1e9983ebabbca3dd276a8a310cbdeb48c7adf95f37abd83129b566340e
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	cd ${BUILD_WASI_SDK} && patch -p1 < ${SRC}/patches/01-wasi-times-compat.patch
	touch ${BUILD_WASI_SDK}/.build

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${BUILD_WASI_SDK}/.build
	cd ../../core/build && make wasi-sdk-next
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN}

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

test: test-wasi-sdk-standalone
