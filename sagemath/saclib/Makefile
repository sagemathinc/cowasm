include ../build/Makefile-vars

# SageMath carries SACLIB as a real algebraic computation dependency, mainly
# for QEPCAD.
VERSION = 2.2.8
URL = https://www.usna.edu/Users/cs/wcbrown/qepcad/INSTALL/saclib${VERSION}.tgz
TARBALL = ${UPSTREAM}/saclib${VERSION}.tar.gz
TARBALL_SHA256 = e8e3acb253c64394f35c8e17942f764cae34df731f3fe3d749b6a2ae1fb8203b
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	set -e; for patch in ${SRC}/patches/*.patch; do patch -d ${BUILD_WASI_SDK} -p1 < "$$patch"; done
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
