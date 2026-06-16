include ../build/Makefile-vars

# SageMath uses 4ti2 for algebraic, geometric, and combinatorial
# computations on linear spaces.
VERSION = 1.6.10
URL = https://github.com/4ti2/4ti2/releases/download/Release_1_6_10/4ti2-${VERSION}.tar.gz
TARBALL = ${UPSTREAM}/4ti2-${VERSION}.tar.gz
TARBALL_SHA256 = f7c191beb14246b643e4fd5b18b53d9966693b9e6d3a569441a0e3ca14b1a86b
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

GMP_WASI_SDK = ${PACKAGES}/gmp/dist/wasi-sdk
GLPK_WASI_SDK = ${PACKAGES}/glpk/dist/wasi-sdk

${GMP_WASI_SDK}/lib/libgmpxx.a:
	$(MAKE) -C ${PACKAGES}/gmp test-wasi-sdk-standalone

${GLPK_WASI_SDK}/lib/libglpk.a:
	$(MAKE) -C ${PACKAGES}/glpk test-wasi-sdk-standalone

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	touch ${BUILD_WASI_SDK}/.build

${BUILD_WASI_SDK}/.patched: ${BUILD_WASI_SDK}/.build
	cd ${BUILD_WASI_SDK} && \
		cat ${SRC}/patches/01-wasi-cross-build.patch | patch -p1
	touch ${BUILD_WASI_SDK}/.patched

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${GMP_WASI_SDK}/lib/libgmpxx.a ${GLPK_WASI_SDK}/lib/libglpk.a ${BUILD_WASI_SDK}/.patched
	cd ../../core/build && make wasi-sdk-next
	@status=0; \
	${SRC}/test-wasi-sdk-standalone.sh ${BUILD_WASI_SDK} ${DIST_WASI_SDK} ${BIN} ${GMP_WASI_SDK} ${GLPK_WASI_SDK} || status=$$?; \
	if [ "$$status" -eq 77 ]; then exit 0; fi; \
	exit "$$status"

.PHONY: test-wasi-sdk-next
test-wasi-sdk-next: test-wasi-sdk-standalone

.PHONY: clean-wasi-sdk
clean-wasi-sdk:
	rm -rf ${BUILD_WASI_SDK} ${DIST_WASI_SDK}

clean:: clean-wasi-sdk

test: test-wasi-sdk-standalone
