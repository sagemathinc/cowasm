include ../build/Makefile-vars

# SageMath uses PPL for exact polyhedral computations.
# Sage's package version is 1.2.p1; the upstream tarball is ppl-1.2.
VERSION = 1.2
URL = https://mirrors.mit.edu/sage/spkg/upstream/ppl/ppl-${VERSION}.tar.bz2
TARBALL = ${UPSTREAM}/ppl-${VERSION}.tar.bz2
TARBALL_SHA256 = 2d470b0c262904f190a19eac57fb5c2387b1bfc3510de25a08f3c958df62fdf1
BUILD_WASI_SDK = ${BUILD}/wasi-sdk
DIST_WASI_SDK = ${DIST}/wasi-sdk

all: test-wasi-sdk-standalone

include ../build/Makefile-rules

GMP_WASI_SDK = ${PACKAGES}/gmp/dist/wasi-sdk
GLPK_WASI_SDK = ${PACKAGES}/glpk/dist/wasi-sdk

${GMP_WASI_SDK}/lib/libgmp.a:
	$(MAKE) -C ${PACKAGES}/gmp test-wasi-sdk-standalone

${GLPK_WASI_SDK}/lib/libglpk.a:
	$(MAKE) -C ${PACKAGES}/glpk test-wasi-sdk-standalone

${BUILD_WASI_SDK}/.build: ${TARBALL}
	rm -rf ${BUILD_WASI_SDK}
	mkdir -p ${BUILD_WASI_SDK}
	tar xf ${TARBALL} -C ${BUILD_WASI_SDK} --strip-components=1
	touch ${BUILD_WASI_SDK}/.build

.PHONY: test-wasi-sdk-standalone
test-wasi-sdk-standalone: ${GMP_WASI_SDK}/lib/libgmp.a ${GLPK_WASI_SDK}/lib/libglpk.a ${BUILD_WASI_SDK}/.build
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
