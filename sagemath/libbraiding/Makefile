include ../build/Makefile-vars

# SageMath ships libbraiding as a standard braid-group computation package.
VERSION = 1.3.1
URL = https://github.com/miguelmarco/libbraiding/archive/refs/tags/${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/libbraiding-${VERSION}.tar.gz
TARBALL_SHA256 = c0910b342fe6ecee20759617263c20cf45d827abc6eac83ffd84d4565633ce3c
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	cd ${BUILD_WASI_SDK} && patch -p1 < ${SRC}/patches/01-configure-ac-stray-s.patch
	touch ${BUILD_WASI_SDK}/.build

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${BUILD_WASI_SDK}/.build
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
