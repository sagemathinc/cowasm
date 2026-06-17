include ../build/Makefile-vars

# SageMath uses SYMPOW for symmetric-power elliptic-curve L-functions.
VERSION = 2.023.6
URL = https://github.com/mkoeppe/sympow/releases/download/v${VERSION}/sympow-v${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/sympow-v${VERSION}.tar.gz
TARBALL_SHA256 = 53631afa6c68dd008400681af0fe1d60ada36716215449f2a668853ed04455ac
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

PATCHES = $(sort $(wildcard ${SRC}/patches/*.patch))

${BUILD_WASI_SDK}/.patched: ${TARBALL} ${PATCHES}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	for patch in ${PATCHES}; do patch -d ${BUILD_WASI_SDK} -p1 < $$patch; done
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
