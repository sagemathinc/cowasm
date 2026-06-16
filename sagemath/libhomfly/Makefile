include ../build/Makefile-vars

# SageMath uses libhomfly for HOMFLY polynomials of knots and links.
VERSION = 1.04
URL = https://github.com/miguelmarco/libhomfly/releases/download/${VERSION}/libhomfly-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/libhomfly-${VERSION}.tar.gz
TARBALL_SHA256 = 659a77b4f4b53340d24a7d6a69f4219e77ab9439a6ab8afa0156b7f6bd7af64f
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

GC_WASI_SDK = ${PACKAGES}/gc/dist/wasi-sdk

${GC_WASI_SDK}/lib/libgc.a:
	$(MAKE) -C ${PACKAGES}/gc test-wasi-sdk-standalone

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	touch ${BUILD_WASI_SDK}/.build

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${GC_WASI_SDK}/lib/libgc.a ${BUILD_WASI_SDK}/.build
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${GC_WASI_SDK} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

test: test-wasi-sdk-standalone
