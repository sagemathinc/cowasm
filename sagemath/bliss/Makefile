include ../build/Makefile-vars

# Sage uses bliss for graph automorphism groups and canonical labeling.
VERSION = 0.77
URL = https://mirrors.mit.edu/sage/spkg/upstream/bliss/bliss-${VERSION}.zip
TARBALL = ${UPSTREAM}/bliss-${VERSION}.zip
TARBALL_SHA256 = acc8b98034f30fad24c897f365abd866c13d9f1bb207e398d0caf136875972a4
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	unzip -q ${TARBALL} -d ${BUILD_WASI_SDK}
	mv ${BUILD_WASI_SDK}/bliss-${VERSION}/* ${BUILD_WASI_SDK}/
	rmdir ${BUILD_WASI_SDK}/bliss-${VERSION}
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
