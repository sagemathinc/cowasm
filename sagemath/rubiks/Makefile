include ../build/Makefile-vars

# SageMath packages several command-line Rubik's cube solvers under rubiks.
SAGE_VERSION = 20070912.p21
UPSTREAM_VERSION = 20070912
URL = https://github.com/sagemath/sage-package/releases/download/tars/rubiks-${UPSTREAM_VERSION}-unix.tar.bz2
TARBALL = ${UPSTREAM}/rubiks-${UPSTREAM_VERSION}-unix.tar.bz2
TARBALL_SHA256 = aae4c88c0f1cf84718c1a6e31e027a2886e9eaea65051385339fd98be8693e07
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
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
