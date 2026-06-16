include ../build/Makefile-vars

# https://users-math.au.dk/jensen/software/gfan/gfan.html
VERSION = 0.6.2
SAGE_VERSION = 0.6.2.p1
URL = https://mirrors.mit.edu/sage/spkg/upstream/gfan/gfan${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/gfan${VERSION}.tar.gz
TARBALL_SHA256 = a674d5e5dc43634397de0d55dd5da3c32bd358d05f72b73a50e62c1a1686f10a
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

GMP_WASI_SDK = ${PACKAGES}/gmp/dist/wasi-sdk
CDDLIB_WASI_SDK = ${PACKAGES}/cddlib/dist/wasi-sdk

${GMP_WASI_SDK}/lib/libgmp.a:
	$(MAKE) -C ${PACKAGES}/gmp test-wasi-sdk-standalone

${CDDLIB_WASI_SDK}/lib/libcddgmp.a: ${GMP_WASI_SDK}/lib/libgmp.a
	$(MAKE) -C ${PACKAGES}/cddlib test-wasi-sdk-standalone

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	touch ${BUILD_WASI_SDK}/.build

${BUILD_WASI_SDK}/.patched: ${BUILD_WASI_SDK}/.build
	cd ${BUILD_WASI_SDK} && \
		find src -type f -print0 | xargs -0 sed -i.bak "s/log2/logger2/g" && \
		cat ${SRC}/patches/01-gfanlib-matrix-vector-multiply.patch | patch -p1 && \
		cat ${SRC}/patches/02-clang-symmetrictraversal.patch | patch -p1
	touch ${BUILD_WASI_SDK}/.patched

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${GMP_WASI_SDK}/lib/libgmp.a ${CDDLIB_WASI_SDK}/lib/libcddgmp.a ${BUILD_WASI_SDK}/.patched
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${GMP_WASI_SDK} ${CDDLIB_WASI_SDK} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

test: test-wasi-sdk-standalone
