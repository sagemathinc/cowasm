include ../build/Makefile-vars

# Sage can use buckygen as an optional generator for fullerene graphs.
VERSION = 1.1
URL = https://caagt.ugent.be/buckygen/buckygen-${VERSION}.zip
TARBALL = ${UPSTREAM}/buckygen-${VERSION}.zip
TARBALL_SHA256 = c151b33078913bed7f72977821d246c6dda5e01b64a53d963b5f95b65852e634
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	unzip -q ${TARBALL} -d ${BUILD_WASI_SDK}
	mv ${BUILD_WASI_SDK}/buckygen-${VERSION}/* ${BUILD_WASI_SDK}/
	rmdir ${BUILD_WASI_SDK}/buckygen-${VERSION}
	touch ${BUILD_WASI_SDK}/.build

${BUILD_WASI_SDK}/.patched: ${BUILD_WASI_SDK}/.build
	cd ${BUILD_WASI_SDK} && \
		sed -i.bak 's/#define CPUTIME 1/#define CPUTIME 0/' buckygen.c
	touch ${BUILD_WASI_SDK}/.patched

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${BUILD_WASI_SDK}/.patched
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

test: test-wasi-sdk-standalone
