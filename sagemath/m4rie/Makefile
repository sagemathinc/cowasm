include ../build/Makefile-vars

# https://github.com/malb/m4rie
VERSION = 20250128
URL = https://mirrors.mit.edu/sage/spkg/upstream/m4rie/m4rie-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/m4rie-${VERSION}.tar.gz
TARBALL_SHA256 = 96f1adafd50e6a0b51dc3aa1cb56cb6c1361ae7c10d97dc35c3fa70822a55bd7
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

M4RI_WASI_SDK = ${PACKAGES}/m4ri/dist/wasi-sdk

${M4RI_WASI_SDK}/lib/libm4ri.a:
	$(MAKE) -C ${PACKAGES}/m4ri test-wasi-sdk-standalone

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	touch ${BUILD_WASI_SDK}/.build

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${M4RI_WASI_SDK}/lib/libm4ri.a ${BUILD_WASI_SDK}/.build
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${M4RI_WASI_SDK} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

test: test-wasi-sdk-standalone
