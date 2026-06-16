include ../build/Makefile-vars

# SageMath uses primecount for fast prime-counting algorithms.
VERSION = 7.18
URL = https://github.com/kimwalisch/primecount/archive/refs/tags/v${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/primecount-${VERSION}.tar.gz
TARBALL_SHA256 = 9d8a0127cc4dd9319006b5db6c6f9844532dab9da9c2d410d1e244902463a399
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

PRIMESIEVE_WASI_SDK = ${PACKAGES}/primesieve/dist/wasi-sdk

${PRIMESIEVE_WASI_SDK}/lib/libprimesieve.a:
	$(MAKE) -C ${PACKAGES}/primesieve test-wasi-sdk-standalone

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	touch ${BUILD_WASI_SDK}/.build

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${PRIMESIEVE_WASI_SDK}/lib/libprimesieve.a ${BUILD_WASI_SDK}/.build
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${PRIMESIEVE_WASI_SDK} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

test: test-wasi-sdk-standalone
